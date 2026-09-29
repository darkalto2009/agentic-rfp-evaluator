import React from 'react';
import { SupplierResult } from '../types';
import { ChevronRight, Calendar, Star, Info, Trophy, BarChart3, Target, ShieldCheck, Download } from 'lucide-react';
import { SupplierChartsSection } from './SupplierChartsSection';

interface LeaderboardViewProps {
  suppliers: SupplierResult[];
  onSelectSupplier: (supplierName: string) => void;
  selectedSupplierName: string;
  onOpenDevHub?: (tab?: 'notebook' | 'codebase' | 'pipeline' | 'modelConfig' | 'pythonCharts') => void;
  onExportJson?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  suppliers,
  onSelectSupplier,
  selectedSupplierName,
  onOpenDevHub,
  onExportJson
}) => {
  const topSupplier = suppliers[0];
  const avgMatch = suppliers.length > 0 
    ? (suppliers.reduce((acc, s) => acc + s.ppi, 0) / suppliers.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Winning Proposal
            </span>
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {topSupplier ? topSupplier.supplier_name : 'N/A'}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
              Rank #1
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Top ranked proposal based on highest overall fit
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Top Match Rating
            </span>
            <BarChart3 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {topSupplier ? `${topSupplier.ppi.toFixed(2)}%` : '0%'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Average match: <span className="font-semibold text-slate-700 dark:text-slate-300">{avgMatch}%</span> across {suppliers.length} proposals
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Highest Overall Score
            </span>
            <Target className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tracking-tight">
            {topSupplier ? `${topSupplier.absolute_score.toFixed(1)} / 100` : '0 / 100'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weighted composite score across all categories
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Fair Ranking Policy
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-2">
            Standard Tie-Break Rules
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            1) Match % → 2) Early Date → 3) Experience → 4) Name
          </div>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden transition-colors">
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Proposal Rankings &amp; Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rankings based on overall capability scores and fair tie-break rules. Click any proposal to view its detailed scorecard below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs font-medium">
              <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>100% Precise Math · Objective Scoring</span>
            </div>
            {onExportJson && (
              <button
                onClick={onExportJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-all cursor-pointer shadow-xs active:scale-98"
                title="Download Complete Evaluation Data (JSON) for Current Run"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Export Records (JSON)</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-16">Rank</th>
                <th className="py-3 px-4">Vendor / Proposal</th>
                <th className="py-3 px-4">Match Rating (%)</th>
                <th className="py-3 px-4">Overall Score (/100)</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Vendor Experience</th>
                <th className="py-3 px-4">Ranking Tie-Break Reason</th>
                <th className="py-3 px-4 w-12 text-center">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
              {suppliers.map((supp) => {
                const isSelected = supp.supplier_name === selectedSupplierName;
                const isRank1 = supp.final_rank === 1;
                const isRank2 = supp.final_rank === 2;
                const isRank3 = supp.final_rank === 3;

                return (
                  <tr
                    key={supp.supplier_name}
                    onClick={() => onSelectSupplier(supp.supplier_name)}
                    className={`cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-slate-100/90 dark:bg-slate-800 ring-1 ring-inset ring-slate-900/10 dark:ring-white/10'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-semibold">
                      <div className="flex items-center gap-1.5">
                        {isRank1 && <span className="text-base" title="1st Place Gold">🥇</span>}
                        {isRank2 && <span className="text-base" title="2nd Place Silver">🥈</span>}
                        {isRank3 && <span className="text-base" title="3rd Place Bronze">🥉</span>}
                        {!isRank1 && !isRank2 && !isRank3 && (
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-xs w-5 text-center font-bold">
                            #{supp.final_rank}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div>{supp.supplier_name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                        {supp.criteria.length} categories evaluated
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">
                          {supp.ppi.toFixed(2)}%
                        </span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              supp.ppi >= 90
                                ? 'bg-emerald-600 dark:bg-emerald-400'
                                : supp.ppi >= 80
                                ? 'bg-sky-600 dark:bg-sky-400'
                                : 'bg-amber-600 dark:bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, supp.ppi))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {supp.absolute_score.toFixed(1)}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{supp.submission_date}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-mono">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{supp.experience_rating.toFixed(1)} / 5.0</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={supp.tie_break_note}>
                      {supp.tie_break_note}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div
                        className={`p-1.5 rounded-lg inline-flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Comparison Charts Section (PLACED AFTER LEADERBOARD) */}
      {suppliers.length > 0 && (
        <SupplierChartsSection
          suppliers={suppliers}
          selectedSupplierName={selectedSupplierName}
          onSelectSupplier={onSelectSupplier}
          onOpenDevHub={onOpenDevHub}
        />
      )}
    </div>
  );
};
