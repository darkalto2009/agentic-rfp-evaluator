"""
ranker.py: Deterministic Python Scoring, Benchmarking, and Tie-Breaking Tool.
STRICT RULE: The LLM NEVER computes scores, PPI, or ranks.
Pure Python applies transparent arithmetic, peer benchmarks, criterion gaps, and 4-tier tie-breaks.
"""

from typing import List, Dict, Any, Tuple
import datetime

def calculate_absolute_score(criteria_evaluations: List[Dict[str, Any]]) -> float:
    """
    Formula 1: Absolute Weighted Score
    Sum of ((criterion score / maximum score) * criterion weight)
    """
    total_score = 0.0
    for c in criteria_evaluations:
        score = float(c.get("score", 0.0))
        max_score = float(c.get("max_score", 10.0))
        weight = float(c.get("weight", 0.0))
        if max_score > 0:
            total_score += (score / max_score) * weight
    return round(total_score, 2)


def compute_peer_benchmarks(all_supplier_evaluations: List[Dict[str, Any]]) -> Dict[int, float]:
    """
    Formula 2: Criterion Benchmark
    Highest valid score observed for that criterion across all suppliers.
    """
    benchmarks: Dict[int, float] = {}
    for supp in all_supplier_evaluations:
        for c in supp.get("criteria", []):
            cid = int(c["criterion_id"])
            score = float(c.get("score", 0.0))
            if cid not in benchmarks or score > benchmarks[cid]:
                benchmarks[cid] = score
    return benchmarks


def enrich_supplier_with_peer_metrics(
    supplier_eval: Dict[str, Any],
    benchmarks: Dict[int, float],
    total_active_weight: float = 100.0
) -> Dict[str, Any]:
    """
    Computes Criterion Gap, Relative Performance %, and Peer Performance Index (PPI).
    
    Formula 3: Criterion Gap = Score - Benchmark (<= 0)
    Formula 4: Relative Performance % = (Score / Benchmark) * 100 with zero division defense
    Formula 5: Peer Performance Index (PPI) = Weighted average of relative performance %
    """
    enriched_criteria = []
    weighted_ppi_sum = 0.0

    weight_normalizer = total_active_weight if total_active_weight > 0 else 100.0

    for c in supplier_eval.get("criteria", []):
        cid = int(c["criterion_id"])
        score = float(c.get("score", 0.0))
        weight = float(c.get("weight", 0.0))
        benchmark = float(benchmarks.get(cid, 0.0))

        # Criterion Gap: Supplier score - benchmark score (0 for leader, else negative)
        gap = round(score - benchmark, 2)

        # Relative Performance %: (score / benchmark) * 100
        # Safe handling when benchmark is zero
        if benchmark > 0:
            rel_perf = (score / benchmark) * 100.0
        else:
            rel_perf = 100.0 if score == 0.0 else 0.0
        rel_perf = round(rel_perf, 2)

        # Contribution to PPI: rel_perf * (weight / total_weight)
        weighted_ppi_sum += rel_perf * (weight / weight_normalizer)

        c_copy = dict(c)
        c_copy["benchmark"] = benchmark
        c_copy["gap"] = gap
        c_copy["relative_percentage"] = rel_perf
        enriched_criteria.append(c_copy)

    final_ppi = round(weighted_ppi_sum, 2)
    abs_score = calculate_absolute_score(enriched_criteria)

    result = dict(supplier_eval)
    result["criteria"] = enriched_criteria
    result["absolute_score"] = abs_score
    result["ppi"] = final_ppi
    return result


def apply_deterministic_ranking(suppliers_with_metadata: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Applies the mandatory 4-level deterministic tie-break sort:
    1) Higher PPI first (descending)
    2) Earlier submission date (ascending - ISO format YYYY-MM-DD)
    3) Higher historical experience rating (descending)
    4) Supplier name in alphabetical ascending order (case-insensitive)
    
    Assigns sequential rank: 1, 2, 3... only after this stable sort.
    """
    def parse_date(date_str: str) -> str:
        # Standardize date string for ascending comparison
        try:
            return str(datetime.date.fromisoformat(str(date_str).strip()))
        except Exception:
            return str(date_str).strip()

    def sort_key(item: Dict[str, Any]) -> Tuple[float, str, float, str]:
        ppi_val = float(item.get("ppi", 0.0))
        sub_date = parse_date(item.get("submission_date", "9999-12-31"))
        exp_rating = float(item.get("experience_rating", 0.0))
        supp_name = str(item.get("supplier_name", "")).strip().lower()

        # (-ppi, date ascending, -exp_rating, name ascending)
        return (-ppi_val, sub_date, -exp_rating, supp_name)

    sorted_suppliers = sorted(suppliers_with_metadata, key=sort_key)

    # Assign sequential ranks and generate tie-break explanations
    ranked_list = []
    for idx, supp in enumerate(sorted_suppliers, start=1):
        supp_entry = dict(supp)
        supp_entry["final_rank"] = idx

        # Determine tie-break explanation against peer directly above or below
        notes = []
        if idx > 1:
            prev = sorted_suppliers[idx - 2]
            if abs(float(supp["ppi"]) - float(prev["ppi"])) < 0.001:
                # Tied on PPI
                if str(supp["submission_date"]) == str(prev["submission_date"]):
                    if abs(float(supp["experience_rating"]) - float(prev["experience_rating"])) < 0.001:
                        notes.append(f"Tied with {prev['supplier_name']} on PPI, Date, & Experience; ordered alphabetically.")
                    else:
                        notes.append(f"Tied with {prev['supplier_name']} on PPI & Date; differentiated by Experience Rating ({supp['experience_rating']} vs {prev['experience_rating']}).")
                else:
                    notes.append(f"Tied with {prev['supplier_name']} on PPI ({supp['ppi']}); resolved by Submission Date ({supp['submission_date']} vs {prev['submission_date']}).")
        
        supp_entry["tie_break_note"] = " ".join(notes) if notes else "Rank assigned by primary PPI score."
        ranked_list.append(supp_entry)

    return ranked_list


def rank_rfp_batch(
    validated_supplier_evaluations: List[Dict[str, Any]],
    supplier_metadata_map: Dict[str, Dict[str, Any]],
    total_active_weight: float = 100.0
) -> List[Dict[str, Any]]:
    """
    End-to-end ranking coordinator:
    1. Computes peer benchmarks across all suppliers
    2. Computes criterion gaps and relative percentages
    3. Calculates PPI and absolute score
    4. Attaches submission date and experience rating
    5. Applies deterministic tie-break sorting and assigns final rank
    """
    benchmarks = compute_peer_benchmarks(validated_supplier_evaluations)

    enriched_list = []
    for eval_item in validated_supplier_evaluations:
        s_name = eval_item["supplier_name"]
        meta = supplier_metadata_map.get(s_name, {})
        sub_date = meta.get("submission_date", "2026-03-01")
        exp_rating = float(meta.get("experience_rating", 4.0))

        enriched = enrich_supplier_with_peer_metrics(
            eval_item, benchmarks, total_active_weight=total_active_weight
        )
        enriched["submission_date"] = sub_date
        enriched["experience_rating"] = exp_rating
        enriched_list.append(enriched)

    final_ranked = apply_deterministic_ranking(enriched_list)
    return final_ranked
