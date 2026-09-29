import React from 'react';
import { Award, Sliders, Play, Terminal, Sun, Moon, History, BookOpen, Key } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  runId: string;
  onOpenDocHub: () => void;
  onOpenDevHub: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiKey?: string;
  onOpenApiKeyModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  runId,
  onOpenDocHub,
  onOpenDevHub,
  theme,
  onToggleTheme,
  apiKey,
  onOpenApiKeyModal
}) => {
  const navItems = [
    { id: 'leaderboard', label: 'Rankings & Scorecards', icon: Award, colorClass: 'text-amber-500 dark:text-amber-400' },
    { id: 'criteria', label: 'Scoring Criteria', icon: Sliders, colorClass: 'text-sky-500 dark:text-sky-400' },
    { id: 'evaluate', label: 'Upload & Evaluate', icon: Play, colorClass: 'text-emerald-500 dark:text-emerald-400' },
    { id: 'history', label: 'Past Evaluations', icon: History, colorClass: 'text-violet-500 dark:text-violet-400' },
  ];

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-white text-lg shadow-sm ring-1 ring-black/10 dark:ring-white/10">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                  RFP Evaluation &amp; Supplier Ranking
                </h1>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 font-medium">
                  {runId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct Document Citations · 100% Precise Math · Complete Audit Trail
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Developer Hub Button */}
            <button
              onClick={onOpenDevHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Open Testing Notebook, Python Scripts, and Configuration"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Tools &amp; Tests</span>
            </button>

            {/* API Key Modal Button */}
            <button
              onClick={onOpenApiKeyModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs border ${
                apiKey
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border-emerald-300 dark:border-emerald-700'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/80 border-amber-300 dark:border-amber-700'
              }`}
              title={apiKey ? "API Key active in session memory (RAM only)" : "Enter Model API Key (Session only)"}
            >
              <Key className={`w-3.5 h-3.5 ${apiKey ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
              <span className="hidden sm:inline">{apiKey ? 'Key Active (Session)' : 'Set API Key'}</span>
              <span className="sm:hidden">{apiKey ? 'Key' : 'API Key'}</span>
            </button>

            {/* Documentation Hub Button */}
            <button
              onClick={onOpenDocHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Open Documentation Hub (Architecture, Caching, Guides, Formulas)"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Documentation Hub</span>
              <span className="sm:hidden">Docs</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-t border-slate-200/60 dark:border-slate-800/80 overflow-x-auto py-1.5 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.colorClass} ${isActive ? 'drop-shadow-xs' : 'opacity-90'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
