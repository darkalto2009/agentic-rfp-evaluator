"""
validator.py
-------------
Validation Tool: enforces the expected JSON schema coming back from the
Evaluation Agent (LLM), fills in any missing criteria with a 0 score +
warning, clips out-of-range scores, and records every normalization it had
to perform so the UI can show full audit warnings.

This module is deliberately LLM-free and deterministic: given the same raw
JSON and the same active criteria, it always produces the same normalized
result and the same warnings.

If `pydantic` is installed, it is used for the strict low-level field typing
(defense against wrong types coming back from the LLM). If it is not
installed, an equivalent hand-rolled validator is used instead, so this
module works either way.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

try:
    from pydantic import BaseModel, ValidationError, field_validator

    _HAS_PYDANTIC = True

    class _CriterionScoreModel(BaseModel):
        criterion_id: int
        score: float = 0.0
        max_score: float = 10.0
        justification: str = ""
        evidence: str = ""

        @field_validator("score", "max_score", mode="before")
        @classmethod
        def _coerce_numeric(cls, v):
            try:
                return float(v)
            except (TypeError, ValueError):
                return 0.0

    class _LLMResultModel(BaseModel):
        supplier_name: str = "Unknown Supplier"
        criteria: list[_CriterionScoreModel] = []
        risks: list[str] = []
        overall_summary: str = ""

except ImportError:  # pragma: no cover - pydantic optional
    _HAS_PYDANTIC = False
    BaseModel = object
    ValidationError = Exception


@dataclass
class ValidatedCriterionScore:
    criterion_id: int
    name: str
    weight: float
    score: float
    max_score: float
    justification: str
    evidence: str


@dataclass
class ValidationResult:
    supplier_name: str
    criteria: list[ValidatedCriterionScore]
    risks: list[str]
    overall_summary: str
    warnings: list[str] = field(default_factory=list)
    raw_llm_json: Optional[dict[str, Any]] = None


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _coerce_with_pydantic(raw: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Run the raw dict through pydantic for type coercion; return dict + warnings."""
    warnings: list[str] = []
    try:
        model = _LLMResultModel.model_validate(raw)
        return model.model_dump(), warnings
    except ValidationError as e:
        warnings.append(f"LLM JSON failed strict schema validation, applying best-effort recovery: {e}")
        # Best-effort manual recovery below (same path as the no-pydantic branch)
        return _coerce_manual(raw)[0], warnings


def _coerce_manual(raw: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    out: dict[str, Any] = {
        "supplier_name": str(raw.get("supplier_name") or "Unknown Supplier"),
        "risks": raw.get("risks") if isinstance(raw.get("risks"), list) else [],
        "overall_summary": str(raw.get("overall_summary") or ""),
        "criteria": [],
    }
    criteria_raw = raw.get("criteria")
    if not isinstance(criteria_raw, list):
        warnings.append("`criteria` field missing or malformed in LLM output; treating as empty list.")
        criteria_raw = []

    for item in criteria_raw:
        if not isinstance(item, dict):
            warnings.append(f"Skipped malformed criterion entry: {item!r}")
            continue
        cid = item.get("criterion_id")
        try:
            cid = int(cid)
        except (TypeError, ValueError):
            warnings.append(f"Skipped criterion with non-integer criterion_id: {item.get('criterion_id')!r}")
            continue
        out["criteria"].append(
            {
                "criterion_id": cid,
                "score": _safe_float(item.get("score"), 0.0),
                "max_score": _safe_float(item.get("max_score"), 10.0),
                "justification": str(item.get("justification") or ""),
                "evidence": str(item.get("evidence") or ""),
            }
        )
    return out, warnings


def validate_llm_result(
    raw_llm_json: dict[str, Any],
    active_criteria: list[dict[str, Any]],
    expected_supplier_name: Optional[str] = None,
) -> ValidationResult:
    """
    Normalize + validate a single supplier's raw LLM JSON output against the
    currently active evaluation criteria.

    Guarantees on the returned ValidationResult:
      * Exactly one ValidatedCriterionScore per active criterion (missing
        criteria are filled with score=0.0 and a warning).
      * 0 <= score <= max_score for every criterion (out-of-range values are
        clipped, with a warning).
      * max_score always matches the criterion's configured max_score (the
        DB is the source of truth, not whatever the LLM echoed back).
      * Unknown criterion_ids returned by the LLM (not in active_criteria)
        are dropped, with a warning.
    """
    warnings: list[str] = []

    if not isinstance(raw_llm_json, dict):
        warnings.append("LLM response was not a JSON object at all; using an all-zero fallback result.")
        raw_llm_json = {}

    if _HAS_PYDANTIC:
        coerced, w = _coerce_with_pydantic(raw_llm_json)
    else:
        coerced, w = _coerce_manual(raw_llm_json)
    warnings.extend(w)

    llm_scores_by_id = {c["criterion_id"]: c for c in coerced.get("criteria", [])}
    known_ids = {c["criterion_id"] for c in active_criteria}

    # Warn about any criterion_ids the LLM invented that we don't track.
    for cid in llm_scores_by_id:
        if cid not in known_ids:
            warnings.append(
                f"LLM returned a score for unknown criterion_id={cid}; ignored (not an active criterion)."
            )

    validated_criteria: list[ValidatedCriterionScore] = []
    for crit in active_criteria:
        cid = crit["criterion_id"]
        db_max = float(crit["max_score"])
        entry = llm_scores_by_id.get(cid)

        if entry is None:
            validated_criteria.append(
                ValidatedCriterionScore(
                    criterion_id=cid,
                    name=crit["name"],
                    weight=float(crit["weight"]),
                    score=0.0,
                    max_score=db_max,
                    justification="[AUTO-FILLED] No score returned by the LLM for this criterion.",
                    evidence="",
                )
            )
            warnings.append(
                f"Missing score for criterion '{crit['name']}' (id={cid}); auto-filled with 0.0."
            )
            continue

        raw_score = _safe_float(entry.get("score"), 0.0)
        clipped_score = min(max(raw_score, 0.0), db_max)
        if clipped_score != raw_score:
            warnings.append(
                f"Score for '{crit['name']}' out of range ({raw_score}); clipped to "
                f"[0, {db_max}] -> {clipped_score}."
            )

        validated_criteria.append(
            ValidatedCriterionScore(
                criterion_id=cid,
                name=crit["name"],
                weight=float(crit["weight"]),
                score=clipped_score,
                max_score=db_max,  # DB is the source of truth for max_score
                justification=str(entry.get("justification") or ""),
                evidence=str(entry.get("evidence") or ""),
            )
        )

    supplier_name = expected_supplier_name or coerced.get("supplier_name") or "Unknown Supplier"
    if expected_supplier_name and coerced.get("supplier_name") and \
            expected_supplier_name.strip().lower() != str(coerced.get("supplier_name")).strip().lower():
        warnings.append(
            f"LLM-reported supplier name '{coerced.get('supplier_name')}' differs from the "
            f"uploaded supplier name '{expected_supplier_name}'; using the uploaded name as authoritative."
        )

    return ValidationResult(
        supplier_name=supplier_name,
        criteria=validated_criteria,
        risks=[str(r) for r in coerced.get("risks", [])],
        overall_summary=coerced.get("overall_summary", ""),
        warnings=warnings,
        raw_llm_json=raw_llm_json,
    )


if __name__ == "__main__":
    # Tiny smoke test
    demo_criteria = [
        {"criterion_id": 1, "name": "Technical Capability", "weight": 30.0, "max_score": 10.0},
        {"criterion_id": 2, "name": "Implementation Plan", "weight": 20.0, "max_score": 10.0},
    ]
    demo_raw = {
        "supplier_name": "Apex Systems",
        "criteria": [
            {"criterion_id": 1, "score": 15, "max_score": 10, "justification": "Great", "evidence": "p2"},
            {"criterion_id": 99, "score": 5, "max_score": 10, "justification": "Unknown crit", "evidence": ""},
        ],
        "risks": ["Vendor lock-in"],
        "overall_summary": "Strong technical fit.",
    }
    result = validate_llm_result(demo_raw, demo_criteria, expected_supplier_name="Apex Systems")
    for c in result.criteria:
        print(c)
    print("Warnings:")
    for w in result.warnings:
        print(" -", w)
