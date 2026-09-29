export interface Criterion {
  criterion_id: number;
  name: string;
  description: string;
  weight: number;
  max_score: number;
  is_active: number | boolean;
}

export interface CriterionEvaluation {
  criterion_id: number;
  name: string;
  weight: number;
  score: number;
  max_score: number;
  justification: string;
  evidence: string;
  benchmark?: number;
  gap?: number;
  relative_percentage?: number;
}

export interface SupplierResult {
  supplier_name: string;
  submission_date: string;
  experience_rating: number;
  absolute_score: number;
  ppi: number;
  final_rank: number;
  tie_break_note: string;
  criteria: CriterionEvaluation[];
  risks: string[];
  overall_summary: string;
  warnings?: Array<{ code: string; message: string; criterion_id?: number | null }>;
}

export interface RFPRun {
  rfp_run_id: string;
  created_at: string;
  status: string;
  active_criteria: Criterion[];
  total_active_weight: number;
  leaderboard: Array<{
    final_rank: number;
    supplier_name: string;
    absolute_score: number;
    ppi: number;
    submission_date: string;
    experience_rating: number;
    tie_break_note: string;
  }>;
  detailed_scorecards: SupplierResult[];
  warnings: Array<{
    supplier_name: string;
    code: string;
    message: string;
    criterion_id?: number | null;
  }>;
  metadata?: {
    supplier_count: number;
    database: string;
    deterministic_rules_applied: string[];
  };
}
