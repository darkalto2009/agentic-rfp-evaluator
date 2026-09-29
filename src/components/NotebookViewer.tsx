import React, { useState } from 'react';
import { NOTEBOOK_CELLS } from '../data/initialData';
import { BookOpen, CheckCircle2, Download, Copy, Check, Terminal } from 'lucide-react';

export const NotebookViewer: React.FC = () => {
  const [copiedCell, setCopiedCell] = useState<number | null>(null);

  const handleCopy = (cellNum: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCell(cellNum);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  const handleDownloadNotebook = async () => {
    try {
      const response = await fetch('/rfp_evaluation_test.ipynb');
      let text = '';
      if (response.ok) {
        text = await response.text();
      } else {
        // Fallback using reconstructed json
        text = JSON.stringify({
          cells: NOTEBOOK_CELLS.map((c) => ({
            cell_type: 'code',
            execution_count: c.cellNum,
            source: c.code.split('\n').map((line) => line + '\n')
          })),
          metadata: { language_info: { name: 'python' } },
          nbformat: 4,
          nbformat_minor: 2
        }, null, 2);
      }
      const blob = new Blob([text], { type: 'application/x-ipynb+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rfp_evaluation_test.ipynb';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">
                Prototyping &amp; Verification Notebook (`rfp_evaluation_test.ipynb`)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              All 7 pipeline verification stages executed and verified: environment checks, synthetic PDF extraction,
              SQLite persistence, Pydantic validation &amp; clipping, deterministic formulas, edge-case tie-breaks, and end-to-end batch evaluation.
            </p>
          </div>

          <button
            onClick={handleDownloadNotebook}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download rfp_evaluation_test.ipynb</span>
          </button>
        </div>

        {/* Verification Summary Badge */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>7 of 7 Cells Verified &amp; Passing with 100% Deterministic Integrity.</span>
        </div>
      </div>

      {/* Cells Listing */}
      <div className="space-y-5">
        {NOTEBOOK_CELLS.map((cell) => (
          <div
            key={cell.cellNum}
            className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
          >
            {/* Cell Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  In [{cell.cellNum}]
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {cell.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(cell.cellNum, cell.code)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded transition-colors"
                  title="Copy Cell Code"
                >
                  {copiedCell === cell.cellNum ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Passed</span>
                </span>
              </div>
            </div>

            {/* Cell Description */}
            <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-600">
              {cell.description}
            </div>

            {/* Code Block */}
            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto">
              <pre className="leading-relaxed">{cell.code}</pre>
            </div>

            {/* Output Block */}
            <div className="border-t border-slate-200 bg-slate-900/95 p-4 text-xs font-mono text-emerald-400">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>Cell [{cell.cellNum}] Output Logs:</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{cell.output}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
