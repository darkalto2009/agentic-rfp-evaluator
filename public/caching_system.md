# Caching, Token Optimization & Incremental Evaluation System Guide

## Executive Summary

This engineering guide provides the architectural blueprint, mathematical foundations, database schemas, and step-by-step implementation instructions for integrating a **Zero-Redundancy Caching and Incremental Evaluation Engine** into the Agentic RFP Evaluation & Supplier Ranking System.

### Core Objectives
1. **Token & Cost Optimization:** Reduce Gemini LLM API calls and token consumption by **80% to 95%** across typical procurement evaluation workflows.
2. **Document & Context Reuse:** Parse, extract, and evaluate uploaded proposals once; reuse extracted text and qualitative scorecards permanently unless the document or criteria definitions change.
3. **Incremental Multi-Proposal Batches:** Enable adding 1, 2, or $N$ new supplier proposals to an existing evaluation batch without spending a single token on previously evaluated proposals.
4. **Instant Run-Level Matching:** Detect previously executed evaluation runs and return results instantly ($<50\text{ ms}$, 0 API calls).
5. **Preservation of the Strict Separation Principle:** Ensure that all arithmetic, weights, peer benchmarks, criterion gaps, relative percentages, and 4-tier tie-breakers remain 100% deterministic, cost-free, and executed outside the LLM.

---

## 1. System Architecture: The Three-Tier Caching Pipeline

The system decouples data into three distinct layers of mutability:

```
                      +------------------------------------------+
                      |         Uploaded Proposal File           |
                      |          (PDF, TXT, or JSON)             |
                      +------------------------------------------+
                                           |
                                           v
            ================================================================
            TIER 1: DOCUMENT FINGERPRINTING & EXTRACTION CACHE
            ================================================================
                               DocHash = SHA-256(FileBytes)
                                           |
                           +---------------+---------------+
                           |                               |
                     [ Cache HIT ]                   [ Cache MISS ]
                           |                               |
                 Load Extracted Text             Run PyMuPDF / Document Tool,
                 & Detected Metadata             Extract Text & Metadata,
                 (0 ms, 0 API Calls)             Save to `document_cache`
                           |                               |
                           +---------------+---------------+
                                           |
                                           v
            ================================================================
            TIER 2: QUALITATIVE EVALUATION SCORECARD CACHE
            ================================================================
                   CacheKey = SHA-256(DocHash + CriteriaDefHash + Model)
                                           |
                           +---------------+---------------+
                           |                               |
                     [ Cache HIT ]                   [ Cache MISS ]
                           |                               |
                 Load Qualitative Scores,        Call Gemini LLM API
                 Evidence Quotes & Risks         (Prompt for this vendor only),
                 (⚡ 0 Tokens, 0 API Calls)       Save to `evaluation_cache`
                           |                               |
                           +---------------+---------------+
                                           |
                                           v
            ================================================================
            TIER 3: DETERMINISTIC RE-BENCHMARKING & RANKING ENGINE
            ================================================================
               Inputs: All Active Scorecards (Cached + Fresh) & Active Weights
               Math:   Absolute Scores, Benchmarks, Gaps, Relative %, PPI,
                       and 4-Tier Tie-Breaking
               Execution: Pure Python / TypeScript (100% Local, Always 0 Tokens)
            ================================================================
```

---

## 2. Mathematical Invariants & Key Formulations

### Invariant 1: Decoupling Qualitative Evaluation from Quantitative Weighting
A supplier's qualitative performance on a criterion (its score out of `max_score`, its justification, and verbatim evidence quotes) is **an intrinsic property of the proposal document relative to the criterion definition**. It is completely independent of:
- The criterion's **weight percentage** ($\text{Weight}_c$).
- The presence or absence of **competitor proposals**.

Therefore, when a user changes criteria weights (e.g., shifts Security from 20% to 30%) or adds more suppliers to the batch:
$$\text{LLM API Calls Required} = 0$$
$$\text{Tokens Consumed} = 0$$

All recalculations occur exclusively in Tier 3 deterministic math:
$$\text{Absolute Score}_s = \sum_{c} \left( \frac{\text{Score}_{s,c}}{\text{Max Score}_c} \times \text{Weight}_c \right)$$
$$\text{Benchmark}_c = \max_{s \in \text{All Suppliers}} (\text{Score}_{s,c})$$
$$\text{Gap}_{s,c} = \text{Score}_{s,c} - \text{Benchmark}_c$$
$$\text{Relative \%}_{s,c} = \left( \frac{\text{Score}_{s,c}}{\text{Benchmark}_c} \right) \times 100$$
$$\text{PPI}_s = \frac{\sum_c (\text{Relative \%}_{s,c} \times \text{Weight}_c)}{\sum_c \text{Weight}_c}$$

---

### Invariant 2: Cryptographic Cache Keys

#### A. Document Hash (`DocHash`)
Calculated over raw file bytes to detect any modification down to a single byte:
$$\text{DocHash} = \text{SHA256}(\text{RawFileBytes})$$

#### B. Criteria Definition Hash (`CriteriaDefHash`)
Calculated exclusively over fields that influence qualitative scoring (`criterion_id`, `name`, `description`, `max_score`). Notice that `weight` is intentionally excluded:
$$\text{CriteriaDefHash} = \text{SHA256}\left(\sum_{c \in \text{ActiveCriteria}} \text{canonical\_json}(c[\text{id}, \text{name}, \text{description}, \text{max\_score}])\right)$$

#### C. Composite Evaluation Cache Key (`EvaluationCacheKey`)
$$\text{CacheKey} = \text{SHA256}(\text{DocHash} \mathbin{\Vert} \text{CriteriaDefHash} \mathbin{\Vert} \text{ModelName})$$

#### D. Batch Run Signature (`RunSignature`)
Used to instantly identify if the user is requesting an identical re-run of a past evaluation:
$$\text{RunSignature} = \text{SHA256}(\text{SortedDocHashes} \mathbin{\Vert} \text{CriteriaWithWeightsHash} \mathbin{\Vert} \text{ModelName})$$

---

## 3. Incremental Multi-File Addition Workflow

When a user adds new supplier proposals into an active or existing evaluation session:

### Algorithm: Incremental Batch Evaluation
1. **Input:** Current set of suppliers $S_{\text{existing}}$ and newly uploaded files $F_{\text{new}} = [f_1, f_2, \dots, f_k]$.
2. **Deduplication:** Compute $\text{DocHash}$ for each $f \in F_{\text{new}}$.
   - If $\text{DocHash} \in S_{\text{existing}}$, flag as duplicate and skip.
3. **Partitioning:** Partition all active suppliers into:
   - $S_{\text{cached}}$: Suppliers whose $\text{CacheKey}$ exists in the cache.
   - $S_{\text{pending}}$: Suppliers that have no cached scorecard.
4. **Selective LLM Execution:**
   - Call Gemini LLM **only for** $s \in S_{\text{pending}}$.
   - Number of API calls made = $|S_{\text{pending}}| = \Delta N$.
   - Record token savings: $\text{TokensSaved} = |S_{\text{cached}}| \times \overline{\text{TokensPerProposal}}$.
5. **Combined Deterministic Re-Benchmarking:**
   - Combine all scorecards: $S_{\text{all}} = S_{\text{cached}} \cup S_{\text{evaluated}}$.
   - Recompute global benchmarks across $S_{\text{all}}$:
     $$\text{Benchmark}_c^{\text{new}} = \max\left(\text{Benchmark}_c^{\text{old}}, \max_{s \in S_{\text{pending}}}(\text{Score}_{s,c})\right)$$
   - Recompute all Gaps, Relative %, and PPI across all suppliers.
   - Run the 4-tier tie-breaking algorithm (PPI $\to$ Submission Date $\to$ Experience $\to$ Alphabetical).
6. **Output:** Updated unified leaderboard and scorecards.

---

## 4. Database Schema Specifications

### SQLite Database Extensions (`database.py`)

```sql
-- Table 1: Ingested Document Text Cache
-- Avoids re-reading and re-parsing PDFs when files are reused
CREATE TABLE IF NOT EXISTS document_cache (
    doc_hash TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    extracted_text TEXT NOT NULL,
    extracted_metadata_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Qualitative Evaluation Scorecard Cache
-- Stores qualitative LLM output per document per criteria-definition set
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

## 5. Verification & Test Scenarios

| Test Scenario | Action | Expected Behavior | Token Consumption |
| :--- | :--- | :--- | :--- |
| **Test 1: Identical Re-Run** | Click "Run Batch" twice consecutively without modifying files or criteria. | System detects identical run signature, reloads past results from memory/database. | **0 Tokens (100% saved)** |
| **Test 2: Weight Adjustment** | Change Technical Capability weight from 30% to 40% and click Run. | Qualitative scores are retained from cache; pure deterministic math recalculates PPI and ranks. | **0 Tokens (100% saved)** |
| **Test 3: Incremental File Addition** | Start with 4 benchmark proposals; upload 2 new proposals and run. | 4 proposals are retrieved from cache; Gemini is invoked **only for the 2 new proposals**. Benchmarks recalibrate across all 6. | **Only 2 proposals billed (~9k tokens vs ~27k tokens)** |
| **Test 4: Criteria Name/Description Change** | Edit Criterion 1 name from "Technical Capability" to "Cloud Architecture". | `CriteriaDefHash` changes; system invalidates qualitative cache and prompts LLM for updated evaluations. | Fresh tokens billed as expected. |
