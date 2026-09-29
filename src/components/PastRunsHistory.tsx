import React, { useState } from 'react';
import { RFPRun } from '../types';
import { History, Download, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface PastRunsHistoryProps {
  runs: RFPRun[];
  onLoadRunToActive: (run: RFPRun) => void;
  activeRunId: string;
}

export const PastRunsHistory: React.FC<PastRunsHistoryProps> = ({
  runs,
  onLoadRunToActive,
  activeRunId
}) => {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(runs[0]?.rfp_run_id || null);

  const handleExportSingleRun = (run: RFPRun) => {
    const exportPayload = {
      rfp_run_id: run.rfp_run_id,
      created_at: run.created_at,
      status: run.status,
      active_criteria: run.active_criteria,
      total_active_weight: run.total_active_weight,
      leaderboard: run.leaderboard,
      detailed_scorecards: run.detailed_scorecards,
      warnings: run.warnings || [],
      metadata: run.metadata || {
        supplier_count: run.leaderboard.length,
        database: 'rfp_evaluation.db',
        deterministic_rules_applied: [
          'Overall Score: Sum((score / max_score) * weight)',
          'Category Benchmark: Max observed score across proposals',
          'Category Gap: Proposal score - benchmark (<= 0)',
          'Relative %: (score / benchmark) * 100',
          'Overall Match Rating: Weighted average of relative percentages',
          'Tie-break Order: 1) Match % desc, 2) Submission date asc, 3) Experience desc, 4) Name asc'
        ]
      }
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.rfp_run_id}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5.5 shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <History className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span>Past Evaluation Sessions &amp; Saved Records</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Review and compare past evaluation sessions, inspect ranking results, verify tie-break reasons, and download complete records.
            </p>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-100/80 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto font-medium">
            <span>{runs.length} Saved Evaluation Session(s)</span>
          </div>
        </div>
      </div>

      {/* List of Past Runs */}
      <div className="space-y-4">
        {runs.map((run) => {
          const isExpanded = expandedRunId === run.rfp_run_id;
          const isActive = run.rfp_run_id === activeRunId;
          const winner = run.leaderboard && run.leaderboard.length > 0 ? run.leaderboard[0] : null;

          return (
            <div
              key={run.rfp_run_id}
              className={`bg-white dark:bg-slate-900/90 border rounded-xl shadow-2xs overflow-hidden transition-all duration-150 ${
                isActive
                  ? 'border-indigo-500/70 dark:border-indigo-400/70 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Run Card Header */}
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
                    RFP
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                        {run.rfp_run_id}
                      </span>
                      {isActive && (
                        <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                          Currently Active
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                        {run.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Evaluated: {new Date(run.created_at).toLocaleString()}</span>
                      <span>·</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{run.leaderboard.length} Proposal(s)</span>
                      {winner && (
                        <>
                          <span>·</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Winner: 🥇 {winner.supplier_name} ({winner.ppi.toFixed(1)}% match)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportSingleRun(run)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title={`Export ${run.rfp_run_id} as JSON`}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Export Record</span>
                  </button>

                  <button
                    onClick={() => onLoadRunToActive(run)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-default'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-98'
                    }`}
                  >
                    <span>{isActive ? 'Loaded' : 'Open in Detailed View'}</span>
                    {!isActive && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => setExpandedRunId(isExpanded ? null : run.rfp_run_id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    title={isExpanded ? 'Collapse rankings' : 'Expand rankings'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Rankings Table */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Rankings for Session {run.rfp_run_id}
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Selection: 1) Match % → 2) Early Date → 3) Experience → 4) Name
                    </span>
                  </div>

                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
                          <th className="py-2.5 px-3.5 w-16">Rank</th>
                          <th className="py-2.5 px-3.5">Vendor / Proposal</th>
                          <th className="py-2.5 px-3 font-mono">Match Rating (%)</th>
                          <th className="py-2.5 px-3 font-mono">Overall Score (/100)</th>
                          <th className="py-2.5 px-3">Submission Date</th>
                          <th className="py-2.5 px-3">Experience</th>
                          <th className="py-2.5 px-3">Ranking Tie-Break Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                        {run.leaderboard.map((item) => {
                          const isGold = item.final_rank === 1;
                          const isSilver = item.final_rank === 2;
                          const isBronze = item.final_rank === 3;

                          return (
                            <tr
                              key={item.supplier_name}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-2.5 px-3.5 font-bold">
                                {isGold ? '🥇 1' : isSilver ? '🥈 2' : isBronze ? '🥉 3' : `#${item.final_rank}`}
                              </td>
                              <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">
                                {item.supplier_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                {item.ppi.toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {item.absolute_score.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                                {item.submission_date}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                                {item.experience_rating.toFixed(1)} / 5.0
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={item.tie_break_note}>
                                {item.tie_break_note}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
