# System Architecture & Technical Specification

## RFP Evaluation & Supplier Ranking

---

## 1. Executive Summary & Design Philosophy

The **RFP Evaluation & Supplier Ranking** platform is an enterprise-grade procurement intelligence solution designed to eliminate subjectivity, calculation errors, and opaque decision-making from high-stakes Request for Proposal (RFP) evaluations.

### The Strict Separation Principle
The core architectural invariant governing this system is the **Strict Separation Principle**:
> **The Language Model (LLM) evaluates unstructured proposal text and extracts verifiable verbatim citations; it is STRICTLY PROHIBITED from computing arithmetic, deriving peer benchmarks, executing tie-breaks, or determining final ranks.**

By decoupling qualitative text comprehension (LLM) from quantitative evaluation arithmetic (Deterministic Python engine), the system guarantees:
- **100% Mathematical Precision:** Zero floating-point rounding drifts or LLM arithmetic hallucinations.
- **Explainability & Auditability:** Every score is backed by direct quotes from supplier proposals with file and page references.
- **Determinism:** Given identical scores and criteria, final ranks and tie-breaks are mathematically invariant.
- **Enterprise Governance:** Full regulatory compliance and defensible decision records for audit committees and public tenders.

---

## 2. High-Level Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                      USER INTERFACES                                               |
|  - Modern Web Application (React, TypeScript, Tailwind CSS, Recharts)                              |
|  - System Tools & Developer Hub (Interactive Notebook, Chart Generator, Code Browser)             |
|  - Standalone Python CLI & Batch Automation (orchestrator.py, generate_charts.py)                  |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    ORCHESTRATOR AGENT                                              |
|                                     (orchestrator.py)                                              |
|  Controls execution lifecycle, manages state, coordinates worker agents, persists results           |
+----------------------------------------------------------------------------------------------------+
       |                              |                            |                           |
       v                              v                            v                           v
+---------------+             +----------------+           +---------------+           +---------------+
| DOCUMENT TOOL |             | EVALUATION     |           |  VALIDATION   |           | DETERMINISTIC |
|               |             |     AGENT      |           |     TOOL      |           |  RANKER TOOL  |
| pdf_extractor |             |  evaluator.py  |           | validator.py  |           |   ranker.py   |
|---------------|             |----------------|           |---------------|           |---------------|
| • PDF Parse   |             | • Gemini API   |           | • Pydantic    |           | • Absolute    |
| • OCR/Tokens  |  Proposal   | • Structured   | Raw JSON  | • Score clamp | Cleaned   |   Weighted    |
| • Sections    |  Text       |   Prompting    | Scorecard | • Zero-fill   | Scorecard | • Benchmark   |
| • Tables      |  =======>   | • Evidence &   | =======>  | • Audit checks| =======>  | • Gap (<= 0)  |
|               |             |   Citations    |           | • Anomaly     |           | • Relative %  |
|               |             | • Strict JSON  |           |   Warnings    |           | • PPI Math    |
|               |             |   Output       |           |               |           | • 4-Tier Tie  |
+---------------+             +----------------+           +---------------+           +---------------+
                                                                                               |
                                                                                               v
+----------------------------------------------------------------------------------------------------+
|                                    PERSISTENCE & AUDIT LAYER                                       |
|  - SQLite Relational Database (rfp_evaluation.db)                                                  |
|  - Tables: evaluation_criteria, rfp_runs, supplier_results, evaluation_audit_logs                  |
|  - Immutable JSON Snapshot Exports & Audit Trail                                                   |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Subsystem & Component Breakdown

### 3.1 Document Extraction Tool (`pdf_extractor.py`)
- **Objective:** Ingest unstructured vendor PDF proposals from the `input/` directory and convert them into clean, tokenized text structured by sections.
- **Implementation:** Uses PyMuPDF / `pypdf` with fallback extraction modes for table parsing and header/footer normalization.
- **Fail-Safe Mechanism:** Handles password-free encrypted files, scans for missing metadata, and logs raw page boundaries to allow verified evidence tracing.

### 3.2 Evaluation Agent (`evaluator.py`)
- **Objective:** Assess proposal content against each active evaluation criterion.
- **Key Responsibilities:**
  1. Retrieve active criteria and weights directly from SQLite database.
  2. Dynamically compose system and user evaluation prompts.
  3. Send vendor proposal text to Google Gemini (or configured LLM).
  4. Force structured JSON output adhering to a strict JSON schema.
  5. Mandate **verbatim textual citations** in every criterion scoring block:
     ```json
     {
       "criterion_id": 1,
       "name": "Technical Capability",
       "score": 9.0,
       "evidence": "Exact excerpt from proposal PDF page 12...",
       "justification": "Evaluator qualitative analysis..."
     }
     ```

### 3.3 Validation & Guardrail Tool (`validator.py`)
- **Objective:** Act as an immutable firewall between non-deterministic LLM output and the calculation engine.
- **Validation Rules:**
  1. **Schema Integrity:** Verifies required keys via Pydantic model validation.
  2. **Score Boundary Clamping:** Clamps any score outside $[0, \text{max\_score}]$ back to the valid interval:
     $$\text{score}_{\text{valid}} = \max(0.0, \min(\text{max\_score}, \text{score}_{\text{raw}}))$$
  3. **Criterion Completeness:** Detects omitted criteria from the LLM response, auto-injects them with score `0.0`, and records an audit warning:
     `"Criterion omitted by model; assigned default score 0.0"`.
  4. **Warning Registry:** Captures anomalies, hallmarked missing citations, and score adjustments for transparent audit logs.

### 3.4 Deterministic Ranking Tool (`ranker.py`)
- **Objective:** Execute pure Python mathematical scoring, benchmark discovery, gap computation, relative percentage derivation, Peer Performance Index (PPI) weighting, and multi-tier tie-breaking.
- **Zero-LLM Math Policy:** Absolutely no arithmetic is handled by language models.

### 3.5 Database & State Persistence (`database.py`)
- **Objective:** Provide ACID-compliant relational storage for evaluation criteria, evaluation runs, scorecards, and audit logs.
- **Engine:** SQLite 3 (`rfp_evaluation.db`).

---

## 4. Mathematical Formulations & Algorithms

### 4.1 Absolute Weighted Score
For supplier $s$ evaluated across criteria set $C$:
$$\text{Absolute Score}_s = \sum_{c \in C} \left( \frac{\text{Score}_{s,c}}{\text{Max Score}_c} \times \text{Weight}_c \right)$$
*Properties:*
- Range: $[0.0, 100.0]$ when $\sum_{c \in C} \text{Weight}_c = 100.0$.
- Reflects the unadjusted weighted performance of the vendor in isolation.

### 4.2 Criterion Benchmark
For each criterion $c \in C$, the peer benchmark is the maximum score observed across all candidate proposals $S$:
$$\text{Benchmark}_c = \max_{s \in S} (\text{Score}_{s,c})$$
*Properties:*
- $\text{Benchmark}_c \in [0.0, \text{Max Score}_c]$.
- Represents the state-of-the-art capability among the current proposal pool.

### 4.3 Criterion Gap
The gap measures how far supplier $s$ lags behind the category leader:
$$\text{Gap}_{s,c} = \text{Score}_{s,c} - \text{Benchmark}_c$$
*Properties:*
- $\text{Gap}_{s,c} \le 0.0$ for all suppliers.
- $\text{Gap}_{s,c} = 0.0$ if and only if supplier $s$ is the category leader.

### 4.4 Relative Performance Percentage
The percentage achieved relative to the category benchmark:
$$\text{Relative \%}_{s,c} = \begin{cases}
\left( \frac{\text{Score}_{s,c}}{\text{Benchmark}_c} \right) \times 100.0 & \text{if } \text{Benchmark}_c > 0.0 \\
100.0 & \text{if } \text{Benchmark}_c = 0.0 \text{ and } \text{Score}_{s,c} = 0.0 \\
0.0 & \text{otherwise}
\end{cases}$$

### 4.5 Peer Performance Index (PPI)
The overall composite match rating computed as the weighted average of relative percentages:
$$\text{PPI}_s = \sum_{c \in C} \left( \text{Relative \%}_{s,c} \times \frac{\text{Weight}_c}{100.0} \right)$$
*Properties:*
- If a supplier achieves the maximum score in every category, $\text{PPI}_s = 100.0\%$.
- Benchmarks suppliers against real market competitors rather than arbitrary theoretical maximums.

### 4.6 Four-Tier Deterministic Tie-Breaker
When sorting suppliers to determine final rankings:
1. **Tier 1 (Primary):** Peer Performance Index ($\text{PPI}_s$) descending.
2. **Tier 2 (Secondary):** Submission Date ascending (earlier proposal submissions get precedence).
3. **Tier 3 (Tertiary):** Historical Vendor Experience Rating (0.0 to 5.0) descending.
4. **Tier 4 (Quaternary):** Supplier Name ascending (alphabetical, case-insensitive).

*Python Implementation Pattern:*
```python
def sort_key(s):
    # -ppi for descending
    # submission_date for ascending
    # -experience for descending
    # name.lower() for ascending
    return (-round(s["ppi"], 4), s["submission_date"], -s["experience_rating"], s["supplier_name"].lower())

suppliers.sort(key=sort_key)
```

---

## 5. Database Schema & Storage Architecture

```sql
-- 1. Criteria Definitions
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    criterion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    weight REAL NOT NULL,
    max_score REAL DEFAULT 10.0,
    is_active INTEGER DEFAULT 1
);

-- 2. Evaluation Runs
CREATE TABLE IF NOT EXISTS rfp_runs (
    rfp_run_id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,
    model_name TEXT NOT NULL,
    total_active_weight REAL NOT NULL,
    run_metadata_json TEXT
);

-- 3. Supplier Results & Scorecards
CREATE TABLE IF NOT EXISTS supplier_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfp_run_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    submission_date TEXT NOT NULL,
    experience_rating REAL NOT NULL,
    absolute_score REAL NOT NULL,
    ppi REAL NOT NULL,
    final_rank INTEGER NOT NULL,
    tie_break_note TEXT,
    criteria_scores_json TEXT NOT NULL,
    executive_summary TEXT,
    risks_json TEXT,
    FOREIGN KEY(rfp_run_id) REFERENCES rfp_runs(rfp_run_id)
);

-- 4. Audit Warnings & Anomaly Logs
CREATE TABLE IF NOT EXISTS evaluation_audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfp_run_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    warning_code TEXT NOT NULL,
    message TEXT NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(rfp_run_id) REFERENCES rfp_runs(rfp_run_id)
);

-- 5. Tier 1 Document Text Extraction Cache
CREATE TABLE IF NOT EXISTS document_cache (
    doc_hash TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    extracted_text TEXT NOT NULL,
    extracted_metadata_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tier 2 Qualitative Evaluation Scorecard Cache
CREATE TABLE IF NOT EXISTS evaluation_cache (
    cache_key TEXT PRIMARY KEY,
    doc_hash TEXT NOT NULL,
    criteria_def_hash TEXT NOT NULL,
    model_name TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    scorecard_json TEXT NOT NULL,
    estimated_prompt_tokens INTEGER DEFAULT 4500,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_hash) REFERENCES document_cache(doc_hash)
);

CREATE INDEX IF NOT EXISTS idx_eval_cache_doc ON evaluation_cache(doc_hash);
```

---

## 6. Frontend & Visualization Architecture

### 6.1 React SPA Architecture
- **Framework:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS with comprehensive Light / Dark theme support.
- **State Management:** Fully responsive unidirectional state flow with automatic reactive re-computation (`recomputeSupplierMetrics`).
- **Documentation Hub:** First-class modal viewer for all technical and architectural guides directly accessible from the header alongside Tools & Tests.
- **Data Export:** Complete evaluation record export to JSON with cryptographic-style run identifiers (`RFP-RUN-XXXXXXXX`), positioned inside the Rankings & Scorecards view.
- **Navigation:** Semantic tab navigation enhanced with vibrant, colorful icons.

### 6.2 Visualization Suite
1. **Interactive Recharts Component (`SupplierChartsSection.tsx`):**
   - **Radar Profile:** Multi-dimensional polygon overlay evaluating capability balance across all categories.
   - **Category Bars:** Grouped bar chart comparing scores head-to-head.
   - **Gap vs Leader:** Deficit analysis displaying negative bars ($\le 0$) showing the exact gap between each proposal and the category leader.
   - **Trajectory (Line):** Parallel criteria trajectory line graph positioned directly before Total Score. Line slopes illuminate **ranking crossovers** where a vendor excels in technical metrics but trails in commercial terms.
   - **Total Score:** Dual-bar overview showing absolute weighted scores (/100) alongside relative Peer Performance Index (PPI %).
   - **Prominent Decision Insight:** Situated directly on top of the Category Leaders & Strengths panel to provide dynamic strategic commentary.
2. **System Tools & Testing Hub (`DeveloperHubModal.tsx` & `PythonChartGenerator.tsx`):**
   - Zero-dependency Pure Python SVG Chart Generator (`generate_charts.py`)
   - Production Matplotlib Script Generator
   - Production Plotly Interactive Chart Generator
   - Interactive Jupyter Notebook Viewer (`rfp_evaluation_test.ipynb`)
   - Source Code Viewer for all Python pipeline modules

---

## 7. Security, Zero Key Storage & Clean Architecture

1. **Zero Client-Side API Key Storage:** API keys are **never stored** in browser localStorage, cookies, session storage, or frontend code. The platform mandates runtime injection via server-side environment variables (`GEMINI_API_KEY`).
2. **Zero-Redundancy Three-Tier Caching:** Implements SHA-256 fingerprinting on document bytes and criteria definitions, saving 80% to 95% of LLM tokens on re-evaluations and weight adjustments.
3. **Canonical Workspace Organization:** All proposal PDFs reside exclusively in `./input/`. Redundant duplicate folders (`sample_rfps/`, `agentic_rfp_project/`) and typo documentation files (`architechure.md`) have been eliminated.
4. **Prompt Injection Hardening:** Proposal text is sandboxed inside strict XML tags (`<proposal_text>`) and evaluated using system role instructions that ignore adversarial instructions within documents.
5. **Deterministic Clamping:** Out-of-bounds numbers cannot propagate into database records or leaderboard computations.
6. **Citation Provenance:** Each criterion score must point to verbatim text from the document, protecting against hallucinations.
7. **Historical Immutability:** Previous runs are persisted with snapshot criteria weights, preventing retrospective alterations.
