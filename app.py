"""
app.py: Agentic RFP Evaluation and Supplier Ranking System
Streamlit web application featuring:
1. Criteria Management (CRUD, weights, 100% sum verification)
2. Supplier Input (Multi-PDF upload, metadata inputs, sample proposals loader, evaluate trigger)
3. Leaderboard (Visual ranks, PPI, Absolute Score, Tie-Break Explanations)
4. Detailed Scorecards (Criterion Drill-down, Gap Analysis, Relative %, Evidence Quotes, Justifications)
5. Run Details & JSON Export (Historical run viewer from SQLite, Audit Warnings, Full JSON Download)
"""

import datetime
import json
import os

import streamlit as st

from database import (
    add_criterion,
    get_all_criteria,
    get_all_runs,
    get_run_details,
    init_db,
    seed_criteria,
    update_criterion,
)
from generate_synthetic_pdfs import generate_all_proposals
from orchestrator import run_agentic_rfp_pipeline

# Page Configuration
st.set_page_config(
    page_title="Agentic RFP Evaluation & Supplier Ranking",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Database on startup
init_db()
seed_criteria()

# Session State Initialization
if "current_run_result" not in st.session_state:
    st.session_state.current_run_result = None

if "custom_suppliers" not in st.session_state:
    st.session_state.custom_suppliers = []

# Sidebar Navigation
st.sidebar.title("⚖️ RFP Evaluation System")
st.sidebar.caption("AI-Assisted Qualitative Scoring + Deterministic Python Ranking")

menu = st.sidebar.radio(
    "Navigation",
    ["🏆 Leaderboard & Scorecards", "⚙️ Evaluation Criteria", "📥 Supplier Input & Evaluation", "📜 Past Run History", "📖 Architecture & Formulas"]
)

st.sidebar.markdown("---")
st.sidebar.subheader("API & Model Configuration")
use_gemini = st.sidebar.checkbox("Use Gemini LLM API", value=False, help="Requires GEMINI_API_KEY. If unchecked, uses deterministic heuristic evaluator.")
gemini_key = st.sidebar.text_input("API Key (or set GEMINI_API_KEY env)", type="password", value=os.environ.get("GEMINI_API_KEY", ""))
llm_model = st.sidebar.text_input("LLM Model (or set GEMINI_MODEL env)", value=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"), help="Configure Gemini model on demand (e.g. gemini-2.5-flash, gemini-3.1-pro-preview).")

st.sidebar.markdown("---")
st.sidebar.info(
    "**Core Agentic Rule**:\n"
    "The LLM evaluates qualitative text and cites evidence. "
    "**Pure Python** calculates absolute scores, peer benchmarks, gaps, PPI, and tie-breaks."
)


# ==========================================
# SCREEN 1: CRITERIA MANAGEMENT
# ==========================================
if menu == "⚙️ Evaluation Criteria":
    st.header("⚙️ Evaluation Criteria Management")
    st.write(
        "Manage evaluation criteria stored in SQLite. Weights of active criteria must total **100%**. "
        "Changes here dynamically update the LLM prompt and ranking formulas without code modification."
    )

    all_criteria = get_all_criteria()
    active_criteria = [c for c in all_criteria if c["is_active"]]
    total_active_weight = sum(c["weight"] for c in active_criteria)

    col1, col2, col3 = st.columns(3)
    col1.metric("Active Criteria Count", len(active_criteria))
    col2.metric("Total Active Weight", f"{total_active_weight:.1f}%")
    if abs(total_active_weight - 100.0) < 0.01:
        col3.success("✅ Total Weight is 100%")
    else:
        col3.error(f"❌ Total Weight must be 100% (Difference: {total_active_weight - 100.0:+.1f}%)")

    st.subheader("Current Criteria in SQLite")
    for c in all_criteria:
        with st.expander(f"Criterion #{c['criterion_id']}: {c['name']} ({'Active' if c['is_active'] else 'Inactive'})", expanded=True):
            col_a, col_b, col_c, col_d = st.columns([3, 2, 2, 2])
            col_a.write(f"**Description / Focus:** {c['description']}")
            new_weight = col_b.number_input(f"Weight % (ID {c['criterion_id']})", min_value=0.0, max_value=100.0, value=float(c["weight"]), step=5.0)
            new_max = col_c.number_input(f"Max Score (ID {c['criterion_id']})", min_value=1.0, max_value=100.0, value=float(c["max_score"]), step=1.0)
            is_act = col_d.checkbox("Active", value=bool(c["is_active"]), key=f"act_{c['criterion_id']}")

            if col_d.button("Save Changes", key=f"btn_save_{c['criterion_id']}"):
                update_criterion(c["criterion_id"], new_weight, new_max, 1 if is_act else 0)
                st.success(f"Updated Criterion #{c['criterion_id']}")
                st.rerun()

    st.markdown("---")
    st.subheader("Add Custom Criterion")
    with st.form("add_criterion_form"):
        c_name = st.text_input("Criterion Name", placeholder="e.g. ESG & Sustainability")
        c_desc = st.text_area("Inspection Instructions", placeholder="What the LLM should inspect in the proposal document...")
        c_weight = st.number_input("Weight %", min_value=1.0, max_value=100.0, value=10.0, step=5.0)
        c_max = st.number_input("Max Score", min_value=1.0, max_value=100.0, value=10.0)
        submitted = st.form_submit_button("Add Criterion to SQLite")
        if submitted:
            if c_name.strip():
                add_criterion(c_name.strip(), c_desc.strip(), c_weight, c_max, 1)
                st.success(f"Added criterion '{c_name}' successfully!")
                st.rerun()
            else:
                st.error("Criterion name cannot be empty.")

    if st.button("🔄 Reset Criteria to Default 5"):
        seed_criteria(force_reseed=True)
        st.success("Reset to default criteria.")
        st.rerun()


# ==========================================
# SCREEN 2: SUPPLIER INPUT & EVALUATION
# ==========================================
elif menu == "📥 Supplier Input & Evaluation":
    st.header("📥 Supplier Input & Evaluation")
    st.write(
        "Upload supplier RFP PDF documents, specify submission dates and historical experience ratings, "
        "and launch the automated evaluation pipeline."
    )

    # Quick demo loader
    st.subheader("Option A: Load Synthetic Demo RFP Proposals")
    st.write("Generates 4 pre-configured synthetic supplier proposals matching the classroom benchmark profiles.")
    
    col_demo1, col_demo2 = st.columns([2, 3])
    if col_demo1.button("✨ Load 4 Synthetic Proposals (Apex, BrightPath, NexaWorks, Orbit)"):
        generate_all_proposals()
        st.session_state.demo_loaded = True
        st.success("Loaded 4 synthetic RFP proposals into input/ directory!")

    if getattr(st.session_state, "demo_loaded", False):
        st.info(
            "**Active Proposal Profiles Loaded:**\n"
            "1. **Apex Systems**: Strong tech & security, higher price ($480k), 24 wk timeline. Sub: 2026-03-01, Exp: 4.8\n"
            "2. **BrightPath Tech**: Lowest price ($145k), fast 10 wk timeline, weak compliance. Sub: 2026-03-02, Exp: 3.5\n"
            "3. **NexaWorks**: Balanced architecture, strongest implementation & support. Sub: 2026-03-01, Exp: 4.5\n"
            "4. **Orbit Digital**: 15+ years experience, legacy batch sync, medium price ($340k). Sub: 2026-03-03, Exp: 4.2"
        )

        if st.button("🚀 Run Agentic RFP Evaluation on Synthetic Proposals", type="primary"):
            with st.spinner("Extracting PDF text, evaluating criteria with AI, and computing deterministic rankings..."):
                supplier_batch = [
                    {
                        "supplier_name": "Apex Systems",
                        "submission_date": "2026-03-01",
                        "experience_rating": 4.8,
                        "pdf_source": "input/Apex_Systems_RFP_Proposal.pdf",
                        "filename": "Apex_Systems_RFP_Proposal.pdf"
                    },
                    {
                        "supplier_name": "BrightPath Tech",
                        "submission_date": "2026-03-02",
                        "experience_rating": 3.5,
                        "pdf_source": "input/BrightPath_Tech_RFP_Proposal.pdf",
                        "filename": "BrightPath_Tech_RFP_Proposal.pdf"
                    },
                    {
                        "supplier_name": "NexaWorks",
                        "submission_date": "2026-03-01",
                        "experience_rating": 4.5,
                        "pdf_source": "input/NexaWorks_RFP_Proposal.pdf",
                        "filename": "NexaWorks_RFP_Proposal.pdf"
                    },
                    {
                        "supplier_name": "Orbit Digital",
                        "submission_date": "2026-03-03",
                        "experience_rating": 4.2,
                        "pdf_source": "input/Orbit_Digital_RFP_Proposal.pdf",
                        "filename": "Orbit_Digital_RFP_Proposal.pdf"
                    }
                ]
                res = run_agentic_rfp_pipeline(
                    supplier_proposals=supplier_batch,
                    use_llm=use_gemini,
                    api_key=gemini_key,
                    model_name=llm_model
                )
                st.session_state.current_run_result = res
                st.success(f"Evaluation complete! Run ID: {res['rfp_run_id']}")
                st.info("Navigate to 'Leaderboard & Scorecards' to explore results.")

    st.markdown("---")
    st.subheader("Option B: Upload Custom Supplier Proposals (1 or More Than 4 Supported)")
    uploaded_files = st.file_uploader(
        "Upload Supplier Proposal PDFs (Supports 1, 2, 4, 6 or more)",
        type=["pdf"],
        accept_multiple_files=True
    )

    if uploaded_files:
        st.write(f"### Configure Supplier Metadata ({len(uploaded_files)} Document{'s' if len(uploaded_files) != 1 else ''} Uploaded)")
        st.caption("Metadata (Supplier Name, Date, Experience) is automatically parsed from PDF content if left unconfigured.")
        custom_batch = []
        for idx, f in enumerate(uploaded_files):
            col_a, col_b, col_c = st.columns([3, 2, 2])
            default_name = os.path.splitext(f.name)[0].replace("_", " ").title()
            supp_name = col_a.text_input(f"Supplier Name #{idx+1} (or leave blank to auto-extract)", value=default_name, key=f"sname_{idx}")
            sub_date = col_b.date_input(f"Submission Date #{idx+1}", value=datetime.date(2026, 3, 1), key=f"sdate_{idx}")
            exp_rating = col_c.slider(f"Experience Rating #{idx+1} (0-5)", min_value=1.0, max_value=5.0, value=4.0, step=0.1, key=f"sexp_{idx}")

            custom_batch.append({
                "supplier_name": supp_name.strip(),
                "submission_date": str(sub_date),
                "experience_rating": exp_rating,
                "pdf_source": f.read(),
                "filename": f.name
            })

        btn_label = f"🚀 Evaluate {len(custom_batch)} Uploaded Proposal{'s' if len(custom_batch) != 1 else ''}"
        if st.button(btn_label, type="primary"):
            with st.spinner(f"Extracting metadata from {len(custom_batch)} proposal(s) and running pipeline..."):
                res = run_agentic_rfp_pipeline(
                    supplier_proposals=custom_batch,
                    use_llm=use_gemini,
                    api_key=gemini_key,
                    model_name=llm_model
                )
                st.session_state.current_run_result = res
                st.success(f"Evaluation complete for {len(custom_batch)} supplier(s)! Run ID: {res['rfp_run_id']}")
                st.info("Navigate to 'Leaderboard & Scorecards' or 'Past Run History' to review.")


# ==========================================
# SCREEN 3 & 4: LEADERBOARD & SCORECARDS
# ==========================================
elif menu == "🏆 Leaderboard & Scorecards":
    st.header("🏆 RFP Evaluation Leaderboard & Detailed Scorecards")

    # If no run in session state, try loading latest from database
    if not st.session_state.current_run_result:
        runs = get_all_runs()
        if runs:
            latest_id = runs[0]["rfp_run_id"]
            run_details = get_run_details(latest_id)
            if run_details and "suppliers" in run_details:
                st.session_state.current_run_result = {
                    "rfp_run_id": latest_id,
                    "created_at": run_details["created_at"],
                    "status": run_details["status"],
                    "leaderboard": [
                        {
                            "final_rank": s["final_rank"],
                            "supplier_name": s["supplier_name"],
                            "absolute_score": s["absolute_score"],
                            "ppi": s["ppi"],
                            "submission_date": s["submission_date"],
                            "experience_rating": s["experience_rating"],
                            "tie_break_note": s.get("tie_break_note", "")
                        }
                        for s in run_details["suppliers"]
                    ],
                    "detailed_scorecards": run_details["suppliers"],
                    "warnings": []
                }

    if not st.session_state.current_run_result:
        st.warning("No evaluation runs found. Go to 'Supplier Input & Evaluate' to run an evaluation.")
    else:
        run_data = st.session_state.current_run_result
        st.caption(f"Run ID: **{run_data['rfp_run_id']}** | Status: **{run_data['status']}**")

        # Top summary cards
        leaderboard = run_data["leaderboard"]
        top_supplier = leaderboard[0] if leaderboard else None

        col1, col2, col3, col4 = st.columns(4)
        if top_supplier:
            col1.metric("🥇 Winning Supplier", top_supplier["supplier_name"], "Rank #1")
            col2.metric("Top PPI", f"{top_supplier['ppi']:.2f}%", f"Abs: {top_supplier['absolute_score']:.1f}")
        col3.metric("Suppliers Evaluated", len(leaderboard))
        col4.metric("Active Criteria Count", len(run_data.get("detailed_scorecards", [{}])[0].get("criteria", [])))

        # Leaderboard Table
        st.subheader("Final Leaderboard (Deterministic Ranking)")
        st.write("Rankings computed strictly using the 4-level deterministic tie-breaker: **Higher PPI → Earlier Date → Higher Experience → Alphabetical**.")

        table_rows = []
        for row in leaderboard:
            rank_icon = "🥇 " if row["final_rank"] == 1 else "🥈 " if row["final_rank"] == 2 else "🥉 " if row["final_rank"] == 3 else f"#{row['final_rank']} "
            table_rows.append({
                "Rank": rank_icon + str(row["final_rank"]),
                "Supplier": row["supplier_name"],
                "PPI (%)": f"{row['ppi']:.2f}%",
                "Absolute Score (/100)": f"{row['absolute_score']:.1f}",
                "Submission Date": row["submission_date"],
                "Experience Rating": f"{row['experience_rating']:.1f} / 5.0",
                "Tie-Break Rationale": row.get("tie_break_note", "Primary score")
            })

        st.table(table_rows)

        # Drill-down Scorecard Section
        st.markdown("---")
        st.subheader("🔍 Detailed Supplier Scorecards & Grounding Evidence")
        st.write("Select a supplier to examine criterion scores, peer benchmarks, gaps, quotes, and AI justifications.")

        suppliers = run_data.get("detailed_scorecards", [])
        supplier_names = [s["supplier_name"] for s in suppliers]
        selected_supp_name = st.selectbox("Choose Supplier to Inspect", supplier_names)

        selected_supp = next((s for s in suppliers if s["supplier_name"] == selected_supp_name), None)

        if selected_supp:
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Final Rank", f"#{selected_supp.get('final_rank', '-')}")
            c2.metric("Peer Performance Index", f"{selected_supp.get('ppi', 0):.2f}%")
            c3.metric("Absolute Score", f"{selected_supp.get('absolute_score', 0):.1f} / 100")
            c4.metric("Experience Rating", f"{selected_supp.get('experience_rating', 0)} / 5.0")

            st.write(f"**Executive Summary:** {selected_supp.get('overall_summary', 'N/A')}")
            
            risks = selected_supp.get("risks", [])
            if risks:
                st.write("**Identified Proposal Risks:**")
                for r in risks:
                    st.write(f"- ⚠️ {r}")

            st.write("### Criterion-by-Criterion Analysis")
            crit_data = selected_supp.get("criteria", [])
            
            display_crits = []
            for c in crit_data:
                gap_val = c.get('gap', 0.0)
                gap_str = "Leader (0.0)" if gap_val == 0.0 else f"{gap_val:+.1f}"
                display_crits.append({
                    "Criterion": c.get("name", f"Criterion {c.get('criterion_id')}"),
                    "Weight": f"{c.get('weight', 0)}%",
                    "Score": f"{c.get('score', 0)} / {c.get('max_score', 10)}",
                    "Peer Benchmark": f"{c.get('benchmark', 0)}",
                    "Gap": gap_str,
                    "Relative %": f"{c.get('relative_percentage', 0):.1f}%"
                })
            st.table(display_crits)

            st.write("### Grounding Evidence & AI Justification Audit")
            for c in crit_data:
                with st.expander(f"📌 {c.get('name')}: Score {c.get('score')}/{c.get('max_score')} (Relative: {c.get('relative_percentage', 0):.1f}%)"):
                    st.markdown("**Direct Document Evidence:**")
                    st.info(f"\"{c.get('evidence', 'No quote cited.')}\"")
                    st.markdown("**Evaluation Justification:**")
                    st.write(c.get("justification", "No justification provided."))


# ==========================================
# SCREEN 5: PAST RUN HISTORY & SQLITE DETAILS
# ==========================================
elif menu == "📜 Past Run History":
    st.header("📜 Past Run Details & SQLite History")
    st.write("View historical RFP evaluation runs stored in SQLite, inspect supplier rankings, and download machine-readable JSON exports for each run.")

    runs = get_all_runs()
    if not runs:
        st.info("No past runs found in SQLite database.")
    else:
        st.subheader(f"Historical RFP Runs in SQLite ({len(runs)} Total)")
        for r in runs:
            run_id = r["rfp_run_id"]
            details = get_run_details(run_id)
            suppliers = details.get("suppliers", [])
            supplier_count = len(suppliers)

            with st.expander(f"📁 {run_id} — {r['created_at']} ({supplier_count} Supplier{'s' if supplier_count != 1 else ''}) — Status: {r['status']}", expanded=(r == runs[0])):
                col_info, col_actions = st.columns([3, 2])
                with col_info:
                    st.write(f"**Run ID:** `{run_id}`")
                    st.write(f"**Created At:** {r['created_at']}")
                    st.write(f"**Status:** `{r['status']}` | **Suppliers Evaluated:** {supplier_count}")

                with col_actions:
                    # Export Run JSON for this specific past run
                    run_export_data = {
                        "rfp_run_id": run_id,
                        "created_at": r["created_at"],
                        "status": r["status"],
                        "leaderboard": [
                            {
                                "final_rank": s.get("final_rank"),
                                "supplier_name": s.get("supplier_name"),
                                "absolute_score": s.get("absolute_score"),
                                "ppi": s.get("ppi"),
                                "submission_date": s.get("submission_date"),
                                "experience_rating": s.get("experience_rating"),
                                "tie_break_note": s.get("tie_break_note", "")
                            }
                            for s in suppliers
                        ],
                        "detailed_scorecards": suppliers,
                        "warnings": []
                    }
                    run_json_str = json.dumps(run_export_data, indent=2, default=str)
                    st.download_button(
                        label=f"💾 Export Run JSON ({run_id})",
                        data=run_json_str,
                        file_name=f"{run_id}_export.json",
                        mime="application/json",
                        key=f"dl_{run_id}"
                    )

                    if st.button("🔍 Load into Active Scorecards", key=f"load_{run_id}"):
                        st.session_state.current_run_result = run_export_data
                        st.success(f"Loaded {run_id} as active run.")
                        st.rerun()

                # Display Rankings Table for this past run
                if suppliers:
                    st.markdown("**Leaderboard Rankings:**")
                    rankings_table = []
                    for s in suppliers:
                        rank_num = s.get("final_rank", 1)
                        rank_icon = "🥇 " if rank_num == 1 else "🥈 " if rank_num == 2 else "🥉 " if rank_num == 3 else f"#{rank_num} "
                        rankings_table.append({
                            "Rank": rank_icon + str(rank_num),
                            "Supplier Name": s.get("supplier_name"),
                            "PPI (%)": f"{float(s.get('ppi', 0)):.2f}%",
                            "Absolute Score": f"{float(s.get('absolute_score', 0)):.1f} / 100",
                            "Submission Date": s.get("submission_date"),
                            "Experience": f"{float(s.get('experience_rating', 0)):.1f} / 5.0",
                            "Tie-Break Rationale": s.get("tie_break_note", "Primary score")
                        })
                    st.table(rankings_table)


# ==========================================
# SCREEN: ARCHITECTURE & FORMULAS
# ==========================================
elif menu == "📖 Architecture & Formulas":
    st.header("📖 System Architecture & Deterministic Formulas")
    st.write(
        "This system strictly decouples **LLM qualitative evaluation** from **deterministic Python mathematics**."
    )

    st.subheader("1. Agentic Architecture")
    st.markdown("""
| Component | Responsibility | Technology |
| :--- | :--- | :--- |
| **Orchestrator Agent** | Coordinates document extraction, prompting, validation, and math ranking | Pure Python functions |
| **Document Tool** | Extracts clean textual tokens from uploaded PDF proposals | PyMuPDF (`fitz`) / pypdf fallback |
| **Evaluation Agent** | Evaluates proposal against active SQLite criteria, returns JSON citations | Google Gemini / Deterministic Evaluator |
| **Validation Tool** | Checks JSON schema, clips scores [0, max], auto-fills missing criteria with 0 | Pydantic & Python validator |
| **Ranking Tool** | Computes Absolute Score, Benchmarks, Gap, Relative %, PPI, and 4-tier tie-breaks | Pure Python math only |
| **Persistence** | Stores criteria, runs, and complete JSON results | SQLite3 |
    """)

    st.subheader("2. Mathematical Formulas")
    st.latex(r"\text{Absolute Weighted Score} = \sum_{c} \left( \frac{\text{Score}_{s,c}}{\text{Max Score}_c} \times \text{Weight}_c \right)")
    st.latex(r"\text{Criterion Benchmark}_c = \max_{s \in \text{Suppliers}} (\text{Score}_{s,c})")
    st.latex(r"\text{Criterion Gap}_{s,c} = \text{Score}_{s,c} - \text{Benchmark}_c \quad (\le 0)")
    st.latex(r"\text{Relative Performance \%}_{s,c} = \left( \frac{\text{Score}_{s,c}}{\text{Benchmark}_c} \right) \times 100")
    st.latex(r"\text{Peer Performance Index (PPI)}_s = \sum_{c} \left( \text{Relative Performance \%}_{s,c} \times \frac{\text{Weight}_c}{100} \right)")

    st.subheader("3. Mandatory Deterministic Tie-Break Rules")
    st.markdown("""
1. **Tier 1 - Higher PPI**: Primary sorting key (Descending).
2. **Tier 2 - Earlier Submission Date**: In case of identical PPI, earlier date wins (Ascending ISO `YYYY-MM-DD`).
3. **Tier 3 - Higher Experience Rating**: In case of identical date, higher rating wins (Descending).
4. **Tier 4 - Supplier Name**: In case of identical experience, alphabetical order applies (Ascending).
    """)


st.markdown("---")
st.markdown(
    "<div style='text-align: center;'>© 2026 Darkalto Developer | All Rights Reserved</div>",
    unsafe_allow_html=True,
)
