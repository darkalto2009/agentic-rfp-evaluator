import React, { useState } from 'react';
import { FileCode, Download, Copy, Check, FileText, CheckCircle2 } from 'lucide-react';

interface CodeFile {
  name: string;
  category: string;
  description: string;
  path: string;
}

const PROJECT_FILES: CodeFile[] = [
  {
    name: "rfp_evaluation_test.ipynb",
    category: "Prototyping & Testing",
    description: "Jupyter notebook with 7 step-by-step cells validating the entire pipeline before deployment.",
    path: "/rfp_evaluation_test.ipynb"
  },
  {
    name: "app.py",
    category: "Streamlit UI",
    description: "Streamlit application entry point with 5 main views (Criteria, Inputs, Leaderboard, Drill-down, Export).",
    path: "/app.py"
  },
  {
    name: "orchestrator.py",
    category: "Agent Core",
    description: "Orchestrator Agent coordinating Document Tool, Evaluator, Validator, and Ranking Tool.",
    path: "/orchestrator.py"
  },
  {
    name: "evaluator.py",
    category: "Agent Core",
    description: "Evaluation Agent prompting Google Gemini or heuristic fallback for evidence-grounded scoring.",
    path: "/evaluator.py"
  },
  {
    name: "validator.py",
    category: "Agent Core",
    description: "Validation Tool enforcing schema bounds [0, max_score], filling missing criteria with 0.0, and logging warnings.",
    path: "/validator.py"
  },
  {
    name: "ranker.py",
    category: "Agent Core",
    description: "Pure Python deterministic tool computing absolute score, peer benchmark, gap, relative %, PPI, and 4-tier tie-breaks.",
    path: "/ranker.py"
  },
  {
    name: "database.py",
    category: "Persistence",
    description: "SQLite persistence layer managing evaluation_criteria, rfp_runs, and supplier_results tables.",
    path: "/database.py"
  },
  {
    name: "pdf_extractor.py",
    category: "Document Tool",
    description: "Extracts clean text and page tokens from uploaded proposals using PyMuPDF / pypdf fallback.",
    path: "/pdf_extractor.py"
  },
  {
    name: "generate_synthetic_pdfs.py",
    category: "Data Generation",
    description: "Generates 4 realistic multi-page supplier PDFs (Apex, BrightPath, NexaWorks, Orbit).",
    path: "/generate_synthetic_pdfs.py"
  },
  {
    name: "seed_db.py",
    category: "Persistence",
    description: "Seeds SQLite database with default 5 criteria totaling 100% weight.",
    path: "/seed_db.py"
  },
  {
    name: "requirements.txt",
    category: "Configuration",
    description: "Complete list of verified Python dependencies for Streamlit Community Cloud and local run.",
    path: "/requirements.txt"
  },
  {
    name: "README.md",
    category: "Documentation",
    description: "Comprehensive documentation covering architecture, mathematical formulas, setup, and rubric mapping.",
    path: "/README.md"
  },
  {
    name: "sample_rfp_run_export.json",
    category: "Artifacts",
    description: "Sample exported JSON payload for one complete RFP run.",
    path: "/sample_rfp_run_export.json"
  }
];

export const CodeArtifactsHub: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(PROJECT_FILES[1]); // app.py default
  const [fileContent, setFileContent] = useState<string>('Loading file contents...');
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    fetch(selectedFile.path)
      .then((res) => {
        if (!res.ok) throw new Error('File not found in public root');
        return res.text();
      })
      .then((text) => {
        if (isMounted) setFileContent(text);
      })
      .catch((err) => {
        if (isMounted) {
          setFileContent(`# ${selectedFile.name}\n# Located at: ./${selectedFile.name}\n# [File ready in workspace project directory]`);
        }
      });
    return () => { isMounted = false; };
  }, [selectedFile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">
              Modular Python Application Codebase Hub
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete source code structured for Streamlit Community Cloud deployment and classroom grading.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy File'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {selectedFile.name}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* File Navigator Sidebar */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
            Project Files ({PROJECT_FILES.length})
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {PROJECT_FILES.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 ${
                    isSelected ? 'bg-slate-100 border-l-4 border-slate-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {file.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {file.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300 font-medium">
              ./{selectedFile.name}
            </span>
            <span className="text-slate-500 text-[11px]">
              UTF-8 · Python / JSON / Markdown
            </span>
          </div>
          <div className="p-4 text-xs font-mono text-slate-200 overflow-x-auto flex-1 max-h-[550px]">
            <pre className="leading-relaxed">{fileContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
