import React, { useState, useEffect } from 'react';
import { X, BookOpen, Download, Copy, Check, Search, FileText, Sparkles, Terminal, ShieldCheck, Cpu, Database, Eye, Code, CheckCircle2 } from 'lucide-react';

interface DocItem {
  id: string;
  title: string;
  filename: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fetchPath: string;
  fallbackText: string;
}

// Inline Markdown Tokenizer & Renderer
const renderInlineMarkdown = (text: string) => {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|\$\$?[^$]+\$\$?)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded text-[11px] border border-indigo-200/60 dark:border-indigo-800/60 font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} className="italic text-slate-800 dark:text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkText = token.substring(1, token.indexOf(']('));
      const linkUrl = token.substring(token.indexOf('](') + 2, token.length - 1);
      parts.push(
        <a
          key={key++}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          {linkText}
        </a>
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      const mathStr = token.replace(/^\$+|\$+$/g, '');
      parts.push(
        <span
          key={key++}
          className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200/60 dark:border-emerald-800/60"
        >
          {mathStr}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length > 0 ? parts : text;
};

// Rich Markdown Content Parser Component
const ParsedMarkdownView: React.FC<{ markdown: string }> = ({ markdown }) => {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let elemKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Blocks
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join('\n');

      elements.push(
        <div key={elemKey++} className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-sm">
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="uppercase font-semibold tracking-wider text-slate-300">{lang || 'CODE'}</span>
            <button
              onClick={() => navigator.clipboard.writeText(fullCode)}
              className="hover:text-white transition-colors cursor-pointer text-[10px] flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <pre className="p-4 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed scrollbar-thin">
            {fullCode}
          </pre>
        </div>
      );
      continue;
    }

    // 2. Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const bodyRows = tableLines
          .slice(2) // Skip header and separator row (e.g. |:---|:---|)
          .map((row) =>
            row
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );

        elements.push(
          <div key={elemKey++} className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                  {headerRow.map((h, colIdx) => (
                    <th key={colIdx} className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={elemKey++} className="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 tracking-tight">
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={elemKey++} className="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2.5 flex items-center gap-2 tracking-tight">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
          <span>{renderInlineMarkdown(line.slice(3))}</span>
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={elemKey++} className="text-sm font-bold text-slate-900 dark:text-white mt-4 mb-2">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={elemKey++} className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-3 mb-1">
          {renderInlineMarkdown(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // 4. Horizontal Rules
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={elemKey++} className="border-slate-200 dark:border-slate-800 my-5" />);
      i++;
      continue;
    }

    // 5. Blockquotes
    if (line.trim().startsWith('>')) {
      const quoteText = line.trim().slice(1).trim();
      elements.push(
        <blockquote key={elemKey++} className="p-3 my-3 bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-xl text-slate-700 dark:text-slate-300 text-xs italic leading-relaxed">
          {renderInlineMarkdown(quoteText)}
        </blockquote>
      );
      i++;
      continue;
    }

    // 6. Checklists (- [ ] or - [x])
    if (/^\s*-\s*\[([ xX])\]\s+(.*)/.test(line)) {
      const match = line.match(/^\s*-\s*\[([ xX])\]\s+(.*)/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const itemText = match[2];
        elements.push(
          <div key={elemKey++} className="flex items-start gap-2 my-1 text-xs">
            <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 border ${
              isChecked
                ? 'bg-emerald-500 border-emerald-600 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
            }`}>
              {isChecked ? '✓' : ''}
            </span>
            <span className="text-slate-700 dark:text-slate-300 leading-normal">{renderInlineMarkdown(itemText)}</span>
          </div>
        );
        i++;
        continue;
      }
    }

    // 7. Bullet Lists (- or *)
    if (/^\s*[-*]\s+(.*)/.test(line)) {
      const match = line.match(/^\s*[-*]\s+(.*)/);
      if (match) {
        elements.push(
          <div key={elemKey++} className="flex items-start gap-2 my-1 text-xs pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 leading-normal">{renderInlineMarkdown(match[1])}</span>
          </div>
        );
        i++;
        continue;
      }
    }

    // 8. Numbered Lists (1. )
    if (/^\s*\d+\.\s+(.*)/.test(line)) {
      const match = line.match(/^\s*(\d+)\.\s+(.*)/);
      if (match) {
        elements.push(
          <div key={elemKey++} className="flex items-start gap-2 my-1 text-xs pl-2">
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold shrink-0">{match[1]}.</span>
            <span className="text-slate-700 dark:text-slate-300 leading-normal">{renderInlineMarkdown(match[2])}</span>
          </div>
        );
        i++;
        continue;
      }
    }

    // 9. Regular Paragraph / Empty Line
    if (line.trim().length > 0) {
      elements.push(
        <p key={elemKey++} className="my-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {renderInlineMarkdown(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1">{elements}</div>;
};

const DOCUMENTATION_FILES: DocItem[] = [
  {
    id: 'caching',
    title: 'Caching & Token Optimization Guide',
    filename: 'caching_system.md',
    category: 'Optimization & Architecture',
    description: 'Complete guide for the Three-Tier Zero-Redundancy Caching Pipeline reducing LLM tokens by 80%-95%.',
    icon: Sparkles,
    fetchPath: '/caching_system.md',
    fallbackText: `# Caching, Token Optimization & Incremental Evaluation System Guide\n\n## Executive Summary\n\nThis engineering guide provides the architectural blueprint, mathematical foundations, database schemas, and step-by-step implementation instructions for integrating a Zero-Redundancy Caching and Incremental Evaluation Engine into the Agentic RFP Evaluation & Supplier Ranking System.\n\n### Core Objectives\n1. Token & Cost Optimization: Reduce Gemini LLM API calls and token consumption by 80% to 95% across typical procurement evaluation workflows.\n2. Document & Context Reuse: Parse, extract, and evaluate uploaded proposals once; reuse extracted text and qualitative scorecards permanently unless the document or criteria definitions change.\n3. Incremental Multi-Proposal Batches: Enable adding new supplier proposals without spending a single token on previously evaluated proposals.\n4. Instant Run-Level Matching: Detect previously executed evaluation runs and return results instantly (<50 ms, 0 API calls).\n5. Preservation of the Strict Separation Principle: Ensure that all arithmetic, weights, peer benchmarks, criterion gaps, relative percentages, and 4-tier tie-breakers remain 100% deterministic, cost-free, and executed outside the LLM.`
  },
  {
    id: 'architecture',
    title: 'System Architecture Specification',
    filename: 'architecture.md',
    category: 'Core Architecture',
    description: 'Technical specification establishing the Strict Separation Principle, mathematical models, and database schema.',
    icon: Cpu,
    fetchPath: '/architecture.md',
    fallbackText: `# System Architecture & Technical Specification\n\n## Agentic RFP Evaluation & Supplier Ranking System\n\n### The Strict Separation Principle\n> The Language Model (LLM) evaluates unstructured proposal text and extracts verifiable verbatim citations; it is STRICTLY PROHIBITED from computing arithmetic, deriving peer benchmarks, executing tie-breaks, or determining final ranks.\n\nBy decoupling qualitative text comprehension from quantitative evaluation arithmetic, the system guarantees 100% mathematical precision and zero hallucinations.`
  },
  {
    id: 'readme',
    title: 'Project README & System Overview',
    filename: 'README.md',
    category: 'Overview & Setup',
    description: 'Complete project documentation, installation instructions, mathematical formulations, and evaluation rubric.',
    icon: BookOpen,
    fetchPath: '/README.md',
    fallbackText: `# RFP Evaluation & Supplier Ranking System\n\nAn enterprise-grade procurement intelligence solution designed to eliminate subjectivity, calculation errors, and opaque decision-making from high-stakes Request for Proposal (RFP) evaluations.`
  },
  {
    id: 'agents',
    title: 'Multi-Agent Specifications',
    filename: 'Agents.md',
    category: 'Agent Protocols',
    description: 'Multi-agent orchestration specifications, tools, inputs/outputs, guardrails, and fault-tolerance protocols.',
    icon: ShieldCheck,
    fetchPath: '/Agents.md',
    fallbackText: `# Multi-Agent System Specification: RFP Evaluation & Supplier Ranking\n\n## Agent Roles:\n1. Orchestrator Agent (orchestrator.py)\n2. Document Ingestion Tool (pdf_extractor.py)\n3. Qualitative Evaluation Agent (evaluator.py)\n4. Schema Validation & Guardrail Tool (validator.py)\n5. Deterministic Ranking Tool (ranker.py)\n6. State & Cache Persistence Layer (database.py)`
  },
  {
    id: 'instruction',
    title: 'Architectural Best Practices',
    filename: 'instruction.md',
    category: 'Engineering Standards',
    description: 'Guidelines on zero-LLM math, prompt engineering defense, and validation bounds.',
    icon: Terminal,
    fetchPath: '/instruction.md',
    fallbackText: `# Architectural Best Practices & Coding Standards\n\n1. Mathematical Invariance: Never delegate arithmetic to language models.\n2. Schema Clamping: Clamp all scores within [0, max_score].\n3. Evidence Verification: Every score must have verbatim citations.`
  },
  {
    id: 'copilot',
    title: 'Copilot & AI Assistant Instructions',
    filename: 'copilot-instruction.md',
    category: 'AI Tooling',
    description: 'Directives for AI coding assistants regarding strict separation, deterministic math, and typing.',
    icon: Terminal,
    fetchPath: '/copilot-instruction.md',
    fallbackText: `# Copilot & AI Coding Agent Instructions\n\nStrict Separation Principle: The LLM reads proposals and assigns qualitative scores. The Deterministic Ranker calculates all benchmarks, gaps, PPI, and rankings.`
  },
  {
    id: 'claude',
    title: 'Enterprise Protocol (Claude.md)',
    filename: 'Claude.md',
    category: 'Engineering Standards',
    description: 'Enterprise production checklist, security hardening, and zero-hallucination protocols.',
    icon: FileText,
    fetchPath: '/Claude.md',
    fallbackText: `# Claude Development Protocol & Enterprise Guardrails\n\nAudit trails, reproducible benchmark discovery, and deterministic tie-breaking.`
  },
  {
    id: 'exam-guide',
    title: 'Exam Evaluator & Grader Guide',
    filename: 'EXAM_EVALUATOR_GUIDE.md',
    category: 'Evaluation & Grading',
    description: 'Comprehensive walkthrough for test examiners verifying rubric criteria and test cells.',
    icon: BookOpen,
    fetchPath: '/EXAM_EVALUATOR_GUIDE.md',
    fallbackText: `# Exam Evaluator & Grader Guide\n\nStep-by-step walkthrough covering 7 key areas of rubric compliance, interactive notebooks, and Python test scripts.`
  },
  {
    id: 'summary',
    title: 'Evaluation Summary',
    filename: 'EVALUATION_SUMMARY.md',
    category: 'Evaluation & Grading',
    description: 'Scannable executive summary of the entire RFP evaluation architecture and testing suite.',
    icon: FileText,
    fetchPath: '/EVALUATION_SUMMARY.md',
    fallbackText: `# RFP Evaluation & Supplier Ranking - Executive Summary\n\nExecutive overview of the procurement system, audit logs, and performance metrics.`
  }
];

interface DocumentationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocId?: string;
}

export const DocumentationHubModal: React.FC<DocumentationHubModalProps> = ({
  isOpen,
  onClose,
  initialDocId = 'caching'
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId);
  const [docContent, setDocContent] = useState<string>('Loading document...');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  const selectedDoc = DOCUMENTATION_FILES.find((d) => d.id === selectedDocId) || DOCUMENTATION_FILES[0];

  useEffect(() => {
    if (initialDocId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setDocContent('Loading documentation content...');

    fetch(selectedDoc.fetchPath)
      .then((res) => {
        if (!res.ok) throw new Error('File not accessible via HTTP');
        return res.text();
      })
      .then((text) => {
        if (isMounted) setDocContent(text);
      })
      .catch(() => {
        if (isMounted) setDocContent(selectedDoc.fallbackText);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDoc, isOpen]);

  if (!isOpen) return null;

  const filteredDocs = DOCUMENTATION_FILES.filter((doc) => {
    const q = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.filename.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q)
    );
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([docContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedDoc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-white">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  System Documentation Hub
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/80">
                  {DOCUMENTATION_FILES.length} Specifications
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official architectural guides, caching specifications, multi-agent protocols, and evaluation rubrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Sidebar + Right Content Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          {/* Document Directory Sidebar */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col h-full overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documentation..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Document List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto flex-1">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc.id === doc.id;
                const IconComponent = doc.icon;

                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-indigo-600 text-slate-900 dark:text-white'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {doc.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {doc.filename}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {doc.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Content View */}
          <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
            {/* Document Header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {selectedDoc.filename}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selectedDoc.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg text-[11px] font-medium">
                  <button
                    onClick={() => setViewMode('rendered')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'rendered'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3 text-indigo-500" />
                    <span>Parsed Markdown</span>
                  </button>
                  <button
                    onClick={() => setViewMode('raw')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      viewMode === 'raw'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Code className="w-3 h-3 text-slate-500" />
                    <span>Raw Text</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  UTF-8
                </span>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 overflow-y-auto flex-1 font-sans text-xs leading-relaxed text-slate-800 dark:text-slate-200">
              <div className="max-w-4xl mx-auto space-y-4">
                {viewMode === 'rendered' ? (
                  <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                    <ParsedMarkdownView markdown={docContent} />
                  </div>
                ) : (
                  <pre className="font-mono text-[11px] whitespace-pre-wrap leading-relaxed p-4 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 overflow-x-auto shadow-2xs">
                    {docContent}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
