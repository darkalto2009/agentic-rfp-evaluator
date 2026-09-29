import React, { useState, useEffect } from 'react';
import { X, BookOpen, FileCode, Layers, Key, Check, BarChart3 } from 'lucide-react';
import { NotebookViewer } from './NotebookViewer';
import { CodeArtifactsHub } from './CodeArtifactsHub';
import { PythonChartGenerator } from './PythonChartGenerator';
import { SupplierResult } from '../types';

interface DeveloperHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  llmModel: string;
  setLlmModel: (model: string) => void;
  apiKey?: string;
  setApiKey?: (key: string) => void;
  suppliers?: SupplierResult[];
  initialTab?: 'notebook' | 'codebase' | 'pipeline' | 'modelConfig' | 'pythonCharts';
}

export const DeveloperHubModal: React.FC<DeveloperHubModalProps> = ({
  isOpen,
  onClose,
  llmModel,
  setLlmModel,
  apiKey = '',
  setApiKey,
  suppliers = [],
  initialTab = 'modelConfig'
}) => {
  const [activeDevTab, setActiveDevTab] = useState<'notebook' | 'codebase' | 'pipeline' | 'modelConfig' | 'pythonCharts'>(initialTab);
  const [tempModel, setTempModel] = useState(llmModel);
  const [tempKey, setTempKey] = useState(apiKey);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveDevTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setLlmModel(tempModel.trim() || 'gemini-2.5-flash');
    localStorage.setItem('rfp_llm_model', tempModel.trim() || 'gemini-2.5-flash');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 transition-opacity">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white flex items-center justify-center text-sm font-bold shadow-2xs">
              🛠️
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                System Configuration &amp; Testing Tools
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI Model Settings · Interactive Test Notebook · Python Source Code · Workflow Overview
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1.5 px-6 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto py-2.5">
          <button
            onClick={() => setActiveDevTab('modelConfig')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDevTab === 'modelConfig'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>AI Model &amp; Key Settings</span>
          </button>

          <button
            onClick={() => setActiveDevTab('notebook')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDevTab === 'notebook'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Testing Notebook</span>
          </button>

          <button
            onClick={() => setActiveDevTab('codebase')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDevTab === 'codebase'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Python Source Code</span>
          </button>

          <button
            onClick={() => setActiveDevTab('pythonCharts')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDevTab === 'pythonCharts'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Python Chart Generator</span>
          </button>

          <button
            onClick={() => setActiveDevTab('pipeline')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeDevTab === 'pipeline'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Evaluation Workflow Steps</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/60">
          {/* TAB 1: MODEL & API KEYS */}
          {activeDevTab === 'modelConfig' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                    <Key className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>AI Model &amp; Key Settings</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select the AI model used to extract direct citations and evaluate qualitative evidence. The application also supports offline deterministic scoring.
                  </p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      AI Model Name
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempModel}
                        onChange={(e) => setTempModel(e.target.value)}
                        placeholder="e.g. gemini-2.5-flash, gemini-3.1-pro-preview"
                        className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
                      />
                      <select
                        onChange={(e) => e.target.value && setTempModel(e.target.value)}
                        className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-2 cursor-pointer font-medium"
                      >
                        <option value="">Choose Model...</option>
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Fast &amp; Accurate)</option>
                        <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Reasoning)</option>
                        <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
                        <option value="gpt-4o">gpt-4o (OpenAI Compatible)</option>
                      </select>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Can also be set in your environment file as <code className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">GEMINI_MODEL="gemini-2.5-flash"</code>.
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Security &amp; API Key Storage Policy</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      To protect credentials, API keys are <strong>never stored in project files, source control, or browser storage</strong>.
                      For server or automated batch runs, the application reads <code className="font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">GEMINI_API_KEY</code> directly from your environment variables at runtime.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {savedNotice ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Settings saved successfully!</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              </div>

              {/* Outside Configuration Guide */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-2xs text-xs space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Running Locally or in Automation
                </h4>
                <p className="text-slate-600 dark:text-slate-400">
                  Export environment variables in your terminal shell or in a <code className="font-mono">.env</code> file (never committed to git):
                </p>
                <div className="p-3 bg-slate-950 font-mono text-[11px] text-emerald-400 rounded-lg overflow-x-auto border border-slate-800 leading-relaxed">
                  export GEMINI_API_KEY="&lt;your_runtime_api_key&gt;"<br />
                  export GEMINI_MODEL="gemini-2.5-flash"<br />
                  python3 app.py
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTEBOOK */}
          {activeDevTab === 'notebook' && (
            <NotebookViewer />
          )}

          {/* TAB 3: CODEBASE */}
          {activeDevTab === 'codebase' && (
            <CodeArtifactsHub />
          )}

          {/* TAB 4: PYTHON CHART GENERATOR */}
          {activeDevTab === 'pythonCharts' && (
            <PythonChartGenerator suppliers={suppliers} />
          )}

          {/* TAB 5: PIPELINE ARCHITECTURE */}
          {activeDevTab === 'pipeline' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Evaluation Workflow &amp; Architectural Pipeline</span>
                  </h3>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/80">
                    6 Enterprise Stages Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Rigorous data pipeline decoupling unstructured document comprehension from deterministic mathematical benchmarking.
                </p>
              </div>

              {/* 6-Stage Workflow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {/* Stage 1 */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      Stage 1
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">pdf_extractor.py</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Document Ingestion &amp; Fingerprint</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Scans uploaded proposals from canonical <code className="text-slate-800 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-700/60 px-1 py-0.5 rounded">./input/</code>. Normalizes text format, extracts tabular data, and computes cryptographic <strong className="font-mono text-slate-700 dark:text-slate-300">DocHash = SHA256(Bytes)</strong> to prevent redundant tokenization.
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      Stage 2
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">evaluator.py (LLM)</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Three-Tier Caching &amp; Review</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Queries <strong className="text-slate-800 dark:text-slate-200">evaluation_cache</strong> with <code className="font-mono text-[10px]">CriteriaDefHash</code>. Cache hits load qualitative scorecards at <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0 tokens (80%-95% savings)</span>. Cache misses invoke Gemini LLM with verbatim citation extraction.
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      Stage 3
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">validator.py</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Auto-Resolution &amp; Guardrails</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Applies Pydantic schema firewall per <strong className="text-slate-700 dark:text-slate-300">instruction.md Section 3</strong>. Auto-Resolution clamps boundary violations to <code className="font-mono text-slate-700 dark:text-slate-300">[0.0, max_score]</code>, zero-fills omitted criteria, and logs audit warnings.
                  </p>
                </div>

                {/* Stage 4 */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded">
                      Stage 4
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ranker.py (Deterministic)</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Peer Benchmarking &amp; PPI Math</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    <strong>Strict Separation:</strong> 100% deterministic pure math outside the LLM. Calculates Absolute Weighted Score, Criterion Benchmarks (<code className="font-mono">max</code>), Deficit Gaps (<code className="font-mono">&le; 0</code>), and Peer Performance Index (PPI).
                  </p>
                </div>

                {/* Stage 5 */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded">
                      Stage 5
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ranker.py (4-Tier)</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">4-Tier Deterministic Tie-Breaking</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Enforces immutable arbitration sequence: <strong>1) Higher PPI</strong> &rarr; <strong>2) Earlier Date</strong> &rarr; <strong>3) Higher Experience</strong> &rarr; <strong>4) Alphabetical Name</strong>. Eliminates ranking ambiguities with complete explainability.
                  </p>
                </div>

                {/* Stage 6 */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded">
                      Stage 6
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">database.py &amp; UI</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Persistence &amp; Multi-Chart Visuals</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Assigns unique Run ID (<code className="font-mono">RFP-RUN-XXXXXXXX</code>), saves snapshot to SQLite, renders Trajectory Line Graph (crossover analysis), Radar Profile, and equips evaluator with one-click JSON export.
                  </p>
                </div>
              </div>

              {/* Immutable Mathematical Reference Box */}
              <div className="p-4.5 bg-slate-950 font-mono text-xs text-slate-200 rounded-xl overflow-x-auto space-y-2 border border-slate-800">
                <div className="text-slate-400 font-bold">// Deterministic Mathematical Invariants (ranker.py &amp; rfpMath.ts)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="space-y-1">
                    <div className="text-sky-300">1. Absolute Score = &sum; [ (score / max_score) &times; weight ]</div>
                    <div className="text-emerald-300">2. Criterion Benchmark = max(scores_across_all_proposals)</div>
                    <div className="text-amber-300">3. Criterion Gap = score - benchmark (&le; 0.0)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-indigo-300">4. Relative % = (score / benchmark) &times; 100.0 (safe division)</div>
                    <div className="text-violet-300">5. PPI = &sum; [ relative_% &times; (weight / 100.0) ]</div>
                    <div className="text-emerald-400">6. Tie-Break: PPI desc &rarr; Date asc &rarr; Exp desc &rarr; Name asc</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
