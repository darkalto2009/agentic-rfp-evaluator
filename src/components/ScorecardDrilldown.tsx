import React from 'react';
import { SupplierResult } from '../types';
import { Quote, AlertTriangle, Star, Calendar } from 'lucide-react';

interface ScorecardDrilldownProps {
  supplier: SupplierResult;
  allSuppliers: SupplierResult[];
  onSelectSupplier: (name: string) => void;
}

export const ScorecardDrilldown: React.FC<ScorecardDrilldownProps> = ({
  supplier,
  allSuppliers,
  onSelectSupplier
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs p-6 space-y-6 transition-colors">
      {/* Header and Proposal Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {supplier.supplier_name}
            </h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              Rank #{supplier.final_rank}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Submitted: {supplier.submission_date}</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Experience: {supplier.experience_rating.toFixed(1)}/5.0</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">View Proposal:</label>
          <select
            value={supplier.supplier_name}
            onChange={(e) => onSelectSupplier(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all cursor-pointer"
          >
            {allSuppliers.map((s) => (
              <option key={s.supplier_name} value={s.supplier_name}>
                Rank #{s.final_rank}: {s.supplier_name} ({s.ppi.toFixed(1)}% match)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overall Match Rating
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
            {supplier.ppi.toFixed(2)}%
          </div>
        </div>
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Evaluation Score
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
            {supplier.absolute_score.toFixed(1)} / 100
          </div>
        </div>
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Submission Date
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 font-mono">
            {supplier.submission_date}
          </div>
        </div>
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tie-Break Status
          </div>
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1 truncate" title={supplier.tie_break_note}>
            {supplier.tie_break_note}
          </div>
        </div>
      </div>

      {/* Synthesis & Risks */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Executive Summary
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {supplier.overall_summary}
          </p>
        </div>

        {supplier.risks && supplier.risks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Potential Risks &amp; Considerations ({supplier.risks.length})</span>
            </h4>
            <div className="space-y-1.5">
              {supplier.risks.map((risk, i) => (
                <div key={i} className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-3.5 py-2.5 rounded-lg">
                  • {risk}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Criteria Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Category Breakdown &amp; Benchmark Comparison
          </h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Gap vs Category Leader (≤ 0)
          </span>
        </div>

        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3 w-16 text-center">Weight</th>
                <th className="py-2.5 px-3 w-20 text-center">Score</th>
                <th className="py-2.5 px-3 w-24 text-center">Leader Score</th>
                <th className="py-2.5 px-3 w-20 text-center">Gap</th>
                <th className="py-2.5 px-3 w-24 text-center">Relative %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {supplier.criteria.map((c) => {
                const isLeader = c.gap === 0;
                return (
                  <tr key={c.criterion_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3.5 font-sans font-medium text-slate-900 dark:text-white">
                      <div>{c.name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                        Max: {c.max_score} pts
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                      {c.weight}%
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {c.score.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                      {c.benchmark !== undefined ? c.benchmark.toFixed(1) : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isLeader
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {isLeader ? '0.0 (Lead)' : `${c.gap !== undefined ? c.gap.toFixed(1) : '-'}`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {c.relative_percentage !== undefined ? `${c.relative_percentage.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified Document Citations & Evaluator Notes */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Quote className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Verified Document Citations &amp; Evaluator Notes</span>
        </h4>

        <div className="space-y-3">
          {supplier.criteria.map((c) => (
            <div key={c.criterion_id} className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  {c.name} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal font-mono">(Weight: {c.weight}%)</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md shadow-2xs">
                  Score: {c.score} / {c.max_score}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Verified Citation from Proposal (PDF):
                </span>
                <blockquote className="text-xs text-slate-800 dark:text-slate-200 italic bg-white dark:bg-slate-800/80 p-3 rounded-lg border-l-3 border-indigo-500 dark:border-indigo-400 border-r border-t border-b border-slate-200 dark:border-slate-700 leading-relaxed shadow-2xs">
                  "{c.evidence}"
                </blockquote>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Evaluator Scoring Justification:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {c.justification}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
