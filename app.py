"""
app.py
-------
Main Streamlit entrypoint for the Agentic RFP Evaluation and Supplier
Ranking System.

This file is the ORCHESTRATOR: it wires together the Document Tool
(pdf_extractor), the Evaluation Agent (evaluator), the Validation Tool
(validator), and the Ranking Tool (ranker), and persists everything via
database.py. It contains NO scoring math and NO LLM prompt logic itself —
it only calls the other modules in the correct order.

Run with:  streamlit run app.py
"""

from __future__ import annotations

import json
from datetime import date

import streamlit as st

import database
import evaluator
import pdf_extractor
import ranker
import validator

st.set_page_config(page_title="Agentic RFP Evaluation", layout="wide", page_icon="📋")

database.init_db()
database.seed_default_criteria()  # no-op if already seeded


# --------------------------------------------------------------------------- #
# Orchestrator: runs the full pipeline for one uploaded batch
# --------------------------------------------------------------------------- #

def orchestrate_run(
    uploads: list[dict],
    active_criteria: list[dict],
    provider: str,
    api_key: str | None,
    model: str | None,
) -> tuple[str, list["ranker.RankedSupplierResult"]]:
    """
    uploads: list of {"file": UploadedFile, "supplier_name": str,
                       "submission_date": str, "experience_rating": float}
    Returns (rfp_run_id, ranked_results)
    """
    rfp_run_id = database.create_run(status="in_progress")
    scorecards: list[ranker.SupplierScorecard] = []

    progress = st.progress(0.0, text="Starting evaluation batch...")
    total = len(uploads)

    for i, entry in enumerate(uploads):
        supplier_name = entry["supplier_name"]
        progress.progress(i / total, text=f"Extracting text: {supplier_name}")

        # 1. Document Tool
        extraction = pdf_extractor.extract_text_from_pdf(entry["file"])

        # 2. Evaluation Agent
        progress.progress((i + 0.4) / total, text=f"Evaluating with LLM ({provider}): {supplier_name}")
        raw_llm_json = evaluator.evaluate_supplier(
            supplier_name,
            extraction["text"],
            active_criteria,
            provider=provider,
            api_key=api_key,
            model=model,
        )

        # 3. Validation Tool
        progress.progress((i + 0.7) / total, text=f"Validating scorecard: {supplier_name}")
        validated = validator.validate_llm_result(
            raw_llm_json, active_criteria, expected_supplier_name=supplier_name
        )

        criteria_scores = {
            c.criterion_id: {
                "score": c.score,
                "weight": c.weight,
                "max_score": c.max_score,
                "name": c.name,
            }
            for c in validated.criteria
        }
        scorecards.append(
            ranker.SupplierScorecard(
                supplier_name=supplier_name,
                submission_date=entry["submission_date"],
                experience_rating=entry["experience_rating"],
                criteria_scores=criteria_scores,
                warnings=validated.warnings,
                risks=validated.risks,
                overall_summary=validated.overall_summary,
            )
        )

    # 4. Ranking Tool (pure deterministic math — no LLM involved)
    progress.progress(0.95, text="Benchmarking peers and ranking...")
    ranked = ranker.rank_suppliers(scorecards)

    # 5. Persist
    for r in ranked:
        database.save_supplier_result(
            rfp_run_id=rfp_run_id,
            supplier_name=r.supplier_name,
            submission_date=r.submission_date,
            experience_rating=r.experience_rating,
            absolute_score=r.absolute_score,
            ppi=r.ppi,
            final_rank=r.final_rank,
            result_payload={
                "criterion_breakdown": r.criterion_breakdown,
                "tie_break_trace": r.tie_break_trace,
                "warnings": r.warnings,
                "risks": r.risks,
                "overall_summary": r.overall_summary,
            },
        )
    database.update_run_status(rfp_run_id, "completed")
    progress.progress(1.0, text="Done.")
    return rfp_run_id, ranked


# --------------------------------------------------------------------------- #
# Sidebar: navigation + LLM provider config
# --------------------------------------------------------------------------- #

st.sidebar.title("📋 Agentic RFP Evaluation")
page = st.sidebar.radio(
    "Navigate",
    [
        "1. Criteria Management",
        "2. Supplier Input & Evaluate",
        "3. Leaderboard",
        "4. Detailed Scorecard",
        "5. Run History & JSON Export",
    ],
)

st.sidebar.divider()
st.sidebar.subheader("LLM Provider")
provider = st.sidebar.selectbox(
    "Evaluation Agent backend",
    ["mock", "gemini", "openai"],
    format_func=lambda p: {
        "mock": "Mock (offline, no API key needed)",
        "gemini": "Google Gemini",
        "openai": "OpenAI",
    }[p],
    help="Use 'mock' to test the full pipeline without any API key or network access.",
)
api_key = None
model = None
if provider != "mock":
    api_key = st.sidebar.text_input(f"{provider.title()} API key", type="password")
    model = st.sidebar.text_input(
        "Model name",
        value="gemini-2.0-flash" if provider == "gemini" else "gpt-4o-mini",
    )

if "last_run_id" not in st.session_state:
    st.session_state["last_run_id"] = None
if "last_ranked" not in st.session_state:
    st.session_state["last_ranked"] = None


# --------------------------------------------------------------------------- #
# PAGE 1: Criteria Management
# --------------------------------------------------------------------------- #

if page.startswith("1"):
    st.header("Criteria Management")
    st.caption("Active criteria and weights are loaded from SQLite. The instructor/user can "
               "adjust weights and max scores here without touching any prompt code.")

    all_criteria = database.get_all_criteria()

    edited_rows = []
    for c in all_criteria:
        with st.container(border=True):
            cols = st.columns([3, 1.2, 1, 1, 4])
            name = cols[0].text_input("Name", value=c["name"], key=f"name_{c['criterion_id']}")
            weight = cols[1].number_input(
                "Weight %", value=float(c["weight"]), min_value=0.0, max_value=100.0, step=1.0,
                key=f"weight_{c['criterion_id']}",
            )
            max_score = cols[2].number_input(
                "Max score", value=float(c["max_score"]), min_value=1.0, step=1.0,
                key=f"max_{c['criterion_id']}",
            )
            is_active = cols[3].checkbox("Active", value=bool(c["is_active"]), key=f"active_{c['criterion_id']}")
            description = cols[4].text_input(
                "What the LLM should inspect", value=c["description"] or "",
                key=f"desc_{c['criterion_id']}",
            )
            edited_rows.append(
                dict(
                    criterion_id=c["criterion_id"], name=name, weight=weight,
                    max_score=max_score, is_active=is_active, description=description,
                )
            )

    col_a, col_b = st.columns([1, 3])
    if col_a.button("💾 Save all changes", type="primary"):
        for row in edited_rows:
            database.upsert_criterion(
                name=row["name"], description=row["description"], weight=row["weight"],
                max_score=row["max_score"], is_active=row["is_active"], criterion_id=row["criterion_id"],
            )
        st.rerun()

    active_total = sum(r["weight"] for r in edited_rows if r["is_active"])
    if abs(active_total - 100.0) > 1e-6:
        st.warning(f"⚠️ Active criteria weights currently sum to **{active_total:.1f}%**, not 100%. "
                   f"Adjust weights before running an evaluation.")
    else:
        st.success(f"✅ Active criteria weights sum to {active_total:.1f}%.")

    st.divider()
    with st.expander("➕ Add a new criterion"):
        with st.form("new_criterion_form"):
            n_name = st.text_input("Name")
            n_desc = st.text_input("Description / what to inspect")
            n_weight = st.number_input("Weight %", min_value=0.0, max_value=100.0, value=10.0)
            n_max = st.number_input("Max score", min_value=1.0, value=10.0)
            submitted = st.form_submit_button("Add criterion")
            if submitted and n_name:
                database.upsert_criterion(n_name, n_desc, n_weight, n_max, is_active=True)
                st.rerun()


# --------------------------------------------------------------------------- #
# PAGE 2: Supplier Input & Evaluate
# --------------------------------------------------------------------------- #

elif page.startswith("2"):
    st.header("Supplier Input & Evaluate")

    active_criteria = database.get_active_criteria()
    active_total = database.total_active_weight()
    if abs(active_total - 100.0) > 1e-6:
        st.error(
            f"Active criteria weights sum to {active_total}%, not 100%. "
            f"Fix this on the Criteria Management page before evaluating."
        )
        st.stop()

    st.caption(f"Evaluating against {len(active_criteria)} active criteria "
               f"(total weight {active_total}%). Provider: **{provider}**.")

    uploaded_files = st.file_uploader(
        "Upload supplier RFP response PDFs (multiple allowed)",
        type=["pdf"],
        accept_multiple_files=True,
    )

    uploads_meta = []
    if uploaded_files:
        st.subheader("Supplier metadata")
        for f in uploaded_files:
            with st.container(border=True):
                cols = st.columns([2, 1, 1])
                default_name = f.name.rsplit(".", 1)[0].replace("_", " ")
                supplier_name = cols[0].text_input("Supplier name", value=default_name, key=f"sn_{f.name}")
                submission_date = cols[1].date_input("Submission date", value=date.today(), key=f"sd_{f.name}")
                experience_rating = cols[2].number_input(
                    "Historical experience rating (0-5)", min_value=0.0, max_value=5.0,
                    value=4.0, step=0.1, key=f"er_{f.name}",
                )
                uploads_meta.append(
                    {
                        "file": f,
                        "supplier_name": supplier_name,
                        "submission_date": submission_date.isoformat(),
                        "experience_rating": experience_rating,
                    }
                )

        if st.button("🚀 Evaluate batch", type="primary"):
            if provider != "mock" and not api_key:
                st.error(f"Please provide an API key for {provider} in the sidebar, or switch to 'mock'.")
            else:
                with st.spinner("Running the agentic evaluation pipeline..."):
                    try:
                        rfp_run_id, ranked = orchestrate_run(
                            uploads_meta, active_criteria, provider, api_key, model
                        )
                        st.session_state["last_run_id"] = rfp_run_id
                        st.session_state["last_ranked"] = ranked
                        st.success(f"Run **{rfp_run_id}** completed. Open the Leaderboard tab to view results.")
                    except Exception as e:
                        st.exception(e)
    else:
        st.info("Upload at least one supplier PDF to begin. Use `generate_synthetic_pdfs.py` "
                "to create the four sample proposals if you haven't already.")


# --------------------------------------------------------------------------- #
# PAGE 3: Leaderboard
# --------------------------------------------------------------------------- #

elif page.startswith("3"):
    st.header("Leaderboard")

    runs = database.get_runs()
    if not runs:
        st.info("No runs yet. Go to 'Supplier Input & Evaluate' to run your first batch.")
        st.stop()

    run_ids = [r["rfp_run_id"] for r in runs]
    default_idx = run_ids.index(st.session_state["last_run_id"]) if st.session_state["last_run_id"] in run_ids else 0
    selected_run = st.selectbox("RFP Run", run_ids, index=default_idx)

    results = database.get_results_for_run(selected_run)
    if not results:
        st.warning("This run has no persisted results.")
        st.stop()

    table_rows = [
        {
            "Rank": r["final_rank"],
            "Supplier": r["supplier_name"],
            "Absolute Score": round(r["absolute_score"], 2),
            "PPI": round(r["ppi"], 2),
            "Submission Date": r["submission_date"],
            "Experience Rating": r["experience_rating"],
        }
        for r in results
    ]
    st.dataframe(table_rows, use_container_width=True, hide_index=True)

    st.bar_chart({row["Supplier"]: row["PPI"] for row in table_rows})


# --------------------------------------------------------------------------- #
# PAGE 4: Detailed Scorecard
# --------------------------------------------------------------------------- #

elif page.startswith("4"):
    st.header("Detailed Scorecard")

    runs = database.get_runs()
    if not runs:
        st.info("No runs yet.")
        st.stop()

    run_ids = [r["rfp_run_id"] for r in runs]
    default_idx = run_ids.index(st.session_state["last_run_id"]) if st.session_state["last_run_id"] in run_ids else 0
    selected_run = st.selectbox("RFP Run", run_ids, index=default_idx)

    results = database.get_results_for_run(selected_run)
    if not results:
        st.warning("This run has no persisted results.")
        st.stop()

    supplier_names = [r["supplier_name"] for r in results]
    selected_supplier = st.selectbox("Supplier", supplier_names)
    result = next(r for r in results if r["supplier_name"] == selected_supplier)
    payload = result["result_json"]

    c1, c2, c3 = st.columns(3)
    c1.metric("Final Rank", result["final_rank"])
    c2.metric("Absolute Score", f'{result["absolute_score"]:.2f}')
    c3.metric("PPI", f'{result["ppi"]:.2f}')

    st.subheader("Criterion breakdown")
    st.dataframe(
        [
            {
                "Criterion": row["name"],
                "Weight %": row["weight"],
                "Score": row["score"],
                "Max Score": row["max_score"],
                "Benchmark": row["benchmark"],
                "Gap": row["gap"],
                "Relative %": row["relative_pct"],
            }
            for row in payload["criterion_breakdown"]
        ],
        use_container_width=True,
        hide_index=True,
    )

    st.subheader("Evidence & justification")
    # evidence/justification live on the raw validator output; re-derive from breakdown
    for row in payload["criterion_breakdown"]:
        with st.expander(f"{row['name']} — score {row['score']}/{row['max_score']}"):
            st.write(f"**Gap vs. benchmark:** {row['gap']}  |  **Relative performance:** {row['relative_pct']}%")

    if payload.get("risks"):
        st.subheader("Identified risks")
        for risk in payload["risks"]:
            st.write(f"- {risk}")

    if payload.get("overall_summary"):
        st.subheader("Overall summary")
        st.write(payload["overall_summary"])

    if payload.get("warnings"):
        st.subheader("⚠️ Validation warnings")
        for w in payload["warnings"]:
            st.warning(w)

    if payload.get("tie_break_trace"):
        st.caption("Tie-break trace: " + " → ".join(payload["tie_break_trace"]))


# --------------------------------------------------------------------------- #
# PAGE 5: Run History & JSON Export
# --------------------------------------------------------------------------- #

elif page.startswith("5"):
    st.header("Run History & JSON Export")

    runs = database.get_runs()
    if not runs:
        st.info("No runs yet.")
        st.stop()

    st.dataframe(runs, use_container_width=True, hide_index=True)

    run_ids = [r["rfp_run_id"] for r in runs]
    selected_run = st.selectbox("Select a run to export", run_ids)
    results = database.get_results_for_run(selected_run)

    export_payload = {
        "rfp_run_id": selected_run,
        "results": [
            {
                "final_rank": r["final_rank"],
                "supplier_name": r["supplier_name"],
                "submission_date": r["submission_date"],
                "experience_rating": r["experience_rating"],
                "absolute_score": r["absolute_score"],
                "ppi": r["ppi"],
                **r["result_json"],
            }
            for r in results
        ],
    }

    st.download_button(
        "⬇️ Download full run JSON",
        data=json.dumps(export_payload, indent=2),
        file_name=f"{selected_run}.json",
        mime="application/json",
    )

    with st.expander("Preview JSON"):
        st.json(export_payload)
