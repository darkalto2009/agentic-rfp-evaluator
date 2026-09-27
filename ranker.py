"""
ranker.py
----------
Ranking Tool: PURE deterministic Python. No LLM calls happen here, and none
should ever be added — this module is the arithmetic/ranking source of
truth for the whole system, per the "strict LLM / math isolation" rule.

Given a list of already-validated supplier scorecards, this module computes:
  1. Absolute weighted score per supplier
  2. Per-criterion benchmark (best score observed for that criterion)
  3. Per-criterion gap (supplier score - benchmark, <= 0)
  4. Per-criterion relative performance % (safe against a zero benchmark)
  5. Peer Performance Index (PPI) per supplier
  6. Final rank, using the mandatory 4-step tie-break order

The same inputs always produce the same outputs (no randomness, no
wall-clock dependence in the math itself).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


@dataclass
class SupplierScorecard:
    """Input to the ranker: one supplier's validated criterion scores + metadata."""
    supplier_name: str
    submission_date: str  # ISO "YYYY-MM-DD"
    experience_rating: float
    # criterion_id -> {"score": float, "weight": float, "max_score": float, "name": str}
    criteria_scores: dict[int, dict[str, Any]]
    warnings: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    overall_summary: str = ""


@dataclass
class RankedSupplierResult:
    supplier_name: str
    submission_date: str
    experience_rating: float
    absolute_score: float
    ppi: float
    final_rank: int
    criterion_breakdown: list[dict[str, Any]]  # per-criterion: score, weight, benchmark, gap, relative_pct
    tie_break_trace: list[str]
    warnings: list[str]
    risks: list[str]
    overall_summary: str


def compute_absolute_score(criteria_scores: dict[int, dict[str, Any]]) -> float:
    """
    Absolute Weighted Score = sum( (criterion_score / max_score) * criterion_weight )
    Weight is expressed in percentage points (e.g. 30.0 for 30%), so the
    result is naturally on a 0-100 scale when weights sum to 100.
    """
    total = 0.0
    for c in criteria_scores.values():
        max_score = c["max_score"] if c["max_score"] else 1e-9  # zero-division guard
        total += (c["score"] / max_score) * c["weight"]
    return round(total, 4)


def compute_benchmarks(scorecards: list[SupplierScorecard]) -> dict[int, float]:
    """Criterion Benchmark = max score observed for that criterion across all suppliers."""
    benchmarks: dict[int, float] = {}
    for sc in scorecards:
        for cid, c in sc.criteria_scores.items():
            benchmarks[cid] = max(benchmarks.get(cid, float("-inf")), c["score"])
    return {cid: (v if v != float("-inf") else 0.0) for cid, v in benchmarks.items()}


def compute_relative_performance(score: float, benchmark: float) -> float:
    """
    Relative Performance % =
        (score / benchmark) * 100          if benchmark > 0
        100.0                              if benchmark == 0 AND score == 0
        0.0                                if benchmark == 0 AND score > 0 (defensive; should not
                                            occur since benchmark is the max observed score)
    """
    if benchmark > 0:
        return round((score / benchmark) * 100.0, 4)
    if benchmark == 0 and score == 0:
        return 100.0
    return 0.0  # defensive fallback, not expected to trigger in practice


def compute_ppi(criterion_breakdown: list[dict[str, Any]]) -> float:
    """PPI = sum( relative_performance_pct * (weight / 100) )"""
    total = 0.0
    for row in criterion_breakdown:
        total += row["relative_pct"] * (row["weight"] / 100.0)
    return round(total, 4)


def _parse_iso_date(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        # Unparseable dates sort last (treated as "latest possible")
        return date.max


def tie_break_key(result: RankedSupplierResult) -> tuple:
    """
    Mandatory tie-break order (all applied together as one composite sort key):
      1. Higher PPI                       -> descending
      2. Earlier submission date          -> ascending
      3. Higher historical experience     -> descending
      4. Supplier name                    -> ascending (alphabetical)
    """
    return (
        -result.ppi,
        _parse_iso_date(result.submission_date),
        -result.experience_rating,
        result.supplier_name.strip().lower(),
    )


def rank_suppliers(scorecards: list[SupplierScorecard]) -> list[RankedSupplierResult]:
    """
    Full deterministic pipeline: score -> benchmark -> gap/relative% -> PPI -> tie-break -> rank.
    """
    if not scorecards:
        return []

    benchmarks = compute_benchmarks(scorecards)
    interim: list[RankedSupplierResult] = []

    for sc in scorecards:
        absolute_score = compute_absolute_score(sc.criteria_scores)

        breakdown = []
        for cid, c in sorted(sc.criteria_scores.items()):
            benchmark = benchmarks.get(cid, 0.0)
            gap = round(c["score"] - benchmark, 4)  # <= 0, 0 for the benchmark leader
            relative_pct = compute_relative_performance(c["score"], benchmark)
            breakdown.append(
                {
                    "criterion_id": cid,
                    "name": c["name"],
                    "weight": c["weight"],
                    "score": c["score"],
                    "max_score": c["max_score"],
                    "benchmark": benchmark,
                    "gap": gap,
                    "relative_pct": relative_pct,
                }
            )

        ppi = compute_ppi(breakdown)

        interim.append(
            RankedSupplierResult(
                supplier_name=sc.supplier_name,
                submission_date=sc.submission_date,
                experience_rating=sc.experience_rating,
                absolute_score=absolute_score,
                ppi=ppi,
                final_rank=-1,  # assigned after sort
                criterion_breakdown=breakdown,
                tie_break_trace=[],
                warnings=sc.warnings,
                risks=sc.risks,
                overall_summary=sc.overall_summary,
            )
        )

    # Stable sort using the full composite tie-break key.
    interim.sort(key=tie_break_key)

    # Assign ranks + a human-readable trace of why each supplier landed where it did.
    for idx, result in enumerate(interim, start=1):
        result.final_rank = idx

    for i, result in enumerate(interim):
        trace = [f"PPI={result.ppi:.2f}"]
        if i > 0:
            prev = interim[i - 1]
            if prev.ppi == result.ppi:
                trace.append(f"tied on PPI with '{prev.supplier_name}' -> compared submission_date")
                if prev.submission_date == result.submission_date:
                    trace.append("tied on submission_date -> compared experience_rating")
                    if prev.experience_rating == result.experience_rating:
                        trace.append("tied on experience_rating -> compared supplier name alphabetically")
        result.tie_break_trace = trace

    return interim


if __name__ == "__main__":
    # Deterministic self-test with a designed tie on PPI to exercise tie-breaks.
    demo = [
        SupplierScorecard(
            supplier_name="Apex Systems",
            submission_date="2026-03-01",
            experience_rating=4.8,
            criteria_scores={
                1: {"score": 9.0, "weight": 30.0, "max_score": 10.0, "name": "Technical Capability"},
                2: {"score": 7.0, "weight": 20.0, "max_score": 10.0, "name": "Implementation Plan"},
            },
        ),
        SupplierScorecard(
            supplier_name="BrightPath Tech",
            submission_date="2026-03-02",
            experience_rating=3.5,
            criteria_scores={
                1: {"score": 6.0, "weight": 30.0, "max_score": 10.0, "name": "Technical Capability"},
                2: {"score": 9.0, "weight": 20.0, "max_score": 10.0, "name": "Implementation Plan"},
            },
        ),
    ]
    ranked = rank_suppliers(demo)
    for r in ranked:
        print(f"#{r.final_rank} {r.supplier_name}: abs={r.absolute_score}, ppi={r.ppi}")
