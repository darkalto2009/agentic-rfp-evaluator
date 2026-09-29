"""
orchestrator.py: Orchestrator Agent
Coordinates the complete end-to-end evaluation pipeline:
1. Loads active criteria from SQLite
2. Extracts clean text from uploaded supplier PDFs (Document Tool)
3. Prompts LLM / Evaluator for qualitative scoring (Evaluation Agent)
4. Normalizes, fills missing criteria, clips scores, logs warnings (Validation Tool)
5. Computes absolute scores, peer benchmarks, criterion gaps, relative %, PPI, and tie-breaking (Ranking Tool)
6. Persists complete run into SQLite and outputs JSON exportable structure
"""

import os
import uuid
import datetime
from typing import List, Dict, Any, Optional

from database import (
    get_active_criteria,
    save_rfp_run,
    init_db,
    compute_hash,
    compute_criteria_definition_hash,
    get_cached_document,
    save_cached_document,
    get_cached_scorecard,
    save_cached_scorecard
)
from pdf_extractor import extract_text_from_pdf
from evaluator import evaluate_supplier
from validator import validate_and_normalize_evaluation
from ranker import rank_rfp_batch

def run_agentic_rfp_pipeline(
    supplier_proposals: List[Dict[str, Any]],
    db_path: str = "rfp_evaluation.db",
    use_llm: bool = True,
    api_key: Optional[str] = None,
    model_name: Optional[str] = "gemini-2.5-flash",
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Executes the full 10-step agentic evaluation workflow:
    
    Args:
        supplier_proposals: List of dicts, each with:
            {
                "supplier_name": str,
                "submission_date": str (YYYY-MM-DD),
                "experience_rating": float (0-5),
                "pdf_source": file path or byte stream,
                "filename": Optional[str]
            }
        db_path: SQLite database path
        use_llm: Whether to invoke Gemini LLM API
        api_key: Optional Gemini API Key
        
    Returns:
        dict: Complete RFP run results including metadata, benchmarks, leaderboard,
              detailed scorecards, warnings, and persistence confirmation.
    """
    init_db(db_path)
    rfp_run_id = f"RFP-RUN-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"

    # Step 1: Load active criteria from SQLite
    active_criteria = get_active_criteria(db_path)
    if not active_criteria:
        raise ValueError("No active criteria found in database. Please seed or activate criteria.")

    total_weight = sum(float(c["weight"]) for c in active_criteria)
    crit_def_hash = compute_criteria_definition_hash(active_criteria)
    effective_model = model_name or "gemini-2.5-flash"

    # Step 2-4: Extract text & Evaluate each supplier document with Tier 1 & Tier 2 Caching
    extracted_documents = {}
    validated_evaluations = []
    supplier_metadata_map = {}
    all_warnings = []
    
    api_calls_count = 0
    cache_hits_count = 0
    total_tokens_saved = 0

    for item in supplier_proposals:
        pdf_source = item["pdf_source"]
        provided_name = item.get("supplier_name", "").strip()
        fname = item.get("filename", f"{provided_name or 'proposal'}.pdf")

        # 1. Tier 1 Document Fingerprinting & Extraction Cache
        raw_bytes = item.get("file_bytes")
        if not raw_bytes:
            if isinstance(pdf_source, (bytes, bytearray)):
                raw_bytes = bytes(pdf_source)
            elif isinstance(pdf_source, str) and os.path.exists(pdf_source):
                try:
                    with open(pdf_source, "rb") as f:
                        raw_bytes = f.read()
                except Exception:
                    raw_bytes = pdf_source.encode("utf-8", errors="ignore")
            else:
                raw_bytes = str(pdf_source).encode("utf-8", errors="ignore")

        doc_hash = compute_hash(raw_bytes)

        cached_doc = None if force_refresh else get_cached_document(doc_hash, db_path)
        if cached_doc:
            doc_text = cached_doc["extracted_text"]
            doc_meta = json.loads(cached_doc["extracted_metadata_json"])
            doc_res = {
                "full_text": doc_text,
                "extracted_metadata": doc_meta,
                "filename": fname,
                "extraction_source": "TIER_1_DOC_CACHE_HIT"
            }
        else:
            doc_res = extract_text_from_pdf(pdf_source, filename=fname)
            doc_text = doc_res["full_text"]
            doc_meta = doc_res.get("extracted_metadata", {})
            save_cached_document(
                doc_hash=doc_hash,
                filename=fname,
                file_size_bytes=len(raw_bytes),
                extracted_text=doc_text,
                extracted_metadata=doc_meta,
                db_path=db_path
            )

        # Extract Supplier Metadata from PDF if not provided
        name = provided_name or doc_meta.get("supplier_name") or f"Supplier-{len(extracted_documents) + 1}"
        sub_date = item.get("submission_date") or doc_meta.get("submission_date") or "2026-03-01"
        try:
            exp_rating = float(item["experience_rating"]) if item.get("experience_rating") is not None else float(doc_meta.get("experience_rating", 4.0))
        except (ValueError, TypeError):
            exp_rating = float(doc_meta.get("experience_rating", 4.0))

        supplier_metadata_map[name] = {
            "submission_date": str(sub_date),
            "experience_rating": exp_rating,
            "filename": fname,
            "doc_hash": doc_hash
        }

        extracted_documents[name] = doc_res

        # 2. Tier 2 Qualitative Evaluation Scorecard Cache
        cache_key = compute_hash(f"{doc_hash}_{crit_def_hash}_{effective_model}")
        cached_scorecard, tokens_saved = None, 0
        if not force_refresh:
            cached_scorecard, tokens_saved = get_cached_scorecard(cache_key, db_path)

        if cached_scorecard:
            raw_eval = cached_scorecard
            cache_hits_count += 1
            total_tokens_saved += tokens_saved
            eval_source = "TIER_2_CACHE_HIT (0 Tokens)"
        else:
            raw_eval = evaluate_supplier(
                proposal_text=doc_text,
                active_criteria=active_criteria,
                supplier_name=name,
                use_llm=use_llm,
                api_key=api_key,
                model_name=effective_model
            )
            api_calls_count += 1
            save_cached_scorecard(
                cache_key=cache_key,
                doc_hash=doc_hash,
                criteria_def_hash=crit_def_hash,
                model_name=effective_model,
                supplier_name=name,
                scorecard=raw_eval,
                estimated_prompt_tokens=4500,
                db_path=db_path
            )
            eval_source = "API_CALL"

        # Validation Tool
        val_res = validate_and_normalize_evaluation(
            raw_llm_output=raw_eval,
            active_criteria=active_criteria,
            supplier_name=name
        )
        val_res["evaluation_source"] = eval_source
        val_res["doc_hash"] = doc_hash

        # Collect warnings
        for w in val_res.get("warnings", []):
            all_warnings.append({
                "supplier_name": name,
                "code": w["code"],
                "message": w["message"],
                "criterion_id": w["criterion_id"]
            })

        validated_evaluations.append(val_res)

    # Step 6-8: Deterministic Ranking Tool (Absolute score, Benchmark, Gap, Relative %, PPI, Tie-breaking)
    ranked_suppliers = rank_rfp_batch(
        validated_supplier_evaluations=validated_evaluations,
        supplier_metadata_map=supplier_metadata_map,
        total_active_weight=total_weight
    )

    # Step 9: Persist complete results to SQLite using RFP_RUN_ID
    save_rfp_run(
        rfp_run_id=rfp_run_id,
        status="COMPLETED",
        ranked_suppliers=ranked_suppliers,
        db_path=db_path
    )

    # Step 10: Build final exportable response structure
    run_export = {
        "rfp_run_id": rfp_run_id,
        "created_at": timestamp,
        "status": "COMPLETED",
        "active_criteria": active_criteria,
        "total_active_weight": total_weight,
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
            for s in ranked_suppliers
        ],
        "detailed_scorecards": ranked_suppliers,
        "warnings": all_warnings,
        "token_optimization_metrics": {
            "total_proposals": len(supplier_proposals),
            "cache_hits": cache_hits_count,
            "fresh_api_calls": api_calls_count,
            "estimated_tokens_saved": total_tokens_saved,
            "efficiency_percentage": round((cache_hits_count / len(supplier_proposals)) * 100, 1) if supplier_proposals else 0.0,
            "criteria_def_hash": crit_def_hash,
            "tier_1_doc_caching": True,
            "tier_2_scorecard_caching": True
        },
        "metadata": {
            "supplier_count": len(ranked_suppliers),
            "database": db_path,
            "deterministic_rules_applied": [
                "Absolute Score: Sum((score / max_score) * weight)",
                "Criterion Benchmark: Max observed score across suppliers",
                "Criterion Gap: Supplier score - benchmark",
                "Relative %: (score / benchmark) * 100",
                "PPI: Weighted average of relative percentages",
                "Tie-break Order: 1) PPI desc, 2) Submission date asc, 3) Experience desc, 4) Name asc"
            ]
        }
    }

    return run_export
