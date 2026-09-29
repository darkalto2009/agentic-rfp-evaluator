/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { LeaderboardView } from './components/LeaderboardView';
import { ScorecardDrilldown } from './components/ScorecardDrilldown';
import { CriteriaManager } from './components/CriteriaManager';
import { EvaluationRunner } from './components/EvaluationRunner';
import { PastRunsHistory } from './components/PastRunsHistory';
import { DeveloperHubModal } from './components/DeveloperHubModal';
import { DocumentationHubModal } from './components/DocumentationHubModal';
import { ModelApiKeyModal } from './components/ModelApiKeyModal';
import { INITIAL_CRITERIA, INITIAL_SUPPLIERS } from './data/initialData';
import { recomputeSupplierMetrics } from './utils/rfpMath';
import { seedBaselineCache } from './utils/evaluationCache';
import { Criterion, SupplierResult, RFPRun } from './types';

// Initial Past Runs persisted in SQLite
const INITIAL_PAST_RUNS: RFPRun[] = [
  {
    rfp_run_id: 'RFP-RUN-AB873191',
    created_at: '2026-09-27T07:43:35.000Z',
    status: 'COMPLETED',
    active_criteria: INITIAL_CRITERIA,
    total_active_weight: 100.0,
    leaderboard: [
      { final_rank: 1, supplier_name: 'NexaWorks', absolute_score: 89.6, ppi: 93.74, submission_date: '2026-03-01', experience_rating: 4.5, tie_break_note: 'Rank assigned by primary PPI score.' },
      { final_rank: 2, supplier_name: 'Apex Systems', absolute_score: 85.1, ppi: 88.95, submission_date: '2026-03-01', experience_rating: 4.8, tie_break_note: 'Rank assigned by primary PPI score.' },
      { final_rank: 3, supplier_name: 'Orbit Digital', absolute_score: 83.0, ppi: 86.85, submission_date: '2026-03-03', experience_rating: 4.2, tie_break_note: 'Rank assigned by primary PPI score.' },
      { final_rank: 4, supplier_name: 'BrightPath Tech', absolute_score: 65.6, ppi: 68.80, submission_date: '2026-03-02', experience_rating: 3.5, tie_break_note: 'Rank assigned by primary PPI score.' },
    ],
    detailed_scorecards: INITIAL_SUPPLIERS,
    warnings: [],
    metadata: {
      supplier_count: 4,
      database: 'rfp_evaluation.db',
      deterministic_rules_applied: [
        'Absolute Score: Sum((score / max_score) * weight)',
        'Criterion Benchmark: Max observed score across suppliers',
        'Criterion Gap: Supplier score - benchmark (<= 0)',
        'Relative %: (score / benchmark) * 100',
        'PPI: Weighted average of relative percentages',
        'Tie-break Order: 1) PPI desc, 2) Submission date asc, 3) Experience desc, 4) Name asc'
      ]
    }
  },
  {
    rfp_run_id: 'RFP-RUN-73C7A4C4',
    created_at: '2026-09-27T07:44:09.000Z',
    status: 'COMPLETED',
    active_criteria: INITIAL_CRITERIA,
    total_active_weight: 100.0,
    leaderboard: [
      { final_rank: 1, supplier_name: 'NexaWorks', absolute_score: 89.6, ppi: 93.74, submission_date: '2026-03-01', experience_rating: 4.5, tie_break_note: 'Rank assigned by primary PPI score.' },
      { final_rank: 2, supplier_name: 'Apex Systems', absolute_score: 85.1, ppi: 88.95, submission_date: '2026-03-01', experience_rating: 4.8, tie_break_note: 'Rank assigned by primary PPI score.' },
      { final_rank: 3, supplier_name: 'Orbit Digital', absolute_score: 83.0, ppi: 86.85, submission_date: '2026-03-03', experience_rating: 4.2, tie_break_note: 'Rank assigned by primary PPI score.' },
      { final_rank: 4, supplier_name: 'BrightPath Tech', absolute_score: 65.6, ppi: 68.80, submission_date: '2026-03-02', experience_rating: 3.5, tie_break_note: 'Rank assigned by primary PPI score.' },
    ],
    detailed_scorecards: INITIAL_SUPPLIERS,
    warnings: [],
    metadata: {
      supplier_count: 4,
      database: 'test_rfp_evaluation.db',
      deterministic_rules_applied: [
        'Absolute Score: Sum((score / max_score) * weight)',
        'Criterion Benchmark: Max observed score across suppliers',
        'Criterion Gap: Supplier score - benchmark (<= 0)',
        'Relative %: (score / benchmark) * 100',
        'PPI: Weighted average of relative percentages',
        'Tie-break Order: 1) PPI desc, 2) Submission date asc, 3) Experience desc, 4) Name asc'
      ]
    }
  }
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('leaderboard');
  const [criteria, setCriteria] = useState<Criterion[]>(INITIAL_CRITERIA);
  const [rawSuppliers, setRawSuppliers] = useState<SupplierResult[]>(INITIAL_SUPPLIERS);
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('NexaWorks');
  const [runId, setRunId] = useState<string>('RFP-RUN-AB873191');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<Array<{ supplier_name: string; code: string; message: string }>>([]);

  // Past Runs State from SQLite
  const [pastRuns, setPastRuns] = useState<RFPRun[]>(INITIAL_PAST_RUNS);

  // Developer & Documentation Hub Modal State
  const [isDevHubOpen, setIsDevHubOpen] = useState<boolean>(false);
  const [isDocHubOpen, setIsDocHubOpen] = useState<boolean>(false);
  const [devHubInitialTab, setDevHubInitialTab] = useState<'notebook' | 'codebase' | 'pipeline' | 'modelConfig' | 'pythonCharts'>('modelConfig');

  // Model API Key State (Session-Only In-Memory: Never stored in localStorage, cleared upon page reload)
  const [sessionApiKey, setSessionApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(true);

  const handleOpenDevHub = (tab: 'notebook' | 'codebase' | 'pipeline' | 'modelConfig' | 'pythonCharts' = 'modelConfig') => {
    setDevHubInitialTab(tab);
    setIsDevHubOpen(true);
  };

  // Theme State (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('rfp_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // On-demand LLM Configuration State
  const [llmModel, setLlmModel] = useState<string>(() => {
    return localStorage.getItem('rfp_llm_model') || 'gemini-2.5-flash';
  });

  // Apply theme class to document element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('rfp_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Dynamically recompute rankings, Benchmarks, Gaps, and PPI whenever criteria or scores change
  const computedSuppliers = useMemo(() => {
    return recomputeSupplierMetrics(rawSuppliers, criteria);
  }, [rawSuppliers, criteria]);

  const activeCriteriaCount = useMemo(() => {
    return criteria.filter(c => c.is_active).length;
  }, [criteria]);

  const currentSelectedSupplier = useMemo(() => {
    return computedSuppliers.find(s => s.supplier_name === selectedSupplierName) || computedSuppliers[0];
  }, [computedSuppliers, selectedSupplierName]);

  const handleUpdateCriterion = (id: number, updates: Partial<Criterion>) => {
    setCriteria(prev => prev.map(c => c.criterion_id === id ? { ...c, ...updates } : c));
  };

  const handleAddCriterion = (newC: Omit<Criterion, 'criterion_id'>) => {
    const nextId = Math.max(...criteria.map(c => c.criterion_id), 0) + 1;
    setCriteria(prev => [...prev, { ...newC, criterion_id: nextId }]);
  };

  const handleResetCriteria = () => {
    setCriteria(INITIAL_CRITERIA);
  };

  const handleAddSupplier = (newSupp: SupplierResult) => {
    setRawSuppliers(prev => [...prev, newSupp]);
    setSelectedSupplierName(newSupp.supplier_name);
  };

  const handleRemoveSupplier = (name: string) => {
    setRawSuppliers(prev => prev.filter(s => s.supplier_name !== name));
    if (selectedSupplierName === name) {
      setSelectedSupplierName(rawSuppliers.find(s => s.supplier_name !== name)?.supplier_name || '');
    }
  };

  const handleSetSuppliers = (newSuppliers: SupplierResult[]) => {
    setRawSuppliers(newSuppliers);
    if (newSuppliers.length > 0) {
      setSelectedSupplierName(newSuppliers[0].supplier_name);
    }
  };

  const handleRunBatch = (forceRefresh?: boolean, autoResolve: boolean = true) => {
    setIsRunning(true);
    setTimeout(() => {
      const newRunId = `RFP-RUN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setRunId(newRunId);

      const batchWarnings: Array<{ supplier_name: string; code: string; message: string }> = [];

      // Validate & Sanitize Suppliers per Auto-Resolution configuration
      const sanitizedSuppliers = rawSuppliers.map(supp => {
        let suppCopy = { ...supp };
        let modified = false;

        const sanitizedCriteria = suppCopy.criteria.map(crit => {
          const maxAllowed = crit.max_score || 10.0;
          let score = crit.score;

          if (score > maxAllowed) {
            batchWarnings.push({
              supplier_name: supp.supplier_name,
              code: autoResolve ? 'SCORE_EXCEEDED_MAX_CLIPPED' : 'STRICT_SCORE_EXCEEDED',
              message: `Criterion '${crit.name}' score (${score}) exceeded maximum ${maxAllowed}.${autoResolve ? ' Auto-resolved & clamped to ' + maxAllowed + '.' : ' Requires manual review in strict mode.'}`
            });
            if (autoResolve) {
              score = maxAllowed;
              modified = true;
            }
          } else if (score < 0) {
            batchWarnings.push({
              supplier_name: supp.supplier_name,
              code: autoResolve ? 'SCORE_NEGATIVE_CLIPPED' : 'STRICT_NEGATIVE_SCORE',
              message: `Criterion '${crit.name}' score (${score}) was negative.${autoResolve ? ' Auto-resolved & clamped to 0.0.' : ' Requires manual review in strict mode.'}`
            });
            if (autoResolve) {
              score = 0;
              modified = true;
            }
          }

          return { ...crit, score };
        });

        // Check for omitted active criteria
        const existingCriterionIds = new Set(suppCopy.criteria.map(c => c.criterion_id));
        const activeList = criteria.filter(c => c.is_active);

        for (const activeCrit of activeList) {
          if (!existingCriterionIds.has(activeCrit.criterion_id)) {
            batchWarnings.push({
              supplier_name: supp.supplier_name,
              code: autoResolve ? 'MISSING_CRITERION_FILLED' : 'STRICT_MISSING_CRITERION',
              message: `Active criterion '${activeCrit.name}' was missing.${autoResolve ? ' Auto-resolved: filled with 0.0 score.' : ' Flagged in strict mode.'}`
            });
            if (autoResolve) {
              sanitizedCriteria.push({
                criterion_id: activeCrit.criterion_id,
                name: activeCrit.name,
                weight: activeCrit.weight,
                score: 0.0,
                max_score: activeCrit.max_score,
                justification: 'Auto-resolved omission (0.0 assigned per instruction.md Section 3.2).',
                evidence: 'No verbatim evidence provided in document.'
              });
              modified = true;
            }
          }
        }

        return { ...suppCopy, criteria: sanitizedCriteria };
      });

      if (autoResolve) {
        setRawSuppliers(sanitizedSuppliers);
      }

      // Recomputed results for the run
      const evaluated = recomputeSupplierMetrics(sanitizedSuppliers, criteria);

      // Save into Past Runs History (SQLite mirror)
      const newRunRecord: RFPRun = {
        rfp_run_id: newRunId,
        created_at: new Date().toISOString(),
        status: 'COMPLETED',
        active_criteria: criteria.filter(c => c.is_active),
        total_active_weight: criteria.filter(c => c.is_active).reduce((sum, c) => sum + Number(c.weight), 0),
        leaderboard: evaluated.map(s => ({
          final_rank: s.final_rank,
          supplier_name: s.supplier_name,
          absolute_score: s.absolute_score,
          ppi: s.ppi,
          submission_date: s.submission_date,
          experience_rating: s.experience_rating,
          tie_break_note: s.tie_break_note
        })),
        detailed_scorecards: evaluated,
        warnings: batchWarnings,
        metadata: {
          supplier_count: evaluated.length,
          database: 'rfp_evaluation.db',
          auto_resolution_active: autoResolve,
          anomalies_resolved_count: batchWarnings.length,
          deterministic_rules_applied: [
            'Absolute Score: Sum((score / max_score) * weight)',
            'Criterion Benchmark: Max observed score across suppliers',
            'Criterion Gap: Supplier score - benchmark (<= 0)',
            'Relative %: (score / benchmark) * 100',
            'PPI: Weighted average of relative percentages',
            'Tie-break Order: 1) PPI desc, 2) Submission date asc, 3) Experience desc, 4) Name asc',
            autoResolve ? 'Auto-Resolution: Automatic score clamping and zero-fill per Section 3' : 'Strict Mode: Unresolved anomaly audit logging'
          ]
        }
      };

      setPastRuns(prev => [newRunRecord, ...prev]);
      setIsRunning(false);
      setCurrentTab('leaderboard');
      setWarnings(batchWarnings);
    }, 1000);
  };

  const handleLoadRunToActive = (run: RFPRun) => {
    setRunId(run.rfp_run_id);
    if (run.detailed_scorecards && run.detailed_scorecards.length > 0) {
      setRawSuppliers(run.detailed_scorecards);
      setSelectedSupplierName(run.detailed_scorecards[0].supplier_name);
    }
    if (run.active_criteria && run.active_criteria.length > 0) {
      setCriteria(run.active_criteria);
    }
    setCurrentTab('leaderboard');
  };

  const handleExportJson = () => {
    const exportData = {
      rfp_run_id: runId,
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
      active_criteria: criteria.filter(c => c.is_active),
      total_active_weight: criteria.filter(c => c.is_active).reduce((sum, c) => sum + Number(c.weight), 0),
      llm_configuration: {
        model: llmModel,
        runtime_mode: 'environment_secret_injection'
      },
      leaderboard: computedSuppliers.map(s => ({
        final_rank: s.final_rank,
        supplier_name: s.supplier_name,
        absolute_score: s.absolute_score,
        ppi: s.ppi,
        submission_date: s.submission_date,
        experience_rating: s.experience_rating,
        tie_break_note: s.tie_break_note
      })),
      detailed_scorecards: computedSuppliers,
      warnings: warnings,
      metadata: {
        supplier_count: computedSuppliers.length,
        database: 'rfp_evaluation.db',
        input_directory: 'input/',
        deterministic_rules_applied: [
          'Absolute Score: Sum((score / max_score) * weight)',
          'Criterion Benchmark: Max observed score across suppliers',
          'Criterion Gap: Supplier score - benchmark (<= 0)',
          'Relative %: (score / benchmark) * 100',
          'PPI: Weighted average of relative percentages',
          'Tie-break Order: 1) PPI desc, 2) Submission date asc, 3) Experience desc, 4) Name asc'
        ]
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${runId}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900">
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        runId={runId}
        onOpenDevHub={() => handleOpenDevHub('modelConfig')}
        onOpenDocHub={() => setIsDocHubOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        apiKey={sessionApiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'leaderboard' && (
          <div className="space-y-8">
            <LeaderboardView
              suppliers={computedSuppliers}
              onSelectSupplier={setSelectedSupplierName}
              selectedSupplierName={selectedSupplierName}
              onOpenDevHub={handleOpenDevHub}
              onExportJson={handleExportJson}
            />
            {currentSelectedSupplier && (
              <ScorecardDrilldown
                supplier={currentSelectedSupplier}
                allSuppliers={computedSuppliers}
                onSelectSupplier={setSelectedSupplierName}
              />
            )}
          </div>
        )}

        {currentTab === 'criteria' && (
          <CriteriaManager
            criteria={criteria}
            onUpdateCriterion={handleUpdateCriterion}
            onAddCriterion={handleAddCriterion}
            onResetCriteria={handleResetCriteria}
          />
        )}

        {currentTab === 'evaluate' && (
          <EvaluationRunner
            onRunBatch={handleRunBatch}
            isRunning={isRunning}
            activeCriteriaCount={activeCriteriaCount}
            warnings={warnings}
            suppliers={computedSuppliers}
            onAddSupplier={handleAddSupplier}
            onRemoveSupplier={handleRemoveSupplier}
            onSetSuppliers={handleSetSuppliers}
          />
        )}

        {currentTab === 'history' && (
          <PastRunsHistory
            runs={pastRuns}
            onLoadRunToActive={handleLoadRunToActive}
            activeRunId={runId}
          />
        )}
      </main>

      {/* Developer & System Tools Modal */}
      <DeveloperHubModal
        isOpen={isDevHubOpen}
        onClose={() => setIsDevHubOpen(false)}
        llmModel={llmModel}
        setLlmModel={setLlmModel}
        suppliers={computedSuppliers}
        initialTab={devHubInitialTab}
        apiKey={sessionApiKey}
        setApiKey={setSessionApiKey}
      />

      {/* Documentation Hub Modal */}
      <DocumentationHubModal
        isOpen={isDocHubOpen}
        onClose={() => setIsDocHubOpen(false)}
      />

      {/* Model API Key Pop-up Modal (Session Memory Only) */}
      <ModelApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={sessionApiKey}
        onSaveApiKey={(key, model) => {
          setSessionApiKey(key);
          setLlmModel(model);
        }}
        llmModel={llmModel}
      />

      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">RFP Evaluation &amp; Supplier Ranking</span>
          </div>
          <div className="text-center font-medium text-slate-600 dark:text-slate-300">
            © 2026 Darkalto Developer | All Rights Reserved
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Model: <strong className="text-slate-700 dark:text-slate-300">{llmModel}</strong> · 100% Precise Math · Complete Audit Trail
          </span>
        </div>
      </footer>
    </div>
  );
}
