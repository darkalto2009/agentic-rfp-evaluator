import React, { useState, useMemo } from 'react';
import { SupplierResult } from '../types';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip
} from 'recharts';
import { Radar as RadarIcon, Check, Layers, SlidersHorizontal, Sparkles } from 'lucide-react';

interface SupplierRadarChartProps {
  suppliers: SupplierResult[];
  selectedSupplierName?: string;
  onSelectSupplier?: (name: string) => void;
}

// Curated high-contrast aesthetic colors for suppliers in radar
const PALETTE = [
  { stroke: '#6366f1', fill: '#6366f1', name: 'Indigo' },   // NexaWorks / 1st
  { stroke: '#0284c7', fill: '#0284c7', name: 'Sky' },      // Apex Systems / 2nd
  { stroke: '#d97706', fill: '#d97706', name: 'Amber' },    // Orbit Digital / 3rd
  { stroke: '#e11d48', fill: '#e11d48', name: 'Rose' },     // BrightPath Tech / 4th
  { stroke: '#8b5cf6', fill: '#8b5cf6', name: 'Purple' },   // 5th
  { stroke: '#059669', fill: '#059669', name: 'Emerald' },  // 6th
  { stroke: '#ea580c', fill: '#ea580c', name: 'Orange' },   // 7th
  { stroke: '#0891b2', fill: '#0891b2', name: 'Cyan' },     // 8th
];

export const SupplierRadarChart: React.FC<SupplierRadarChartProps> = ({
  suppliers,
  selectedSupplierName,
  onSelectSupplier
}) => {
  // Initialize with up to 4 suppliers selected by default
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(() => {
    if (suppliers.length <= 4) {
      return suppliers.map((s) => s.supplier_name);
    }
    // If more than 4, select top 4
    return suppliers.slice(0, 4).map((s) => s.supplier_name);
  });

  // Metric mode: 'score' (out of 10) vs 'relative' (0-100% relative percentage)
  const [metricMode, setMetricMode] = useState<'score' | 'relative'>('score');

  // Supplier color mapping
  const supplierColorMap = useMemo(() => {
    const map = new Map<string, { stroke: string; fill: string }>();
    suppliers.forEach((s, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      map.set(s.supplier_name, color);
    });
    return map;
  }, [suppliers]);

  // Toggle single supplier selection
  const toggleSupplier = (name: string) => {
    setSelectedSuppliers((prev) => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((s) => s !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const selectAll = () => {
    setSelectedSuppliers(suppliers.map((s) => s.supplier_name));
  };

  const selectTop3 = () => {
    setSelectedSuppliers(suppliers.slice(0, 3).map((s) => s.supplier_name));
  };

  // Build radar chart data
  // Each data item represents a Criterion
  const radarData = useMemo(() => {
    if (!suppliers.length) return [];
    const firstSupp = suppliers[0];
    if (!firstSupp.criteria || !firstSupp.criteria.length) return [];

    return firstSupp.criteria.map((c) => {
      const entry: Record<string, any> = {
        criterion: c.name,
        shortName: c.name.length > 18 ? c.name.slice(0, 16) + '...' : c.name,
        weight: c.weight,
        max_score: c.max_score || 10
      };

      suppliers.forEach((s) => {
        const matchingCrit = s.criteria.find((sc) => sc.criterion_id === c.criterion_id);
        if (matchingCrit) {
          if (metricMode === 'score') {
            // Normalized score to a scale of 0-10
            const maxVal = matchingCrit.max_score || 10;
            const normalizedScore = (matchingCrit.score / maxVal) * 10;
            entry[s.supplier_name] = Math.round(normalizedScore * 10) / 10;
          } else {
            // Relative percentage vs Benchmark
            entry[s.supplier_name] = Math.round((matchingCrit.relative_percentage ?? 100) * 10) / 10;
          }
        } else {
          entry[s.supplier_name] = 0;
        }
      });

      return entry;
    });
  }, [suppliers, metricMode]);

  // Identify leaders for each criterion
  const criterionLeaders = useMemo(() => {
    if (!suppliers.length || !suppliers[0].criteria) return [];
    return suppliers[0].criteria.map((c) => {
      let maxScore = -1;
      let leaderName = '';
      suppliers.forEach((s) => {
        const found = s.criteria.find((sc) => sc.criterion_id === c.criterion_id);
        if (found && found.score > maxScore) {
          maxScore = found.score;
          leaderName = s.supplier_name;
        }
      });
      return {
        criterion: c.name,
        weight: c.weight,
        maxScore,
        leaderName
      };
    });
  }, [suppliers]);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xl text-xs space-y-2 max-w-xs transition-colors">
        <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[11px] font-mono text-slate-500 font-normal">
            {metricMode === 'score' ? 'Scale: 0-10' : 'Relative: 0-100%'}
          </span>
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any) => {
            const supp = suppliers.find((s) => s.supplier_name === item.dataKey);
            const critEval = supp?.criteria.find((sc) => sc.name === label);
            return (
              <div key={item.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.stroke }}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                    {item.dataKey}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {metricMode === 'score' ? (
                    <span>{item.value.toFixed(1)} / 10</span>
                  ) : (
                    <span>{item.value.toFixed(1)}%</span>
                  )}
                  {critEval?.gap === 0 && (
                    <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ★ Leader
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs p-5.5 space-y-5 transition-colors">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <RadarIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Multivariate Radar Evaluation
            </h3>
            <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {selectedSuppliers.length} of {suppliers.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Simultaneously overlay supplier capabilities across all weighted criteria to reveal relative architectural, security, and commercial trade-offs.
          </p>
        </div>

        {/* Metric Mode Switcher */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMetricMode('score')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                metricMode === 'score'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Criterion Score (/10)
            </button>
            <button
              onClick={() => setMetricMode('relative')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                metricMode === 'relative'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Relative % (vs Benchmark)
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Selection Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Compare:</span>
          </span>
          {suppliers.map((supp) => {
            const isSelected = selectedSuppliers.includes(supp.supplier_name);
            const color = supplierColorMap.get(supp.supplier_name) || PALETTE[0];

            return (
              <button
                key={supp.supplier_name}
                onClick={() => toggleSupplier(supp.supplier_name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs ring-1'
                    : 'bg-slate-50 dark:bg-slate-850/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                }`}
                style={{
                  borderColor: isSelected ? color.stroke : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full transition-transform"
                  style={{
                    backgroundColor: isSelected ? color.stroke : '#94a3b8',
                    boxShadow: isSelected ? `0 0 6px ${color.stroke}66` : undefined
                  }}
                />
                <span>{supp.supplier_name}</span>
                <span className="text-[10px] font-mono opacity-70">
                  (Rank #{supp.final_rank})
                </span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" style={{ color: color.stroke }} />}
              </button>
            );
          })}
        </div>

        {/* Quick select buttons */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <button
            onClick={selectAll}
            className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer font-medium"
          >
            Select All
          </button>
          <span>·</span>
          <button
            onClick={selectTop3}
            className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer font-medium"
          >
            Top 3
          </button>
        </div>
      </div>

      {/* Main Grid: Radar Chart & Qualitative Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Radar Chart Display */}
        <div className="lg:col-span-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center min-h-[380px] h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700/60"
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="criterion"
                tick={{
                  fill: 'currentColor',
                  fontSize: 11,
                  fontWeight: 600
                }}
                className="text-slate-600 dark:text-slate-300"
              />
              <PolarRadiusAxis
                angle={90}
                domain={metricMode === 'score' ? [0, 10] : [0, 100]}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500 text-[10px]"
                tick={{ fill: 'currentColor', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: '16px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              />
              {selectedSuppliers.map((suppName) => {
                const color = supplierColorMap.get(suppName) || PALETTE[0];
                return (
                  <Radar
                    key={suppName}
                    name={suppName}
                    dataKey={suppName}
                    stroke={color.stroke}
                    fill={color.fill}
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: color.stroke,
                      strokeWidth: 1,
                      stroke: '#ffffff'
                    }}
                    activeDot={{
                      r: 5,
                      stroke: color.stroke,
                      strokeWidth: 2,
                      fill: '#ffffff'
                    }}
                  />
                );
              })}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Side Panel: Criterion Domain Leaders & Synergy */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Domain Strengths &amp; Leaders
            </h4>
          </div>

          <div className="space-y-2">
            {criterionLeaders.map((lead) => {
              const color = supplierColorMap.get(lead.leaderName) || PALETTE[0];
              const isSelected = selectedSuppliers.includes(lead.leaderName);

              return (
                <div
                  key={lead.criterion}
                  className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {lead.criterion}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Weight: {lead.weight}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color.stroke }}
                      />
                      <span className="font-bold text-slate-900 dark:text-white">
                        {lead.leaderName}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Lead: {lead.maxScore.toFixed(1)} / 10
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <span className="font-bold block mb-0.5">💡 Strategy Tip:</span>
            Radar overlays highlight non-price trade-offs. A vendor with the highest aggregate PPI may still trail in specialized areas like Security or Commercial Value.
          </div>
        </div>
      </div>
    </div>
  );
};
