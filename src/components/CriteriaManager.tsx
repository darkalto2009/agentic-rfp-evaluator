import React, { useState } from 'react';
import { Criterion } from '../types';
import { Sliders, Plus, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

interface CriteriaManagerProps {
  criteria: Criterion[];
  onUpdateCriterion: (id: number, updates: Partial<Criterion>) => void;
  onAddCriterion: (newC: Omit<Criterion, 'criterion_id'>) => void;
  onResetCriteria: () => void;
}

export const CriteriaManager: React.FC<CriteriaManagerProps> = ({
  criteria,
  onUpdateCriterion,
  onAddCriterion,
  onResetCriteria
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newWeight, setNewWeight] = useState(10);
  const [newMax, setNewMax] = useState(10);

  const activeCriteria = criteria.filter((c) => c.is_active);
  const totalWeight = activeCriteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddCriterion({
      name: newName.trim(),
      description: newDesc.trim() || 'Custom evaluation criterion',
      weight: Number(newWeight),
      max_score: Number(newMax),
      is_active: 1
    });
    setNewName('');
    setNewDesc('');
    setNewWeight(10);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5.5 shadow-2xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Sliders className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span>Evaluation Criteria &amp; Category Weights</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize categories and adjust percentage weights to reflect your project priorities. Active weights must total exactly 100%.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Close Form' : 'Add Category'}</span>
            </button>
            <button
              onClick={onResetCriteria}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Reset to recommended default categories"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Sum Indicator */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Active Weight:</span>
            <span className={`text-sm font-bold font-mono ${isWeightValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {totalWeight.toFixed(1)}%
            </span>
          </div>
          {isWeightValid ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ready: Weights Total Exactly 100%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Incomplete (Adjust by { (100 - totalWeight).toFixed(1) }% to reach 100%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Criterion Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Evaluation Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. ESG &amp; Sustainability"
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Evaluation Focus &amp; Guidance</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Carbon footprint, ethical labor, governance..."
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Importance Weight (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={newWeight}
                onChange={(e) => setNewWeight(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Maximum Points</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newMax}
                onChange={(e) => setNewMax(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

      {/* Criteria Cards */}
      <div className="space-y-3">
        {criteria.map((c) => {
          const isActive = Boolean(c.is_active);
          return (
            <div
              key={c.criterion_id}
              className={`border rounded-xl p-4.5 transition-all duration-150 ${
                isActive
                  ? 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-2xs'
                  : 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                      #{c.criterion_id}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      {c.name}
                    </h4>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isActive ? 'Included' : 'Excluded'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {c.description}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Weight:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={c.weight}
                      onChange={(e) => onUpdateCriterion(c.criterion_id, { weight: Number(e.target.value) })}
                      className="w-16 text-xs text-center font-mono font-bold py-1 px-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Max Points:</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={c.max_score}
                      onChange={(e) => onUpdateCriterion(c.criterion_id, { max_score: Number(e.target.value) })}
                      className="w-14 text-xs text-center font-mono font-semibold py-1 px-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => onUpdateCriterion(c.criterion_id, { is_active: e.target.checked ? 1 : 0 })}
                      className="rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-slate-900 dark:focus:ring-white cursor-pointer"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
