# RFP Evaluation & Supplier Ranking

An enterprise-grade AI-assisted procurement intelligence platform that ingests supplier proposal PDFs, scores them against dynamically configurable criteria using an LLM, applies pure deterministic Python business logic for peer benchmarking and tie-breaking, and produces an explainable, auditable final leaderboard with direct evidence citations.

---

## 📚 Project Documentation Hub

All comprehensive engineering documentation is accessible in the web application's **Documentation Hub** (located in the top header beside **Tools & Tests**) and in this repository:

| Document | Description |
| :--- | :--- |
| ⚡ **[caching_system.md](./caching_system.md)** | Three-Tier Zero-Redundancy Caching and Incremental Evaluation Engine saving 80% to 95% LLM tokens. |
| 🏛️ **[architecture.md](./architecture.md)** | Comprehensive system architecture, component breakdown, mathematical formulations, and database schemas. |
| 📋 **[instruction.md](./instruction.md)** | Engineering best practices followed and mandatory guidelines for future development. |
| 🤖 **[Agents.md](./Agents.md)** | Multi-agent architecture specification, roles, inputs/outputs, and lifecycle protocols. |
| 🧠 **[Claude.md](./Claude.md)** | Context, architectural invariants, security policies, and conventions for Claude-based coding agents. |
| 💻 **[copilot-instruction.md](./copilot-instruction.md)** | Rules and mathematical guardrails for GitHub Copilot, Cursor, and IDE assistants. |
| 🎓 **[EXAM_EVALUATOR_GUIDE.md](./EXAM_EVALUATOR_GUIDE.md)** | Complete walkthrough for exam evaluators covering all rubric criteria, features, and future enhancements. |
| 📊 **[EVALUATION_SUMMARY.md](./EVALUATION_SUMMARY.md)** | Quick reference summary of rubric alignment (100 Marks) and system capabilities. |

---

## 1. System Architecture & The Strict Separation Principle

This system strictly enforces the **Strict Separation Principle**:
> **The LLM may evaluate unstructured proposal content and cite exact evidence, but it must NEVER decide arithmetic, benchmarks, tie-breaks, or final ranks.**

```
+-------------------------------------------------------------------------------+
|                             ORCHESTRATOR AGENT                                |
|                        (Workflow Execution Controller)                        |
+--------+------------------+-------------------+-----------------+-------------+
         |                  |                   |                 |
         v                  v                   v                 v
+-----------------+ +-----------------+ +---------------+ +---------------+
|  DOCUMENT TOOL  | |EVALUATION AGENT | |VALIDATION TOOL| | RANKING TOOL  |
| (PyMuPDF/pypdf) | |  (Gemini LLM)   | |  (Pydantic)   | |(Deterministic)|
|                 | |                 | |               | |               |
| Extracts clean  | | Scores criteria | | Schema checks | | Absolute Score|
| text & sections | | & cites exact   | | Score clipping| | Peer Benchmark|
| from proposals  | | document quotes | | Auto-fill zero| | Gap Analysis  |
|                 | | in strict JSON  | | Audit warnings| | PPI & Ranks   |
+-----------------+ +-----------------+ +---------------+ +---------------+
         |                  |                   |                 |
         +------------------+-------------------+-----------------+
                                    |
                                    v
                         +--------------------+
                         |   SQLite DATABASE  |
                         | (Criteria & Runs)  |
                         +--------------------+
                                    |
                                    v
                         +--------------------+
                         | STREAMLIT & REACT  |
                         | (Leaderboard & UI) |
                         +--------------------+
```

### Agent Roles:
1. **Orchestrator Agent** (`orchestrator.py`): Sequences pipeline steps from document intake through database persistence.
2. **Document Tool** (`pdf_extractor.py`): Ingests supplier PDFs and extracts clean text and page tokens.
3. **Evaluation Agent** (`evaluator.py`): Injects dynamic SQLite criteria into the system prompt; requests evidence-grounded JSON scoring.
4. **Validation Tool** (`validator.py`): Audits LLM JSON against database criteria; clips out-of-range scores `[0, max_score]`; auto-fills missing criteria with `0.0` score; logs audit warnings.
5. **Ranking Tool** (`ranker.py` / `src/utils/rfpMath.ts`): Pure deterministic mathematics calculating Absolute Scores, Peer Benchmarks, Criterion Gaps, Relative Percentages, Peer Performance Index (PPI), and the 4-level deterministic tie-breaker.
6. **Persistence Layer** (`database.py`): Stores criteria, run metadata, and JSON results in SQLite (`rfp_evaluation.db`).

---

## 2. Mathematical Formulas & Tie-Break Rules

### A. Mathematical Formulas (Executed in Pure Python & TypeScript)
1. **Absolute Weighted Score**:
   $$\text{Absolute Score} = \sum_{c} \left( \frac{\text{Score}_{s,c}}{\text{Max Score}_c} \times \text{Weight}_c \right)$$
   *(Sums to maximum 100.0 points when active criteria weights sum to 100%)*

2. **Criterion Benchmark**:
   $$\text{Benchmark}_c = \max_{s \in \text{Suppliers}} (\text{Score}_{s,c})$$
   *(Highest valid score observed for criterion $c$ across all evaluated proposals)*

3. **Criterion Gap**:
   $$\text{Gap}_{s,c} = \text{Score}_{s,c} - \text{Benchmark}_c \quad (\le 0)$$
   *(Equal to 0.0 for benchmark leaders; negative for all others)*

4. **Relative Performance Percentage**:
   $$\text{Relative Performance \%}_{s,c} = \begin{cases}
   \left( \frac{\text{Score}_{s,c}}{\text{Benchmark}_c} \right) \times 100 & \text{if } \text{Benchmark}_c > 0 \\
   100.0 & \text{if } \text{Benchmark}_c = 0 \text{ and } \text{Score}_{s,c} = 0 \\
   0.0 & \text{otherwise}
   \end{cases}$$

5. **Peer Performance Index (PPI)**:
   $$\text{PPI}_s = \sum_{c} \left( \text{Relative Performance \%}_{s,c} \times \frac{\text{Weight}_c}{100} \right)$$
   *(Weighted average of supplier's relative performance against peer benchmarks)*

### B. Mandatory Deterministic Tie-Break Rules
When sorting suppliers to assign final ranks `1, 2, 3...`:
1. **Tier 1 - Higher PPI** (`descending`)
2. **Tier 2 - Earlier Submission Date** (`ascending` - ISO `YYYY-MM-DD`)
3. **Tier 3 - Higher Historical Experience Rating** (`descending` - 0.0 to 5.0 scale)
4. **Tier 4 - Supplier Name** (`ascending` - Alphabetical case-insensitive)

---

## 3. Database Schema (SQLite)

```sql
-- Active Evaluation Criteria
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    criterion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    weight REAL NOT NULL,        -- Sum of active criteria weights must equal 100%
    max_score REAL DEFAULT 10.0,
    is_active INTEGER DEFAULT 1
);

-- RFP Evaluation Run Metadata
CREATE TABLE IF NOT EXISTS rfp_runs (
    rfp_run_id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL
);

-- Final Evaluation Results
CREATE TABLE IF NOT EXISTS supplier_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfp_run_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    submission_date TEXT NOT NULL,
    experience_rating REAL NOT NULL,
    absolute_score REAL NOT NULL,
    ppi REAL NOT NULL,
    final_rank INTEGER NOT NULL,
    result_json TEXT NOT NULL,
    FOREIGN KEY (rfp_run_id) REFERENCES rfp_runs (rfp_run_id)
);
```

---

## 4. Visual Comparison & Analytics Engine

The visual comparison suite (`SupplierChartsSection.tsx`) provides five interactive views designed for rigorous procurement analysis:

1. **Radar Profile:** Multi-dimensional polygon overlay illustrating capability symmetry across categories.
2. **Category Bars:** Grouped bar chart comparing scores head-to-head for each active criterion.
3. **Gap vs Leader:** Deficit analysis displaying negative bars ($\le 0$) showing the exact gap between each proposal and the category leader.
4. **Trajectory (Line):** Parallel criteria trajectory line graph positioned directly before Total Score. Line slopes reveal **ranking crossovers** where a vendor outpaces competitors in technical or security areas but drops in commercial terms.
5. **Total Score:** Dual-bar overview showing absolute weighted scores (/100) alongside relative Peer Performance Index (PPI %).

### Decision Insight & Category Leaders Hierarchy
- **Prominent Decision Insight Banner:** Located directly on top of the Category Leaders & Strengths panel, providing contextual analytical commentary tailored to the active chart.
- **Category Leaders & Strengths:** Highlights benchmark winners for each criterion with assigned weights and maximum scores.

---

## 5. Zero-Redundancy Caching & Security Policy

### 5.1 Three-Tier Caching Pipeline (`caching_system.md`)
- **Tier 1 (Document Cache):** Fingerprints PDFs via SHA-256 (`doc_hash`), avoiding duplicate parsing and tokenization.
- **Tier 2 (Evaluation Cache):** Caches qualitative scorecards and verbatim citations keyed by `SHA256(DocHash + CriteriaDefHash + ModelName)`. Weight adjustments require **0 tokens and 0 API calls**.
- **Tier 3 (Deterministic Engine):** Recomputes peer benchmarks, gaps, relative percentages, and 4-tier tie-breakers instantly in pure local code ($<50\text{ ms}$, 0 API calls).
- **Token Savings:** Achieves **80% to 95%** token reduction across incremental evaluation workflows.

### 5.2 Enterprise API Key Security Policy
- **Zero Client-Side Key Storage:** API keys are **never stored** in local storage, session storage, cookies, or git repository files.
- **Secure Runtime Injection:** The system utilizes server-side runtime injection via `GEMINI_API_KEY` environment variables.

### 5.3 Unified Clean Architecture
- **Single Canonical Input:** All proposal PDFs reside exclusively in `./input/`. The redundant `sample_rfps/` folder was removed.
- **Duplicate File Cleanup:** Corrected `architechure.md` typo copy into canonical `architecture.md`. Unused `agentic_rfp_project/` folder has been purged.
- **Export Records (JSON):** Positioned directly inside the **Rankings & Scorecards** tab, as exported records correspond to the current active evaluation run.
- **Colorful Tab Icons:** All navigation tabs feature vibrant, distinct icons without changing icon semantics.

---

## 6. System Tools & Python Chart Generator

The application includes a unified **System Configuration & Testing Tools Hub** (`DeveloperHubModal.tsx`), accessible via the **Tools & Tests** button in the header or directly from the Visual Comparisons section:

1. **Python Chart Generator (`PythonChartGenerator.tsx`):**
   - **Radar Capabilities Profile** (Matplotlib & pure SVG).
   - **Category Scores Grouped Bar Chart** (Matplotlib, Plotly, & pure SVG).
   - **Leader Gap Analysis Chart** (Matplotlib, Plotly, & pure SVG).
   - **Pure Python Zero-Dependency SVG Script** (`generate_charts.py`) that executes in any environment without installing NumPy, Matplotlib, or Plotly.
2. **Interactive Testing Notebook (`rfp_evaluation_test.ipynb`):**
   - Inspect all 7 testing cells directly inside the web UI with syntax highlighting and verification notes.
3. **Python Source Code Viewer (`CodeArtifactsHub.tsx`):**
   - Live browser for all backend scripts: `orchestrator.py`, `evaluator.py`, `validator.py`, `ranker.py`, `pdf_extractor.py`, `database.py`.
4. **Workflow Step Visualizer:**
   - Step-by-step trace of data transformations from raw PDF through SQLite storage.

### Running Python Chart Generation via CLI
```bash
python3 generate_charts.py
```
*Output:*
- Generates `chart_radar.svg` (Radar Capabilities Profile)
- Generates `chart_bars.svg` (Category Comparison Bar Chart)
- Displays ASCII/Unicode visual progress comparison bars in the terminal.

---

## 5. Quickstart & Installation

### Step 1: Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Seed SQLite Database
```bash
python seed_db.py
```

### Step 3: Generate Synthetic Proposal PDFs
```bash
python generate_synthetic_pdfs.py  # Generates 4 PDFs directly into input/
```

### Step 4: Run Prototyping Test Notebook
```bash
jupyter notebook rfp_evaluation_test.ipynb
```

### Step 5: Run Standalone Python Chart Generator
```bash
python3 generate_charts.py
```

### Step 6: Launch Web Application
```bash
# Launch Streamlit app
streamlit run app.py

# Or launch React SPA dev server
npm run dev
```

---

## 6. Submission Rubric Verification (100 Marks)

| Area | Marks | Implementation in this Codebase |
| :--- | :--- | :--- |
| **Agentic Workflow & Tool Use** | 20 | Clear orchestrator agent in `orchestrator.py` calling document extraction, qualitative LLM scoring, Pydantic validation, and ranking tools sequentially. |
| **PDF Extraction & Prompting** | 15 | `pdf_extractor.py` parses multi-page PDFs; `evaluator.py` builds dynamic criteria prompts and outputs structured JSON with exact quotation citations. |
| **Validation & Scoring** | 20 | `validator.py` clips scores `[0, max_score]`, fills missing criteria with `0.0`, logs warnings; `ranker.py` executes exact mathematical formulas. |
| **Peer Ranking & Tie-Breaks** | 20 | `ranker.py` calculates Benchmarks, Gaps, Relative %, PPI, and enforces 4-tier deterministic tie-breaking (PPI $\to$ Date $\to$ Exp $\to$ Name). |
| **SQLite & Persistence** | 10 | `database.py` defines `evaluation_criteria`, `rfp_runs`, and `supplier_results` tables with complete JSON storage and retrieval. |
| **User Interface** | 10 | React SPA + Streamlit `app.py` delivering Criteria CRUD, PDF Upload, Interactive Leaderboard, Drill-down Scorecard, System Tools, and JSON Export. |
| **Documentation & Testing** | 5 | `rfp_evaluation_test.ipynb` with 7 test cells, comprehensive `README.md`, `architecture.md`, `instruction.md`, `Agents.md`, `Claude.md`, `copilot-instruction.md`, and `EXAM_EVALUATOR_GUIDE.md`. |

---

## 7. Copyright & License

© 2026 Darkalto Developer | All Rights Reserved
