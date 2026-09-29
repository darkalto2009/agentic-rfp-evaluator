import { Criterion, SupplierResult } from '../types';

export function calculateAbsoluteScore(criteria: { score: number; max_score: number; weight: number }[]): number {
  let total = 0;
  for (const c of criteria) {
    if (c.max_score > 0) {
      total += (c.score / c.max_score) * c.weight;
    }
  }
  return Math.round(total * 100) / 100;
}

export function computeBenchmarks(suppliers: { criteria: { criterion_id: number; score: number }[] }[]): Record<number, number> {
  const benchmarks: Record<number, number> = {};
  for (const supp of suppliers) {
    for (const c of supp.criteria) {
      if (benchmarks[c.criterion_id] === undefined || c.score > benchmarks[c.criterion_id]) {
        benchmarks[c.criterion_id] = c.score;
      }
    }
  }
  return benchmarks;
}

export function recomputeSupplierMetrics(
  suppliers: SupplierResult[],
  activeCriteria: Criterion[]
): SupplierResult[] {
  const activeIds = new Set(activeCriteria.filter(c => c.is_active).map(c => c.criterion_id));
  const criteriaMap = new Map(activeCriteria.map(c => [c.criterion_id, c]));
  const totalWeight = activeCriteria.filter(c => c.is_active).reduce((sum, c) => sum + c.weight, 0) || 100;

  // 1. Filter criteria to active and update weight/max_score from master criteria
  const prepared = suppliers.map(supp => {
    const matchedCriteria = supp.criteria
      .filter(c => activeIds.has(c.criterion_id))
      .map(c => {
        const master = criteriaMap.get(c.criterion_id);
        const weight = master ? master.weight : c.weight;
        const maxScore = master ? master.max_score : c.max_score;
        const score = Math.min(Math.max(0, c.score), maxScore);
        return {
          ...c,
          weight,
          max_score: maxScore,
          score
        };
      });

    return {
      ...supp,
      criteria: matchedCriteria
    };
  });

  // 2. Compute Benchmarks across all suppliers
  const benchmarks = computeBenchmarks(prepared);

  // 3. Compute Gap, Relative %, and PPI
  const enriched = prepared.map(supp => {
    let ppiSum = 0;
    const enrichedCriteria = supp.criteria.map(c => {
      const benchmark = benchmarks[c.criterion_id] !== undefined ? benchmarks[c.criterion_id] : c.score;
      const gap = Math.round((c.score - benchmark) * 100) / 100;
      let relPct = 0;
      if (benchmark > 0) {
        relPct = (c.score / benchmark) * 100;
      } else {
        relPct = c.score === 0 ? 100 : 0;
      }
      relPct = Math.round(relPct * 100) / 100;

      ppiSum += relPct * (c.weight / totalWeight);

      return {
        ...c,
        benchmark,
        gap,
        relative_percentage: relPct
      };
    });

    const absScore = calculateAbsoluteScore(enrichedCriteria);
    const ppi = Math.round(ppiSum * 100) / 100;

    return {
      ...supp,
      criteria: enrichedCriteria,
      absolute_score: absScore,
      ppi
    };
  });

  // 4. Deterministic 4-tier tie-break sorting:
  // 1) Higher PPI (descending)
  // 2) Earlier Submission Date (ascending)
  // 3) Higher Experience Rating (descending)
  // 4) Supplier Name (alphabetical ascending)
  enriched.sort((a, b) => {
    if (Math.abs(b.ppi - a.ppi) > 0.001) {
      return b.ppi - a.ppi;
    }
    if (a.submission_date !== b.submission_date) {
      return a.submission_date.localeCompare(b.submission_date);
    }
    if (Math.abs(b.experience_rating - a.experience_rating) > 0.001) {
      return b.experience_rating - a.experience_rating;
    }
    return a.supplier_name.localeCompare(b.supplier_name);
  });

  // Assign sequential ranks 1, 2, 3... and tie-break notes
  return enriched.map((supp, index) => {
    const finalRank = index + 1;
    let tieNote = "Rank assigned by primary PPI score.";
    if (index > 0) {
      const prev = enriched[index - 1];
      if (Math.abs(supp.ppi - prev.ppi) < 0.001) {
        if (supp.submission_date === prev.submission_date) {
          if (Math.abs(supp.experience_rating - prev.experience_rating) < 0.001) {
            tieNote = `Tied with ${prev.supplier_name} on PPI, Date, & Exp; ordered alphabetically.`;
          } else {
            tieNote = `Tied on PPI & Date; resolved by Experience (${supp.experience_rating} vs ${prev.experience_rating}).`;
          }
        } else {
          tieNote = `Tied on PPI (${supp.ppi}%); resolved by Submission Date (${supp.submission_date} vs ${prev.submission_date}).`;
        }
      }
    }

    return {
      ...supp,
      final_rank: finalRank,
      tie_break_note: tieNote
    };
  });
}
