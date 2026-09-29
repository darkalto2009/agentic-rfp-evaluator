"""
validator.py: Schema Validation, Score Clipping, and Normalization Tool.
Validates LLM outputs against active criteria, fills missing criteria with 0.0,
clips out-of-range scores [0, max_score], converts types, and records audit warnings.
"""

from typing import List, Dict, Any, Optional

class EvaluationWarning:
    def __init__(self, code: str, message: str, criterion_id: Optional[int] = None):
        self.code = code
        self.message = message
        self.criterion_id = criterion_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "criterion_id": self.criterion_id
        }


def validate_and_normalize_evaluation(
    raw_llm_output: Dict[str, Any],
    active_criteria: List[Dict[str, Any]],
    supplier_name: str
) -> Dict[str, Any]:
    """
    Validates and normalizes the LLM evaluation dictionary.
    
    Args:
        raw_llm_output: Raw JSON parsed output from LLM
        active_criteria: List of active criteria dicts from SQLite (criterion_id, name, weight, max_score)
        supplier_name: Name of the supplier being evaluated
        
    Returns:
        dict: Normalized evaluation with validated criteria list, risks, summary, and audit warnings.
    """
    warnings: List[Dict[str, Any]] = []

    # 1. Validate top-level fields
    normalized_supplier_name = raw_llm_output.get("supplier_name", supplier_name) or supplier_name
    risks = raw_llm_output.get("risks", [])
    if not isinstance(risks, list):
        risks = [str(risks)]
        warnings.append({
            "code": "RISKS_TYPE_CORRECTED",
            "message": "Field 'risks' was not a list; converted to single item list.",
            "criterion_id": None
        })

    overall_summary = raw_llm_output.get("overall_summary", "Evaluation completed.")
    if not isinstance(overall_summary, str):
        overall_summary = str(overall_summary)

    # 2. Index raw criteria responses
    raw_criteria_list = raw_llm_output.get("criteria", [])
    if not isinstance(raw_criteria_list, list):
        warnings.append({
            "code": "CRITERIA_TYPE_CORRECTED",
            "message": "Field 'criteria' was not a list; re-initialized to empty list.",
            "criterion_id": None
        })
        raw_criteria_list = []

    # Map by criterion_id and also by name lowercase for flexible matching
    raw_by_id: Dict[int, Dict[str, Any]] = {}
    raw_by_name: Dict[str, Dict[str, Any]] = {}

    for c in raw_criteria_list:
        if isinstance(c, dict):
            c_id = c.get("criterion_id")
            if c_id is not None:
                try:
                    c_id_int = int(c_id)
                    raw_by_id[c_id_int] = c
                except (ValueError, TypeError):
                    pass
            c_name = c.get("name") or c.get("criterion_name")
            if c_name and isinstance(c_name, str):
                raw_by_name[c_name.strip().lower()] = c

    # 3. Process every active criterion from database
    validated_criteria = []

    for active_c in active_criteria:
        c_id = int(active_c["criterion_id"])
        c_name = active_c["name"]
        expected_max = float(active_c.get("max_score", 10.0))
        weight = float(active_c.get("weight", 0.0))

        # Check if present by ID or name
        matched_raw = raw_by_id.get(c_id)
        if not matched_raw:
            matched_raw = raw_by_name.get(c_name.strip().lower())

        if not matched_raw:
            # Case 1: Missing Criterion -> Auto fill with 0.0
            warnings.append({
                "code": "MISSING_CRITERION_FILLED",
                "message": f"Criterion '{c_name}' (ID: {c_id}) was missing from LLM response. Auto-filled with 0.0.",
                "criterion_id": c_id
            })
            validated_criteria.append({
                "criterion_id": c_id,
                "name": c_name,
                "weight": weight,
                "score": 0.0,
                "max_score": expected_max,
                "justification": f"Criterion not evaluated or omitted by LLM.",
                "evidence": "No supporting evidence provided in proposal document."
            })
            continue

        # Extract and parse score
        raw_score = matched_raw.get("score")
        try:
            parsed_score = float(raw_score)
        except (ValueError, TypeError):
            warnings.append({
                "code": "INVALID_SCORE_VALUE",
                "message": f"Non-numeric score '{raw_score}' for '{c_name}' (ID: {c_id}). Defaulted to 0.0.",
                "criterion_id": c_id
            })
            parsed_score = 0.0

        # Score Clipping Check [0, max_score]
        final_score = parsed_score
        if parsed_score > expected_max:
            warnings.append({
                "code": "SCORE_EXCEEDED_MAX_CLIPPED",
                "message": f"Score {parsed_score} for '{c_name}' exceeded maximum {expected_max}. Clipped to {expected_max}.",
                "criterion_id": c_id
            })
            final_score = expected_max
        elif parsed_score < 0.0:
            warnings.append({
                "code": "SCORE_NEGATIVE_CLIPPED",
                "message": f"Score {parsed_score} for '{c_name}' was negative. Clipped to 0.0.",
                "criterion_id": c_id
            })
            final_score = 0.0

        justification = str(matched_raw.get("justification", "No justification provided."))
        evidence = str(matched_raw.get("evidence", "No explicit quote provided."))

        validated_criteria.append({
            "criterion_id": c_id,
            "name": c_name,
            "weight": weight,
            "score": round(final_score, 2),
            "max_score": expected_max,
            "justification": justification,
            "evidence": evidence
        })

    return {
        "supplier_name": normalized_supplier_name,
        "criteria": validated_criteria,
        "risks": risks,
        "overall_summary": overall_summary,
        "warnings": warnings,
        "is_valid": True
    }


# Optional Pydantic schemas for environments with pydantic installed
try:
    from pydantic import BaseModel, Field

    class CriterionScoreSchema(BaseModel):
        criterion_id: int
        score: float
        max_score: float = 10.0
        justification: str
        evidence: str

    class LLMProposalOutputSchema(BaseModel):
        supplier_name: str
        criteria: List[CriterionScoreSchema]
        risks: List[str] = Field(default_factory=list)
        overall_summary: str = ""

except ImportError:
    pass
