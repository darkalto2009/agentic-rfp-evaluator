import React, { useState, useMemo } from 'react';
import { SupplierResult } from '../types';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  Radar as RadarIcon,
  BarChart3,
  TrendingDown,
  Award,
  Check,
  SlidersHorizontal,
  Sparkles,
  Info,
  Code2,
  LineChart as LineChartIcon
} from 'lucide-react';

interface SupplierChartsSectionProps {
  suppliers: SupplierResult[];
  selectedSupplierName?: string;
  onSelectSupplier?: (name: string) => void;
  onOpenDevHub?: (tab?: 'notebook' | 'codebase' | 'pipeline' | 'modelConfig' | 'pythonCharts') => void;
}

// Curated high-contrast aesthetic colors for proposals in charts
const PALETTE = [
  { stroke: '#6366f1', fill: '#6366f1', name: 'Indigo' },   // 1st
  { stroke: '#0284c7', fill: '#0284c7', name: 'Sky' },      // 2nd
  { stroke: '#d97706', fill: '#d97706', name: 'Amber' },    // 3rd
  { stroke: '#e11d48', fill: '#e11d48', name: 'Rose' },     // 4th
  { stroke: '#8b5cf6', fill: '#8b5cf6', name: 'Purple' },   // 5th
  { stroke: '#059669', fill: '#059669', name: 'Emerald' },  // 6th
  { stroke: '#ea580c', fill: '#ea580c', name: 'Orange' },   // 7th
  { stroke: '#0891b2', fill: '#0891b2', name: 'Cyan' },     // 8th
];

export const SupplierChartsSection: React.FC<SupplierChartsSectionProps> = ({
  suppliers,
  selectedSupplierName,
  onSelectSupplier,
  onOpenDevHub
}) => {
  // Chart selection: 'radar', 'groupedBar', 'gapBar', 'overallBar', 'lineProfile'
  const [activeChartType, setActiveChartType] = useState<'radar' | 'groupedBar' | 'gapBar' | 'overallBar' | 'lineProfile'>('radar');

  // Supplier multi-select: default to top 4 (or all if <= 4)
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>(() => {
    if (suppliers.length <= 4) {
      return suppliers.map((s) => s.supplier_name);
    }
    return suppliers.slice(0, 4).map((s) => s.supplier_name);
  });

  // Metric mode for Radar: 'score' (0-10) vs 'relative' (0-100%)
  const [metricMode, setMetricMode] = useState<'score' | 'relative'>('score');

  // Proposal color mapping
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
        if (prev.length === 1) return prev; // Keep at least 1
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

  // Build Radar & Grouped Bar Chart data
  const categoryChartData = useMemo(() => {
    if (!suppliers.length) return [];
    const firstSupp = suppliers[0];
    if (!firstSupp.criteria || !firstSupp.criteria.length) return [];

    return firstSupp.criteria.map((c) => {
      const entry: Record<string, any> = {
        category: c.name,
        shortName: c.name.length > 16 ? c.name.slice(0, 14) + '...' : c.name,
        weight: c.weight,
        benchmark: c.benchmark ?? c.score
      };

      suppliers.forEach((s) => {
        const matchingCrit = s.criteria.find((sc) => sc.criterion_id === c.criterion_id);
        if (matchingCrit) {
          if (metricMode === 'score') {
            const maxVal = matchingCrit.max_score || 10;
            const normalized = (matchingCrit.score / maxVal) * 10;
            entry[s.supplier_name] = Math.round(normalized * 10) / 10;
          } else {
            entry[s.supplier_name] = Math.round((matchingCrit.relative_percentage ?? 100) * 10) / 10;
          }
          // Gap data (Score - Benchmark)
          entry[`${s.supplier_name}_gap`] = Math.round(((matchingCrit.gap ?? 0)) * 10) / 10;
        } else {
          entry[s.supplier_name] = 0;
          entry[`${s.supplier_name}_gap`] = 0;
        }
      });

      return entry;
    });
  }, [suppliers, metricMode]);

  // Overall Score Chart Data
  const overallChartData = useMemo(() => {
    return suppliers
      .filter((s) => selectedSuppliers.includes(s.supplier_name))
      .map((s) => ({
        name: s.supplier_name,
        overallScore: Math.round(s.absolute_score * 10) / 10,
        matchRating: Math.round(s.ppi * 10) / 10,
        rank: s.final_rank
      }));
  }, [suppliers, selectedSuppliers]);

  // Identify category leaders
  const categoryLeaders = useMemo(() => {
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
        category: c.name,
        weight: c.weight,
        maxScore,
        leaderName
      };
    });
  }, [suppliers]);

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xl text-xs space-y-2 max-w-xs transition-colors">
        <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[11px] font-mono text-slate-500 font-normal">
            {activeChartType === 'radar'
              ? metricMode === 'score' ? 'Scale: 0-10' : 'Relative: 0-100%'
              : activeChartType === 'gapBar' ? 'Gap vs Leader (≤ 0)' : 'Score: 0-10'}
          </span>
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any) => {
            const suppName = item.dataKey.replace('_gap', '');
            const isGap = item.dataKey.endsWith('_gap');
            return (
              <div key={item.dataKey} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color || item.stroke || item.fill }}
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                    {suppName}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {isGap ? (
                    <span className={item.value === 0 ? 'text-emerald-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                      {item.value === 0 ? '0.0 (Leader)' : `${item.value.toFixed(1)}`}
                    </span>
                  ) : activeChartType === 'overallBar' ? (
                    <span>{item.value.toFixed(1)}</span>
                  ) : (
                    <span>{item.value.toFixed(1)} {metricMode === 'score' ? '/ 10' : '%'}</span>
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
      {/* Header and Chart Type Selection */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Visual Comparison &amp; Capability Profiles
            </h3>
            <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {selectedSuppliers.length} of {suppliers.length} Selected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare vendor strengths, side-by-side category scores, and capability gaps. Select multiple chart styles or export Python scripts.
          </p>
        </div>

        {/* Chart Selector Buttons & Python Button */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Chart Type Tabs */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveChartType('radar')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartType === 'radar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <RadarIcon className="w-3.5 h-3.5" />
              <span>Radar Profile</span>
            </button>
            <button
              onClick={() => setActiveChartType('groupedBar')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartType === 'groupedBar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Category Bars</span>
            </button>
            <button
              onClick={() => setActiveChartType('gapBar')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartType === 'gapBar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Gap vs Leader</span>
            </button>
            <button
              onClick={() => setActiveChartType('lineProfile')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartType === 'lineProfile'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Parallel criteria trajectory line graph to highlight ranking crossovers and slope trade-offs"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              <span>Trajectory (Line)</span>
            </button>
            <button
              onClick={() => setActiveChartType('overallBar')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartType === 'overallBar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Total Score</span>
            </button>
          </div>

          {/* Python Script Export Button (in Tools & Tests) */}
          <button
            onClick={() => onOpenDevHub?.('pythonCharts')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Open Python Chart Generator in System Tools (Matplotlib, Plotly, & SVG scripts)"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Generate Python Chart Code (Tools)</span>
          </button>
        </div>
      </div>

      {/* Proposal Selection Chips & Metric Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Select Proposals:</span>
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
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
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

        {/* Shortcuts & Radar / Line Mode Toggle */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {(activeChartType === 'radar' || activeChartType === 'lineProfile') && (
            <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] mr-2">
              <button
                onClick={() => setMetricMode('score')}
                className={`px-2 py-0.5 font-semibold rounded cursor-pointer ${
                  metricMode === 'score' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                Score (/10)
              </button>
              <button
                onClick={() => setMetricMode('relative')}
                className={`px-2 py-0.5 font-semibold rounded cursor-pointer ${
                  metricMode === 'relative' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                Relative %
              </button>
            </div>
          )}

          <button
            onClick={selectAll}
            className="px-2 py-0.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer font-medium"
          >
            Select All
          </button>
          <span>·</span>
          <button
            onClick={selectTop3}
            className="px-2 py-0.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer font-medium"
          >
            Top 3
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center min-h-[400px] h-[420px]">
          {/* CHART 1: RADAR PROFILE */}
          {activeChartType === 'radar' && (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={categoryChartData} outerRadius="75%">
                <PolarGrid stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
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
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: 500 }} />
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
                      dot={{ r: 3, fill: color.stroke, strokeWidth: 1, stroke: '#ffffff' }}
                      activeDot={{ r: 5, stroke: color.stroke, strokeWidth: 2, fill: '#ffffff' }}
                    />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          )}

          {/* CHART 2: GROUPED CATEGORY BARS */}
          {activeChartType === 'groupedBar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" vertical={false} />
                <XAxis dataKey="shortName" tick={{ fill: 'currentColor', fontSize: 11 }} className="text-slate-600 dark:text-slate-300" />
                <YAxis domain={[0, 10]} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-slate-400 dark:text-slate-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                {selectedSuppliers.map((suppName) => {
                  const color = supplierColorMap.get(suppName) || PALETTE[0];
                  return (
                    <Bar
                      key={suppName}
                      name={suppName}
                      dataKey={suppName}
                      fill={color.fill}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* CHART 3: GAP VS LEADER */}
          {activeChartType === 'gapBar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" vertical={false} />
                <XAxis dataKey="shortName" tick={{ fill: 'currentColor', fontSize: 11 }} className="text-slate-600 dark:text-slate-300" />
                <YAxis domain={[-6, 0]} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-slate-400 dark:text-slate-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                {selectedSuppliers.map((suppName) => {
                  const color = supplierColorMap.get(suppName) || PALETTE[0];
                  return (
                    <Bar
                      key={suppName}
                      name={`${suppName} Gap`}
                      dataKey={`${suppName}_gap`}
                      fill={color.fill}
                      radius={[0, 0, 4, 4]}
                      maxBarSize={45}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* CHART 4: CRITERIA PERFORMANCE TRAJECTORY (LINE) */}
          {activeChartType === 'lineProfile' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={categoryChartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" vertical={false} />
                <XAxis dataKey="shortName" tick={{ fill: 'currentColor', fontSize: 11 }} className="text-slate-600 dark:text-slate-300" />
                <YAxis domain={metricMode === 'score' ? [0, 10] : [0, 100]} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-slate-400 dark:text-slate-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                {selectedSuppliers.map((suppName) => {
                  const color = supplierColorMap.get(suppName) || PALETTE[0];
                  return (
                    <Line
                      key={suppName}
                      type="monotone"
                      dataKey={suppName}
                      name={suppName}
                      stroke={color.stroke}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: color.stroke, strokeWidth: 1.5, stroke: '#ffffff' }}
                      activeDot={{ r: 6, stroke: color.stroke, strokeWidth: 2, fill: '#ffffff' }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* CHART 5: TOTAL EVALUATION SCORE */}
          {activeChartType === 'overallBar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallChartData} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700/60" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }} className="text-slate-600 dark:text-slate-300" />
                <YAxis domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 10 }} className="text-slate-400 dark:text-slate-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Bar name="Overall Score (/100)" dataKey="overallScore" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar name="Match Rating (%)" dataKey="matchRating" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Side Panel: Leaders & Insights */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Decision Insight - Positioned on Top of Category Leaders */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed shadow-2xs">
            <span className="font-bold block mb-1 flex items-center gap-1.5 text-indigo-950 dark:text-indigo-100">
              <span>💡 Decision Insight:</span>
            </span>
            {activeChartType === 'lineProfile' ? (
              <span>
                <strong>Parallel Trajectory Role:</strong> Line slopes highlight <em>ranking crossovers</em> (where Proposal A outpaces Proposal B in technical capabilities but drops behind in commercial terms). For non-sequential categories, Radar and Grouped Bar charts remain the standard visual reference.
              </span>
            ) : activeChartType === 'radar' ? (
              <span>
                <strong>Radar Balance:</strong> Visual polygons uncover multi-dimensional symmetry. A wider, balanced perimeter indicates consistent competence without fatal deficiencies across any single category.
              </span>
            ) : activeChartType === 'gapBar' ? (
              <span>
                <strong>Deficit Analysis:</strong> Negative bars illustrate how far each proposal falls below the peer category benchmark ($0.0$). Zero-gap entries represent benchmark setters.
              </span>
            ) : activeChartType === 'groupedBar' ? (
              <span>
                <strong>Category Head-to-Head:</strong> Direct categorical comparison allows side-by-side verification of individual proposal strengths against competitor submissions.
              </span>
            ) : (
              <span>
                <strong>Overall &amp; Match Rating:</strong> Compares weighted composite scores against relative peer performance indices (PPI), applying the deterministic 4-tier tie-breaking rules.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Category Leaders &amp; Strengths
            </h4>
          </div>

          <div className="space-y-2">
            {categoryLeaders.map((lead) => {
              const color = supplierColorMap.get(lead.leaderName) || PALETTE[0];

              return (
                <div
                  key={lead.category}
                  className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {lead.category}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Weight: {lead.weight}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.stroke }} />
                      <span className="font-bold text-slate-900 dark:text-white">
                        {lead.leaderName}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      Best Score: {lead.maxScore.toFixed(1)} / 10
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
