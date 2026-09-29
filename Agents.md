# Agents Specification & Multi-Agent Architecture

## RFP Evaluation & Supplier Ranking

This document provides complete technical specifications for all agents operating within this repository, as well as instructions for autonomous AI agents extending or maintaining the codebase.

---

## 1. Agent Ecosystem Overview

The RFP Evaluation System is organized as a pipeline of specialized agents and tools operating under an **Orchestrator Agent**:

```
                              [ ORCHESTRATOR AGENT ]
                                        |
       +-----------------+--------------+---------------+------------------+
       |                 |                              |                  |
       v                 v                              v                  v
[ DOCUMENT AGENT ] [ EVALUATION AGENT ]        [ VALIDATION AGENT ] [ RANKING AGENT ]
 (pdf_extractor)     (evaluator.py)              (validator.py)       (ranker.py)
```

---

## 2. Agent Specifications

### 2.1 Orchestrator Agent (`orchestrator.py`)
- **Role:** Workflow Controller & Pipeline Coordinator.
- **Responsibilities:**
  - Discovers PDF files in `input/`.
  - Reads active criteria from `rfp_evaluation.db`.
  - Triggers extraction, evaluation, validation, and ranking in strict sequence.
  - Commits results and audit logs to the SQLite database.
- **Input:** Directory path (`input/`), criteria configuration.
- **Output:** Run summary record (`RFP-RUN-XXXXXXXX`), exit status code.

### 2.2 Document Agent (`pdf_extractor.py`)
- **Role:** Document Parser & Tokenizer.
- **Capabilities:**
  - Extracts clean ASCII/Unicode text from proposal PDFs.
  - Normalizes headers, footers, and page numbers.
  - Parses table layouts into markdown-compatible tables.
- **Tools Used:** PyMuPDF (`fitz`), `pypdf`.
- **Failure Mode:** If a file cannot be read, logs an extraction error and alerts Orchestrator without terminating the batch.

### 2.3 Evaluation Agent (`evaluator.py`)
- **Role:** Qualitative Proposal Assessor & Evidence Extractor.
- **Model:** Google Gemini (`gemini-2.5-flash` or `gemini-1.5-pro`).
- **Prompt Architecture:**
  - System prompt injects criteria names, descriptions, weights, and max scores.
  - Injects strict prompt injection guardrails (`<proposal_text>` boundary tags).
  - Enforces structured JSON output adhering to the `EvaluationResult` schema.
- **Mandatory Invariant:** MUST output verbatim textual quotes in the `evidence` field for every criterion. MUST NOT perform mathematical aggregation or ranking.

### 2.4 Validation & Guardrail Agent (`validator.py`)
- **Role:** Data Sanitizer & Firewall.
- **Validation Operations:**
  1. Validates JSON payload against Pydantic schema.
  2. Enforces score bounds $[0.0, \text{max\_score}]$.
  3. Detects omitted criteria and zero-fills them with audit warning.
  4. Trims whitespace and normalizes supplier names and dates.
- **Output:** Sanitized scorecard object, array of audit warning dictionaries.

### 2.5 Deterministic Ranking Agent (`ranker.py`)
- **Role:** Mathematical Calculation & Ranking Engine.
- **Implementation:** Pure Python (no LLM, no stochastic logic).
- **Core Methods:**
  - `compute_absolute_score(supplier, criteria)`
  - `compute_benchmarks(suppliers, criteria)`
  - `compute_gaps_and_relative(suppliers, benchmarks)`
  - `compute_ppi(supplier, criteria)`
  - `apply_tie_breaks(suppliers)` (4-tier hierarchy)

---

## 3. Communication Protocols & Data Interchange

Agents communicate using strongly typed JSON payloads.

### Standard Scorecard Schema
```json
{
  "supplier_name": "NexaWorks",
  "submission_date": "2026-03-01",
  "experience_rating": 4.5,
  "executive_summary": "Comprehensive enterprise platform proposal...",
  "criteria_scores": [
    {
      "criterion_id": 1,
      "name": "Technical Capability",
      "score": 8.8,
      "evidence": "Verbatim quote from page 4...",
      "justification": "Detailed assessment of microservices architecture..."
    }
  ],
  "risks": [
    "Timeline dependency on third-party cloud region availability"
  ]
}
```

---

## 4. Guidelines for Autonomous AI Agents Modifying This Repo

When an AI agent (such as Claude, Codex, Cursor, or Gemini) is modifying this codebase:

1. **Preserve Determinism:** Never replace pure Python mathematical calculations in `ranker.py` or `rfpMath.ts` with LLM API calls.
2. **Preserve Database Structure:** When updating schemas, provide backward-compatible migrations or updates in `database.py`.
3. **Keep Tools Synced:** If you alter metrics or data structures in `ranker.py`, update:
   - `src/types.ts`
   - `src/utils/rfpMath.ts`
   - `generate_charts.py`
   - `rfp_evaluation_test.ipynb`
4. **Always Run Verifications:**
   - Execute `python3 generate_charts.py` to ensure visualization scripts work.
   - Run `npm run build` to ensure the React UI compiles cleanly.
