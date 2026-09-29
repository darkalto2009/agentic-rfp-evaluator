# Engineering Instructions & Best Practices

## RFP Evaluation & Supplier Ranking

This document outlines all engineering best practices followed in this codebase and mandates rules that **MUST** be adhered to during any future maintenance, refactoring, or feature extensions.

---

## 1. Core Architectural Best Practices

### 1.1 The Strict Separation Principle
- **Rule:** Never allow an LLM to perform mathematical calculations, calculate averages, determine peer benchmarks, evaluate tie-breakers, or assign final rankings.
- **Why:** LLMs are non-deterministic token predictors that frequently exhibit arithmetic drift, off-by-one errors, hallucinations, and vulnerability to adversarial prompt injections.
- **Implementation:** The LLM's sole responsibility is qualitative semantic extraction and verbatim citation generation. Pure Python modules (`ranker.py`, `rfpMath.ts`) execute 100% of arithmetic operations.

### 1.2 Schema-First Communication
- **Rule:** All LLM inputs and outputs must be bound to explicit, strongly-typed schemas (Pydantic models in Python; TypeScript interfaces in the frontend).
- **Enforcement:** Always use structured output APIs (e.g., Gemini `response_schema` / JSON mode). Never parse freeform text using ad-hoc regular expressions.

---

## 2. Mathematical Integrity & Scoring Invariants

### 2.1 Criteria Weight Normalization
- Active criteria weights should always sum to **100.0%**.
- If weights do not sum to 100%, the system must calculate normalized proportional weights or display an explicit warning banner.

### 2.2 Mathematical Formulas (Immutable Standards)
1. **Absolute Score:**
   $$\text{Absolute Score}_s = \sum_{c} \left( \frac{\text{Score}_{s,c}}{\text{Max Score}_c} \times \text{Weight}_c \right)$$
2. **Criterion Benchmark:**
   $$\text{Benchmark}_c = \max_{s} (\text{Score}_{s,c})$$
3. **Criterion Gap:**
   $$\text{Gap}_{s,c} = \text{Score}_{s,c} - \text{Benchmark}_c \quad (\le 0.0)$$
4. **Relative Percentage:**
   $$\text{Relative \%}_{s,c} = \frac{\text{Score}_{s,c}}{\text{Benchmark}_c} \times 100.0 \quad (\text{safe division guarded against 0})$$
5. **Peer Performance Index (PPI):**
   $$\text{PPI}_s = \sum_{c} \left( \text{Relative \%}_{s,c} \times \frac{\text{Weight}_c}{100.0} \right)$$

### 2.3 Strict Deterministic Tie-Breaking
Always apply tie-breakers in the exact 4-tier hierarchy:
1. **Tier 1:** Higher PPI (`descending`)
2. **Tier 2:** Earlier Submission Date (`ascending` ISO format `YYYY-MM-DD`)
3. **Tier 3:** Higher Historical Experience Rating (`descending` 0.0 to 5.0)
4. **Tier 4:** Supplier Name (`ascending` case-insensitive alphabetical)

---

## 3. Data Validation & Guardrail Best Practices

### 3.1 Clamping & Boundary Enforcement
- All scores must strictly reside within $[0.0, \text{max\_score}]$.
- If an LLM returns a negative score or a score exceeding `max_score`, `validator.py` must clamp the value:
  ```python
  clamped_score = max(0.0, min(criterion.max_score, raw_score))
  ```
- Always log an audit warning in `evaluation_audit_logs`.
- **Auto-Resolution UI Toggle:** The Evaluation Runner must expose an **Auto-Resolution Toggle**:
  - **Active (Default):** Clamps boundary anomalies, zero-fills omitted criteria, records structured audit trail logs, and maintains automated pipeline execution.
  - **Strict Mode:** Leaves anomalies unmodified in the raw scorecard, flags unresolvable errors, and prompts procurement evaluators for manual compliance review.

### 3.2 Omission Handling (Zero-Fill Policy)
- If an LLM fails to score an active criterion, the system must **NOT** crash.
- Auto-fill the missing criterion with `score = 0.0` and log a warning:
  `"Criterion '[Name]' omitted by LLM; assigned default 0.0"`.

### 3.3 Verbatim Citation Verification
- Never accept a score without verifiable text evidence.
- The `evidence` field must contain exact quotations from the supplier's submitted document.
- In future extensions, implement automated regex/fuzzy match validation to verify that `evidence` exists verbatim in the extracted PDF text.

### 3.4 API Key Security Standard
- **Strict Ephemeral In-Memory Policy:** Never commit API keys or secret tokens into source code, git repositories, or client-side browser storage (`localStorage` / cookies).
- **App Load Pop-up Modal:** Prompt for model API key via a dedicated modal upon application launch; store the key exclusively in memory (React volatile state); purge automatically when the page is reloaded.
- **Runtime Injection:** Always use server-side environment variables (`GEMINI_API_KEY`) or ephemeral runtime headers.

### 3.5 Git Hygiene & .gitignore Enforcement
- Maintain a strict `.gitignore` excluding all runtime databases (`*.db`), generated SVG/PNG charts (`chart_*.svg`), evaluation run exports (`*_export.json`), Python bytecode (`__pycache__/`, `*.pyc`), and environment secrets (`.env*`).

---

## 4. Database, State Management & Caching Best Practices

### 4.1 Immutable Evaluation Runs
- Each evaluation run must be assigned a unique, immutable Run ID (e.g., `RFP-RUN-XXXXXXXX`).
- Run records must persist:
  1. The exact criteria and weights active at the moment of evaluation.
  2. The LLM model name and configuration parameters.
  3. The raw JSON scorecards and calculated rankings.
  4. All validation warnings encountered during the run.
- Previous runs in SQLite must remain read-only; re-evaluations create new run records.

### 4.2 ACID Transactions
- All database mutations must use parameterized queries to prevent SQL injection.
- Run writes and supplier result inserts should execute within a single transaction block.

### 4.3 Zero-Redundancy Three-Tier Caching Pipeline
- **Tier 1 (Document Ingestion):** Check `document_cache` using file byte SHA-256 hash. Never re-extract text if unchanged.
- **Tier 2 (Qualitative Scorecard):** Check `evaluation_cache` using `SHA256(DocHash + CriteriaDefHash + ModelName)`. Weight adjustments must never invalidate qualitative scorecards.
- **Tier 3 (Deterministic Engine):** Recompute benchmarks, gaps, relative percentages, and 4-tier tie-breakers locally at 0 tokens and 0 API cost.

---

## 5. UI/UX & Frontend Best Practices

### 5.1 Clear Decision Hierarchy
- **Header Navigation:** Provide one-click access to **Tools & Tests** and **Documentation Hub**.
- **Tab Discipline:** Every navigation tab must feature distinct, vibrant colorful icons while maintaining existing icon semantics.
- **Rankings & Scorecards:** Place **Export Records (JSON)** directly inside the active leaderboard view, reflecting that exports pertain to the current run.
- **Visual Analytics:**
  - Provide Radar Profile, Category Bars, Gap vs Leader, Trajectory (Line), and Total Score.
  - Position **Trajectory (Line)** immediately before **Total Score** to showcase vendor ranking crossovers.
  - Position **Decision Insight** directly on top of Category Leaders & Strengths to highlight strategic trade-offs.

### 5.2 Accessibility & Aesthetic Polish
- Support both **Light** and **Dark** themes with persistent user preference in `localStorage`.
- High-contrast visual palettes for charts to ensure legibility across all display devices.
- Fully responsive layouts supporting mobile viewports, tablets, and wide desktop screens.

---

## 6. Python Charting & Visualization Standards

- **Trajectory Line Graph Requirement:** Python chart generator must include the **Criteria Performance Trajectory (Line Graph)** across all three library targets (Pure Python SVG, Matplotlib, and Plotly) to highlight ranking crossovers and slope trade-offs.
- **Zero External Dependency Mode:** Always maintain `generate_charts.py` capable of generating pure SVG files (`chart_trajectory.svg`, `chart_radar.svg`, `chart_bars.svg`) without requiring `numpy`, `matplotlib`, or `plotly`.
- **Ecosystem Compatibility:** In the System Tools hub, provide copyable/downloadable code for standard Python data science stacks (`matplotlib` and `plotly`) with live interactive SVG preview.
- **Terminal Friendliness:** Provide ASCII / Unicode bar chart fallbacks for headless terminal environments.
- **Document Hub Markdown Parsing:** The Document Hub must parse markdown into structured elements (headers, tables, copyable code blocks, blockquotes) rather than raw plain text, with a rendered/raw view switcher.

---

## 7. Developer & Future Agent Checklist

Before committing changes or deploying new versions, verify:
- [ ] No mathematical formulas are located in LLM prompt templates.
- [ ] All scorecards pass Pydantic schema validation.
- [ ] Auto-Resolution toggle clamps boundary violations and fills omissions per Section 3.
- [ ] Division-by-zero is safely handled when benchmark scores are zero.
- [ ] Tie-breaking follows the 4-tier hierarchy.
- [ ] API keys are requested via ephemeral pop-up modal and never persisted across reloads.
- [ ] Runtime-generated files (DBs, SVGs, JSON runs, pycache) are excluded in `.gitignore`.
- [ ] Trajectory Line Graph is available in UI and Python chart generators.
- [ ] Input files are stored exclusively in canonical `./input/`.
- [ ] `rfp_evaluation_test.ipynb` cells 1 through 10 execute and pass assertions.
- [ ] `generate_charts.py` executes cleanly (`python3 generate_charts.py` exits with code 0).
- [ ] Web application compiles cleanly with zero TypeScript or Vite errors (`npm run build`).
- [ ] Footer copyright reads: `© 2026 Darkalto Developer | All Rights Reserved`.
