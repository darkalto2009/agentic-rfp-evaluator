import React, { useState } from 'react';
import { Key, ShieldCheck, Eye, EyeOff, Check, AlertCircle, Sparkles, X, Lock } from 'lucide-react';

interface ModelApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string, model: string) => void;
  llmModel: string;
}

export const ModelApiKeyModal: React.FC<ModelApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  llmModel
}) => {
  const [inputKey, setInputKey] = useState<string>(apiKey);
  const [selectedModel, setSelectedModel] = useState<string>(llmModel || 'gemini-2.5-flash');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(inputKey.trim(), selectedModel);
    setStatusMessage('API Key registered in session memory!');
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 800);
  };

  const handleOfflineMode = () => {
    onSaveApiKey('', selectedModel);
    onClose();
  };

  const handleClearKey = () => {
    setInputKey('');
    onSaveApiKey('', selectedModel);
    setStatusMessage('API Key cleared from session memory.');
    setTimeout(() => setStatusMessage(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 id="api-key-modal-title" className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Model API Key Configuration</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                  Ephemeral Session
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Volatile in-memory credentials for live qualitative proposal scoring.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Security & In-Memory Lifetime Callout */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/70 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-[11px] uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Strict Security &amp; Runtime Policy</span>
            </div>
            <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300 leading-relaxed">
              Your API key is kept <strong>exclusively in temporary browser application memory (RAM)</strong> for this current session. It is <strong>never written to localStorage, cookies, or disk</strong>. Reloading or refreshing the application immediately flushes the key from memory.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Qualitative LLM Model:
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden cursor-pointer"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended · Fast, Rigorous Citation Extraction)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Qualitative Reasoning)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra-Low Latency Extraction)</option>
              <option value="gpt-4o">gpt-4o (OpenAI Compatible Bridge)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gemini API Key:
              </label>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-medium"
                >
                  Clear Key from Memory
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy... (leave blank for offline demo mode)"
                className="w-full text-xs pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden transition-all"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer"
                title={showPassword ? 'Hide Key' : 'Show Key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              If running in a Docker or CLI container, pass <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">GEMINI_API_KEY</code> via environment variables.
            </span>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleOfflineMode}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-center"
            >
              Continue Offline / Demo Mode
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save &amp; Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
