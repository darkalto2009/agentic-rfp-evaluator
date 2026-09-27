# Agentic RFP Evaluation & Supplier Ranking System

An AI-assisted application that reads supplier RFP response PDFs, scores them
against configurable criteria using an LLM, benchmarks suppliers against
their peers with **pure deterministic Python math**, and produces an
explainable, auditable leaderboard.

> **Strict rule enforced throughout this codebase:** the LLM only ever
> produces qualitative scores, justifications, and evidence quotes. It never
> computes weighted totals, benchmarks, PPI, or ranks — that is all done by
> plain, deterministic Python in `ranker.py`, so the same validated scorecards
> always produce the same leaderboard.

---

## 1. Architecture

| Agent / Tool | File | Responsibility |
|---|---|---|
| Orchestrator | `app.py` (`orchestrate_run`) | Calls the tools below in order, for every uploaded supplier |
| Document Tool | `pdf_extractor.py` | Extracts clean text from each PDF (PyMuPDF, falls back to `pypdf`) |
| Evaluation Agent | `evaluator.py` | Builds the grounded prompt, calls Gemini / OpenAI / an offline mock, returns raw JSON |
| Validation Tool | `validator.py` | Enforces the schema, fills missing criteria with 0 + a warning, clips out-of-range scores |
| Ranking Tool | `ranker.py` | **Deterministic only.** Absolute score, benchmarks, gaps, relative %, PPI, tie-break, rank |
| Persistence | `database.py` | SQLite schema + CRUD for criteria, runs, results |
| UI | `app.py` | 5-page Streamlit app |

### Data flow

```
Upload PDFs + metadata
        │
        ▼
Document Tool (extract text)
        │
        ▼
Evaluation Agent (LLM → raw JSON per supplier)
        │
        ▼
Validation Tool (normalize, clip, auto-fill, warn)
        │
        ▼
Ranking Tool (benchmark → gap → relative% → PPI → tie-break → rank)
        │
        ▼
SQLite persistence (one RFP_RUN_ID per batch)
        │
        ▼
Streamlit (Leaderboard / Scorecard / Run History / JSON export)
```

---

## 2. Setup

```bash
cd agentic_rfp_project
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt

# 1. Generate the four synthetic supplier proposal PDFs
python generate_synthetic_pdfs.py

# 2. Initialize + seed the SQLite database
python seed_db.py

# 3. (Recommended) Prototype the pipeline step-by-step
jupyter notebook rfp_evaluation_test.ipynb

# 4. Run the full application
streamlit run app.py
```

The app works **without any API key** out of the box: select **Mock** as the
LLM provider in the sidebar. This uses a deterministic, keyword-based offline
evaluator (`evaluator.mock_llm_call`) so you can exercise the entire pipeline
— extraction, validation, benchmarking, tie-breaks, persistence, UI — with no
network access. Switch the sidebar provider to **Gemini** or **OpenAI** and
paste an API key to get real LLM-graded scorecards.

---

## 3. Formulas (all computed in `ranker.py`, never by the LLM)

**Absolute Weighted Score**

```
absolute_score = Σ ( (criterion_score / max_score) × criterion_weight )
```

**Criterion Benchmark** — best score observed for that criterion across all
suppliers in the run:

```
benchmark_c = max(score_s,c for s in suppliers)
```

**Criterion Gap** (≤ 0; 0 for the benchmark leader):

```
gap_s,c = score_s,c − benchmark_c
```

**Relative Performance %** (zero-division safe):

```
relative_pct_s,c = (score_s,c / benchmark_c) × 100     if benchmark_c > 0
                  = 100.0                               if benchmark_c == 0 and score_s,c == 0
```

**Peer Performance Index (PPI)**

```
ppi_s = Σ ( relative_pct_s,c × (weight_c / 100) )
```

**Mandatory tie-break order** (applied as one composite sort key so all
suppliers are ordered consistently in a single stable sort):

1. Higher PPI (descending)
2. Earlier submission date (ascending, ISO `YYYY-MM-DD`)
3. Higher historical experience rating (descending)
4. Supplier name (ascending, alphabetical)

This exact chain is unit-tested in Notebook Cell 6 with four suppliers
engineered to collide at every level.

---

## 4. Validation & normalization rules (`validator.py`)

- Every active criterion gets exactly one score in the output — a criterion
  the LLM forgot is **auto-filled with 0.0** and a warning is recorded.
- Scores are **clipped** to `[0, max_score]`; the DB's configured `max_score`
  is always authoritative over whatever the LLM echoed back.
- Unknown `criterion_id`s returned by the LLM are dropped, with a warning.
- If a real LLM's response doesn't even parse as valid JSON, `evaluator.py`
  attempts a best-effort JSON extraction; if that also fails, the caller gets
  an all-zero scorecard with warnings, rather than the app crashing.
- `validator.py` uses `pydantic` for strict type coercion if it's installed,
  and an equivalent hand-rolled validator otherwise — either way, validation
  behavior and warnings are identical.

---

## 5. Database schema

See `database.py` for the exact `CREATE TABLE` statements. Summary:

- **evaluation_criteria** — `criterion_id, name, description, weight, max_score, is_active`
- **rfp_runs** — `rfp_run_id, created_at, status`
- **supplier_results** — `rfp_run_id, supplier_name, submission_date, experience_rating, absolute_score, ppi, final_rank, result_json`

`result_json` stores the full per-criterion breakdown (score, benchmark, gap,
relative %), the tie-break trace, validation warnings, risks, and the overall
summary — so every number shown in the UI is fully auditable from one row.

---

## 6. Synthetic supplier data

`generate_synthetic_pdfs.py` builds four **fictional** 2-page proposals with
`reportlab`, each with six sections (Executive Summary, Proposed Solution,
Timeline & Team, Pricing & Assumptions, Security & Compliance, Support &
References), deliberately varied in strengths/weaknesses:

| Supplier | Profile |
|---|---|
| Apex Systems | Strong technical design & security; higher price; moderate timeline |
| BrightPath Tech | Lowest price, fastest timeline; weak compliance detail; limited experience |
| NexaWorks | Balanced; strongest implementation plan & support model |
| Orbit Digital | Strong experience & references; vague integration plan; medium pricing |

No real supplier or confidential data is used anywhere in this project.

---

## 7. Assumptions

- Weights are expressed as whole percentage points (e.g. `30.0` for 30%);
  the Criteria Management screen warns if active weights don't sum to 100%
  and evaluation is blocked until they do.
- Submission dates are stored and compared as ISO `YYYY-MM-DD` strings.
- The Mock LLM provider is a deterministic keyword-frequency heuristic, not a
  real quality judgment — it exists purely so the pipeline, validation,
  ranking, and UI can be tested end-to-end offline. Use Gemini/OpenAI for
  real evaluations.
- `pdf_extractor.py` assumes text-based PDFs; scanned/image-only PDFs would
  need OCR (out of scope here) and will raise a clear `PDFExtractionError`.

## 8. Testing & reproducibility

- `rfp_evaluation_test.ipynb` exercises all 7 stages (env check → extraction
  → DB seeding → mock LLM + validation → math → tie-breaks → full batch run)
  with real, executed outputs.
- Running the same validated scorecards through `ranker.py` twice always
  yields identical scores, benchmarks, PPI, and ranks (no randomness, no
  wall-clock dependence in the math).
- `sample_run_export.json` is a real exported run produced by this notebook,
  included as the required sample JSON deliverable.
- Each module also has a `if __name__ == "__main__":` self-test
  (`python ranker.py`, `python validator.py`, `python pdf_extractor.py <pdf>`,
  `python evaluator.py`) for quick isolated checks.

## 9. Deploying to Streamlit Community Cloud

1. Push this folder to a GitHub repo (include `requirements.txt`).
2. On [share.streamlit.io](https://share.streamlit.io), point a new app at
   `app.py` on your repo's main branch.
3. Add your `GEMINI_API_KEY` / `OPENAI_API_KEY` as a Streamlit **secret** if
   you want real LLM evaluation in the deployed app (the Mock provider needs
   no secrets at all and is a good default for a public demo).
4. The SQLite file is created on first run inside the container's ephemeral
   filesystem — for a persistent leaderboard across redeploys, point
   `database.DB_PATH` at a mounted volume or an external database instead.

## 10. Project structure

```
agentic_rfp_project/
├── rfp_evaluation_test.ipynb   # Step-by-step prototyping notebook (executed)
├── app.py                      # Streamlit UI + orchestrator
├── database.py                 # SQLite schema + helpers
├── pdf_extractor.py            # Document Tool
├── evaluator.py                # Evaluation Agent (+ offline mock LLM)
├── validator.py                # Validation Tool
├── ranker.py                   # Deterministic Ranking Tool
├── generate_synthetic_pdfs.py  # Synthetic supplier PDF generator
├── seed_db.py                  # DB init/seed script
├── sample_run_export.json      # Sample exported run (submission requirement)
├── requirements.txt
├── README.md
└── data/
    ├── rfp_evaluation.db       # created at runtime
    └── proposals/*.pdf         # created by generate_synthetic_pdfs.py
```
