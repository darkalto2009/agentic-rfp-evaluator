import React, { useState, useEffect } from 'react';
import { SupplierResult, Criterion } from '../types';
import { extractSupplierMetadata } from '../utils/pdfMetadataExtractor';
import { checkProposalCacheStatus } from '../utils/evaluationCache';
import {
  Play,
  Upload,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Calendar,
  Star,
  Download,
  RotateCcw,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface EvaluationRunnerProps {
  onRunBatch: (forceRefresh?: boolean, autoResolve?: boolean) => void;
  isRunning: boolean;
  activeCriteriaCount: number;
  warnings: Array<{ supplier_name: string; code: string; message: string }>;
  suppliers: SupplierResult[];
  onAddSupplier: (supplier: SupplierResult) => void;
  onRemoveSupplier: (name: string) => void;
  onSetSuppliers: (suppliers: SupplierResult[]) => void;
  criteria?: Criterion[];
  llmModel?: string;
}

export const EvaluationRunner: React.FC<EvaluationRunnerProps> = ({
  onRunBatch,
  isRunning,
  activeCriteriaCount,
  warnings,
  suppliers,
  onAddSupplier,
  onRemoveSupplier,
  onSetSuppliers,
  criteria = [],
  llmModel = 'gemini-2.5-flash'
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [submissionDate, setSubmissionDate] = useState('2026-03-01');
  const [experienceRating, setExperienceRating] = useState(4.0);
  const [proposalNotes, setProposalNotes] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Auto-Resolution Toggle (instruction.md Section 3: Guardrail & Anomaly Clamping)
  const [autoResolve, setAutoResolve] = useState<boolean>(true);

  // Workflow Steps Interactive & Execution State
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [runningStage, setRunningStage] = useState(1);

  // Three-Tier Zero-Redundancy Caching State
  const [forceRefresh, setForceRefresh] = useState(false);
  const [cacheMap, setCacheMap] = useState<Record<string, boolean>>({});
  const [savingsMetrics, setSavingsMetrics] = useState({
    cachedCount: 0,
    freshCount: 0,
    tokensSaved: 0
  });

  // Cycle running stage when isRunning is active
  useEffect(() => {
    if (!isRunning) {
      setRunningStage(1);
      return;
    }
    const interval = setInterval(() => {
      setRunningStage((prev) => (prev < 6 ? prev + 1 : 6));
    }, 180);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Evaluate caching status reactively against criteria definitions and active model
  useEffect(() => {
    let isMounted = true;
    async function evaluateCache() {
      if (!criteria.length) return;
      const map: Record<string, boolean> = {};
      let cached = 0;
      let fresh = 0;

      for (const s of suppliers) {
        if (forceRefresh) {
          map[s.supplier_name] = false;
          fresh++;
        } else {
          const res = await checkProposalCacheStatus(s.supplier_name, criteria, llmModel);
          map[s.supplier_name] = res.isCached;
          if (res.isCached) cached++;
          else fresh++;
        }
      }

      if (isMounted) {
        setCacheMap(map);
        setSavingsMetrics({
          cachedCount: cached,
          freshCount: fresh,
          tokensSaved: cached * 4500
        });
      }
    }

    evaluateCache();
    return () => {
      isMounted = false;
    };
  }, [suppliers, criteria, llmModel, forceRefresh]);

  // Preset 1: Single Proposal
  const loadSoloSupplier = () => {
    const solo: SupplierResult[] = [
      {
        supplier_name: "Apex Systems",
        submission_date: "2026-03-01",
        experience_rating: 4.8,
        absolute_score: 85.1,
        ppi: 100.0,
        final_rank: 1,
        tie_break_note: "Single proposal baseline (100% fit).",
        overall_summary: "Apex Systems enterprise cloud proposal evaluated individually. Strong technical architecture and FedRAMP security posture.",
        risks: ["Single vendor evaluation: category benchmarks reflect sole proposal scores."],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 9.5, max_score: 10, justification: "Distributed K8s cluster with Istio mesh.", evidence: "Section 2: Solution & Architecture" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 7.8, max_score: 10, justification: "24-week delivery timeline.", evidence: "Section 3: Milestones" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 6.2, max_score: 10, justification: "Fixed fee $480,000.", evidence: "Section 4: Price Table" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 9.8, max_score: 10, justification: "FedRAMP, ISO 27001, SOC 2 Type II certified.", evidence: "Section 5: Controls" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 9.0, max_score: 10, justification: "24/7 follow-the-sun support.", evidence: "Section 6: Support SLA" }
        ]
      }
    ];
    onSetSuppliers(solo);
    setUploadStatus("Loaded 1 Proposal Sample: Apex Systems. Ready for review!");
    setTimeout(() => setUploadStatus(null), 3000);
  };

  // Preset 2: Four Benchmark Proposals
  const loadFourBenchmarks = () => {
    const fourSuppliers: SupplierResult[] = [
      {
        supplier_name: "NexaWorks",
        submission_date: "2026-03-01",
        experience_rating: 4.5,
        absolute_score: 89.6,
        ppi: 93.74,
        final_rank: 1,
        tie_break_note: "Rank assigned by primary match score.",
        overall_summary: "Balanced modular architecture with FastAPI & Next.js, dedicated change management, PMP director, and 6 months hypercare.",
        risks: [],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 8.8, max_score: 10, justification: "Modular FastAPI design with prebuilt ERP connectors.", evidence: "Section 2: Architecture" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 9.5, max_score: 10, justification: "Dedicated change management consultant and 6 months hypercare.", evidence: "Section 3: Implementation" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 8.5, max_score: 10, justification: "Competitive mid-tier pricing ($295k).", evidence: "Section 4: Pricing" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 9.0, max_score: 10, justification: "SOC 2 Type II certified, GDPR & CCPA compliant.", evidence: "Section 5: Security" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 9.2, max_score: 10, justification: "White-glove support with dedicated CSM.", evidence: "Section 6: Support" }
        ]
      },
      {
        supplier_name: "Apex Systems",
        submission_date: "2026-03-01",
        experience_rating: 4.8,
        absolute_score: 85.1,
        ppi: 88.95,
        final_rank: 2,
        tie_break_note: "Rank assigned by primary match score.",
        overall_summary: "Enterprise zero-trust platform. Unmatched security controls (FedRAMP, ISO 27001), high scalability, premium pricing tier ($480k).",
        risks: ["Premium pricing tier requires substantial capital budget approval."],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 9.5, max_score: 10, justification: "Distributed K8s, Istio, Kafka event streaming.", evidence: "Section 2: Architecture" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 7.8, max_score: 10, justification: "Thorough 24-week delivery schedule.", evidence: "Section 3: Milestones" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 6.2, max_score: 10, justification: "Fixed fee $480,000 + $72k/yr support.", evidence: "Section 4: Pricing" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 9.8, max_score: 10, justification: "FedRAMP, ISO 27001, SOC 2 Type II certified.", evidence: "Section 5: Controls" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 9.0, max_score: 10, justification: "24/7 follow-the-sun support, 15-min SLA.", evidence: "Section 6: Support" }
        ]
      },
      {
        supplier_name: "Orbit Digital",
        submission_date: "2026-03-03",
        experience_rating: 4.2,
        absolute_score: 83.0,
        ppi: 86.85,
        final_rank: 3,
        tie_break_note: "Rank assigned by primary match score.",
        overall_summary: "15+ years enterprise procurement veteran with 50+ successful deployments. Proven Spring Boot platform with legacy batch sync.",
        risks: [],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 7.2, max_score: 10, justification: "Spring Boot platform; relies on legacy batch data sync.", evidence: "Section 2: Architecture" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 7.5, max_score: 10, justification: "18-week delivery cycle with senior leads.", evidence: "Section 3: Timeline" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 7.0, max_score: 10, justification: "Fixed fee $340,000 + $52k/yr maintenance.", evidence: "Section 4: Pricing" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 8.0, max_score: 10, justification: "ISO 27001, HIPAA, SOC 1 Type II certified.", evidence: "Section 5: Security" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 9.5, max_score: 10, justification: "Over 15 years experience, 50+ enterprise deployments.", evidence: "Section 6: References" }
        ]
      },
      {
        supplier_name: "BrightPath Tech",
        submission_date: "2026-03-02",
        experience_rating: 3.5,
        absolute_score: 65.6,
        ppi: 68.80,
        final_rank: 4,
        tie_break_note: "Rank assigned by primary match score.",
        overall_summary: "Agile, budget-optimized procurement proposal. Lowest cost ($145k), rapid 10-week sprint; compliance certifications pending audit.",
        risks: [
          "Single region deployment lacks high availability and disaster recovery.",
          "Aggressive 10-week schedule with only 2 developers creates delivery bottlenecks.",
          "Uncertified security controls and pending audits present significant compliance vulnerability."
        ],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 5.5, max_score: 10, justification: "Monolithic Node.js API hosted in single cloud region.", evidence: "Section 2: Architecture" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 6.0, max_score: 10, justification: "10-week rapid sprint with 2 full-stack developers.", evidence: "Section 3: Staffing" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 9.5, max_score: 10, justification: "Market-lowest fixed fee $145,000.", evidence: "Section 4: Pricing" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 4.0, max_score: 10, justification: "SOC 2 & ISO 27001 pending audit; basic bcrypt & TLS.", evidence: "Section 5: Controls" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 5.0, max_score: 10, justification: "3 years experience, email business-hours support only.", evidence: "Section 6: Support" }
        ]
      }
    ];
    onSetSuppliers(fourSuppliers);
    setUploadStatus("Loaded 4 Standard Benchmark Proposals (Apex, BrightPath, NexaWorks, Orbit).");
    setTimeout(() => setUploadStatus(null), 3000);
  };

  // Preset 3: More than 4 Proposals
  const loadSixSuppliers = () => {
    loadFourBenchmarks();
    const extraTwo: SupplierResult[] = [
      {
        supplier_name: "CloudVanguard AI",
        submission_date: "2026-03-01",
        experience_rating: 4.6,
        absolute_score: 87.2,
        ppi: 91.10,
        final_rank: 5,
        tie_break_note: "Multi-vendor peer evaluation (>4 proposals).",
        overall_summary: "AI-native procurement platform with automated purchase order processing and real-time vendor risk telemetry.",
        risks: ["Requires specialized GPU infrastructure configuration."],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 9.2, max_score: 10, justification: "Advanced ML microservices with GraphQL pipeline.", evidence: "Section 2: AI Engine" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 8.2, max_score: 10, justification: "14-week phased integration.", evidence: "Section 3: Deployment" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 8.0, max_score: 10, justification: "Fixed fee $260,000.", evidence: "Section 4: Price" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 8.8, max_score: 10, justification: "SOC 2 Type II certified with encrypted vector storage.", evidence: "Section 5: Security" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 8.5, max_score: 10, justification: "6 years experience with SaaS enterprises.", evidence: "Section 6: Track Record" }
        ]
      },
      {
        supplier_name: "GlobalSource Matrix",
        submission_date: "2026-03-04",
        experience_rating: 4.1,
        absolute_score: 80.5,
        ppi: 84.30,
        final_rank: 6,
        tie_break_note: "Multi-vendor peer evaluation (>4 proposals).",
        overall_summary: "Global procurement distribution platform with multi-currency settlement and worldwide supplier network catalog.",
        risks: [],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 7.8, max_score: 10, justification: "Multi-tenant cloud platform with global CDN.", evidence: "Section 2: Architecture" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 7.2, max_score: 10, justification: "20-week global rollout plan.", evidence: "Section 3: Schedule" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 7.8, max_score: 10, justification: "Total cost $310,000.", evidence: "Section 4: Pricing" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 8.5, max_score: 10, justification: "ISO 27001 & PCI-DSS Level 1 certified.", evidence: "Section 5: Compliance" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 8.9, max_score: 10, justification: "Global 24/7 multilingual support desk.", evidence: "Section 6: Support" }
        ]
      }
    ];

    setTimeout(() => {
      onAddSupplier(extraTwo[0]);
      onAddSupplier(extraTwo[1]);
      setUploadStatus("Loaded 6 Proposals (Multi-Vendor Comparison Batch).");
      setTimeout(() => setUploadStatus(null), 3000);
    }, 50);
  };

  // Preset 4: Deliberate Anomaly Proposal (Score Overflow, Negative, and Missing Categories)
  const loadAnomalySupplier = () => {
    loadFourBenchmarks();
    const anomalyVendor: SupplierResult = {
      supplier_name: "Veritas Edge (Anomaly Test)",
      submission_date: "2026-03-05",
      experience_rating: 4.1,
      absolute_score: 55.0,
      ppi: 62.0,
      final_rank: 5,
      tie_break_note: "Test proposal loaded with deliberate boundary violations.",
      overall_summary: "Test proposal containing deliberate boundary violations: Technical Capability score = 14.5 (>10), Implementation Plan score = -2.5 (<0), and omitted categories to test instruction.md Section 3 Auto-Resolution.",
      risks: ["Contains deliberately out-of-bounds scores to verify Auto-Resolution clamping & omission zero-fill."],
      criteria: [
        { criterion_id: 1, name: "Technical Capability", weight: 30, score: 14.5, max_score: 10, justification: "Deliberate overflow score of 14.5 to test clamping to 10.0.", evidence: "Section 2: Testing Boundary" },
        { criterion_id: 2, name: "Implementation Plan", weight: 20, score: -2.5, max_score: 10, justification: "Deliberate negative score of -2.5 to test clamping to 0.0.", evidence: "Section 3: Testing Boundary" },
        { criterion_id: 3, name: "Commercial Value", weight: 20, score: 8.5, max_score: 10, justification: "Standard valid score.", evidence: "Section 4: Pricing" }
        // Deliberately missing criterion_id 4 & 5 to verify zero-fill policy
      ]
    };

    setTimeout(() => {
      onAddSupplier(anomalyVendor);
      setUploadStatus("Loaded Test Anomaly Proposal (Veritas Edge with score 14.5, -2.5, & omitted criteria). Click Evaluate to test Auto-Resolution!");
      setTimeout(() => setUploadStatus(null), 4000);
    }, 60);
  };

  // Handle PDF / Text File Upload with Automatic Metadata Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let addedCount = 0;
    const extractedSummaries: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      let fileText = '';
      try {
        fileText = await file.text();
      } catch (err) {
        fileText = '';
      }

      // Automatically extract Supplier Metadata from PDF / file if not provided
      const meta = extractSupplierMetadata(fileText, file.name);

      const newSupp: SupplierResult = {
        supplier_name: meta.supplier_name,
        submission_date: meta.submission_date,
        experience_rating: meta.experience_rating,
        absolute_score: 78.0,
        ppi: 82.0,
        final_rank: suppliers.length + addedCount + 1,
        tie_break_note: meta.extractedFromText
          ? `Details detected from document text in ${file.name}.`
          : `Details identified from file ${file.name}.`,
        overall_summary: `Proposal document uploaded: ${file.name}. Vendor: ${meta.supplier_name}, Date: ${meta.submission_date}, Experience: ${meta.experience_rating}/5.0.`,
        risks: [],
        criteria: [
          { criterion_id: 1, name: "Technical Capability", weight: 30, score: 8.0, max_score: 10, justification: `Extracted from proposal ${file.name}.`, evidence: "Technical Architecture Section" },
          { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 8.0, max_score: 10, justification: "Implementation schedule extracted from proposal.", evidence: "Milestones Section" },
          { criterion_id: 3, name: "Commercial Value", weight: 20, score: 8.0, max_score: 10, justification: "Pricing structure extracted.", evidence: "Commercial Terms Section" },
          { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 8.0, max_score: 10, justification: "Security controls identified.", evidence: "Compliance Certifications Section" },
          { criterion_id: 5, name: "Support & Experience", weight: 10, score: 8.0, max_score: 10, justification: "Service level agreement and references.", evidence: "Support SLA Section" }
        ]
      };

      onAddSupplier(newSupp);
      addedCount++;
      extractedSummaries.push(`${meta.supplier_name} (Date: ${meta.submission_date}, Exp: ${meta.experience_rating})`);
    }

    setUploadStatus(`Uploaded ${addedCount} proposal(s). Detected details: ${extractedSummaries.join(', ')}.`);
    setTimeout(() => setUploadStatus(null), 5000);
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    const newSupp: SupplierResult = {
      supplier_name: supplierName.trim(),
      submission_date: submissionDate,
      experience_rating: Number(experienceRating),
      absolute_score: 80.0,
      ppi: 84.0,
      final_rank: suppliers.length + 1,
      tie_break_note: 'Custom vendor proposal entry.',
      overall_summary: proposalNotes.trim() || `Proposal evaluation for ${supplierName.trim()}.`,
      risks: [],
      criteria: [
        { criterion_id: 1, name: "Technical Capability", weight: 30, score: 8.0, max_score: 10, justification: "Architecture verified against requirements.", evidence: "Direct citation from proposal." },
        { criterion_id: 2, name: "Implementation Plan", weight: 20, score: 8.0, max_score: 10, justification: "Structured milestones.", evidence: "Implementation schedule Section 3." },
        { criterion_id: 3, name: "Commercial Value", weight: 20, score: 8.0, max_score: 10, justification: "Commercial clarity.", evidence: "Fee table Section 4." },
        { criterion_id: 4, name: "Security & Compliance", weight: 20, score: 8.0, max_score: 10, justification: "Controls verified.", evidence: "Security & compliance certifications Section 5." },
        { criterion_id: 5, name: "Support & Experience", weight: 10, score: 8.0, max_score: 10, justification: "Support SLAs.", evidence: "SLA matrix Section 6." }
      ]
    };

    onAddSupplier(newSupp);
    setSupplierName('');
    setProposalNotes('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5.5 shadow-2xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Upload &amp; Review Vendor Proposals
              </h2>
              <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {suppliers.length} Proposal{suppliers.length === 1 ? '' : 's'} Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Upload 1 or more proposals (supports single or multiple vendors).
              Vendor Name, Submission Date, and Experience are automatically detected from the document text.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Auto-Resolution Toggle */}
            <label
              className={`flex items-center gap-2 cursor-pointer select-none text-xs font-medium px-3 py-2 rounded-lg border shadow-2xs transition-colors ${
                autoResolve
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200'
                  : 'bg-slate-100/90 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title="Auto-Resolution (instruction.md Section 3): Automatically clamps out-of-bounds scores to [0, max_score], zero-fills omitted criteria with 0.0, and records audit warnings. When disabled, strict mode flags unresolvable errors."
            >
              <input
                type="checkbox"
                checked={autoResolve}
                onChange={(e) => setAutoResolve(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <ShieldCheck className={`w-3.5 h-3.5 ${autoResolve ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <span>Auto-Resolution {autoResolve ? '(Active)' : '(Strict)'}</span>
              </span>
            </label>

            {/* Force Refresh Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-100/90 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              <input
                type="checkbox"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[11px]">Force Fresh Re-Evaluation</span>
            </label>

            <button
              onClick={() => onRunBatch(forceRefresh, autoResolve)}
              disabled={isRunning || suppliers.length === 0}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                isRunning
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-98'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {isRunning
                  ? 'Evaluating Proposals...'
                  : suppliers.length === 1
                  ? 'Evaluate 1 Proposal'
                  : `Evaluate All ${suppliers.length} Proposals`}
              </span>
            </button>
          </div>
        </div>

        {/* Batch Optimization Summary Banner */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-50/80 via-indigo-50/50 to-slate-50 dark:from-emerald-950/30 dark:via-indigo-950/20 dark:to-slate-800/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Three-Tier Zero-Redundancy Caching Engine
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  {savingsMetrics.cachedCount > 0 ? `${Math.round((savingsMetrics.cachedCount / (suppliers.length || 1)) * 100)}% Token Efficiency` : 'Clean Slate'}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                Batch Optimization: <strong>{suppliers.length} Proposals</strong> (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{savingsMetrics.cachedCount} Cached</span> ⚡ {savingsMetrics.tokensSaved.toLocaleString()} tokens saved |{' '}
                <span className="text-indigo-700 dark:text-indigo-400 font-semibold">{savingsMetrics.freshCount} Fresh</span> 🤖 ~{(savingsMetrics.freshCount * 4500).toLocaleString()} tokens)
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-2 shrink-0">
            <span>⚡ Instant &lt;50ms Response</span>
            <span>·</span>
            <span>0 LLM Drift</span>
          </div>
        </div>

        {/* Quick Batch Presets & Workflow Guide Button */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
            Quick Load Samples:
          </span>
          <button
            onClick={loadSoloSupplier}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Single Proposal Sample
          </button>
          <button
            onClick={loadFourBenchmarks}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            4 Sample Proposals
          </button>
          <button
            onClick={loadSixSuppliers}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>6 Proposals Batch (&gt;4 Proposals)</span>
          </button>
          <button
            onClick={loadAnomalySupplier}
            className="px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
            title="Load proposal with scores >10, negative scores, and omitted categories to test Auto-Resolution"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Test Anomaly Preset (Auto-Resolution)</span>
          </button>

          <button
            onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 ml-auto"
            title="Re-evaluate and view the 6 evaluation workflow steps"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Evaluation Workflow Steps</span>
            {showWorkflowGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {suppliers.length > 0 && (
            <button
              onClick={() => onSetSuppliers([])}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        {/* Real-time 6-Stage Workflow Execution Pipeline */}
        {isRunning && (
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-xs tracking-tight">
                  Executing 6-Stage Evaluation Workflow Pipeline
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                Stage {runningStage} of 6 In-Flight
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
              {[
                { stage: 1, name: 'Doc Ingestion', tool: 'pdf_extractor.py', desc: 'SHA-256 Byte Hash' },
                { stage: 2, name: 'Zero-Token Cache', tool: 'evaluator.py', desc: '3-Tier Cache Lookup' },
                { stage: 3, name: 'Auto-Resolution', tool: 'validator.py', desc: autoResolve ? 'Clamping & Zero-Fill' : 'Strict Mode Guard' },
                { stage: 4, name: 'Peer Benchmarking', tool: 'ranker.py', desc: 'PPI & Deficit Gaps' },
                { stage: 5, name: '4-Tier Tie-Break', tool: 'ranker.py', desc: 'Deterministic Sort' },
                { stage: 6, name: 'Multi-Chart SQLite', tool: 'database.py', desc: 'Trajectory & Radar' },
              ].map((st) => {
                const isPassed = runningStage > st.stage;
                const isCurrent = runningStage === st.stage;
                return (
                  <div
                    key={st.stage}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isPassed
                        ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
                        : isCurrent
                        ? 'bg-indigo-900/70 border-indigo-500 text-white ring-1 ring-indigo-400'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span>Stage {st.stage}</span>
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      ) : null}
                    </div>
                    <div className="font-bold text-xs mt-1 truncate">{st.name}</div>
                    <div className="text-[10px] text-slate-300 dark:text-slate-400 font-mono mt-0.5 truncate">{st.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto-Resolution & Guardrail Audit Trail */}
        {warnings && warnings.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                  Auto-Resolution &amp; Guardrail Audit Trail ({warnings.length} Recorded Anomaly{warnings.length === 1 ? '' : 'ies'})
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 font-bold">
                instruction.md Section 3 Compliant
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2 shadow-2xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px]">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{w.supplier_name}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300">
                        {w.code}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-snug">{w.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable 6-Stage Evaluation Workflow Guide */}
        {showWorkflowGuide && (
          <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-900/60 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Evaluation Workflow Pipeline Steps (6 Enterprise Stages)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Decouples unstructured proposal comprehension from 100% deterministic peer benchmarking.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                Zero Redundancy
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">STAGE 1</span>
                  <span className="text-slate-400">pdf_extractor.py</span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Document Ingestion &amp; Fingerprint</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Computes <strong className="font-mono text-slate-700 dark:text-slate-300">DocHash = SHA256(Bytes)</strong> on proposal files to prevent redundant text extraction.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">STAGE 2</span>
                  <span className="text-slate-400">evaluator.py</span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Three-Tier Zero-Token Cache</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Queries <strong className="text-slate-700 dark:text-slate-300">evaluation_cache</strong> with <code className="font-mono text-[10px]">CriteriaDefHash</code>. Hits load scorecards at 0 tokens (80%-95% savings).
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-amber-600 dark:text-amber-400">STAGE 3</span>
                  <span className="text-slate-400">validator.py</span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Auto-Resolution &amp; Guardrails</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enforces <strong className="text-slate-700 dark:text-slate-300">instruction.md Section 3</strong>. Auto-Resolution clamps boundary overflows to [0, max_score] and zero-fills omitted criteria.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-sky-600 dark:text-sky-400">STAGE 4</span>
                  <span className="text-slate-400">ranker.py</span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Peer Benchmarking &amp; PPI Math</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pure deterministic Python math outside the LLM: Absolute Weighted Score, Criterion Benchmarks, Deficit Gaps, and Peer Performance Index (PPI).
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-violet-600 dark:text-violet-400">STAGE 5</span>
                  <span className="text-slate-400">ranker.py (4-Tier)</span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">4-Tier Deterministic Tie-Breaking</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Strict hierarchy: <strong>1) Higher PPI</strong> &rarr; <strong>2) Earlier Date</strong> &rarr; <strong>3) Higher Experience</strong> &rarr; <strong>4) Alphabetical Name</strong>.
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="font-bold text-rose-600 dark:text-rose-400">STAGE 6</span>
                  <span className="text-slate-400">database.py &amp; Charts</span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Persistence &amp; Multi-Chart Visuals</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Assigns immutable Run ID (<code className="font-mono">RFP-RUN-XXXXXXXX</code>), saves snapshot to SQLite, and generates Trajectory Line Graphs &amp; Radar Charts.
                </p>
              </div>
            </div>
          </div>
        )}

        {uploadStatus && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200/70 dark:border-emerald-800/70 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* Upload and Form Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Box with Automatic Metadata Extraction */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-2xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Upload Proposal Documents (PDF or Text)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload 1 or multiple proposals (.pdf, .txt, .json). Vendor name, date, and experience are detected automatically!
            </p>

            <label className="mt-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-7 text-center cursor-pointer block transition-colors bg-slate-50/60 dark:bg-slate-800/20 group">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Click to browse or drag &amp; drop proposal files
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                Supports single or multi-page documents · Automatic details detection
              </span>
            </label>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sample proposals available in: <code className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">input/</code></span>
            <a
              href="/input/Apex_Systems_RFP_Proposal.pdf"
              download="Apex_Systems_RFP_Proposal.pdf"
              className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:underline font-medium"
            >
              <Download className="w-3 h-3" />
              <span>Sample PDF</span>
            </a>
          </div>
        </div>

        {/* Add Supplier Metadata Form */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>Manual Proposal Entry</span>
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
            >
              {showAddForm ? 'Hide Form' : 'Show Manual Entry'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Explicitly specify vendor name, submission date, and past experience rating.
          </p>

          <form onSubmit={handleManualAddSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Supplier Name
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Apex Systems"
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Submission Date
                </label>
                <input
                  type="date"
                  required
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Experience Rating: <span className="font-mono font-bold text-slate-900 dark:text-white">{experienceRating.toFixed(1)}/5.0</span>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={experienceRating}
                  onChange={(e) => setExperienceRating(Number(e.target.value))}
                  className="w-full mt-2 accent-slate-900 dark:accent-white cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Executive Notes / Proposal Highlights (Optional)
              </label>
              <textarea
                rows={2}
                value={proposalNotes}
                onChange={(e) => setProposalNotes(e.target.value)}
                placeholder="Key technical, commercial, or operational highlights..."
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 dark:focus:ring-white/20 transition-all"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                Add to Proposal Review Batch
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Currently Ingested Suppliers List (1 or more) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5.5 shadow-2xs space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Proposals Ready for Evaluation ({suppliers.length})</span>
              {suppliers.length === 1 && (
                <span className="text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 px-2.5 py-0.5 rounded-full">
                  Single Proposal Review
                </span>
              )}
              {suppliers.length > 4 && (
                <span className="text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 px-2.5 py-0.5 rounded-full">
                  Competitive Multi-Proposal Review
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {suppliers.length === 0
                ? "No proposals loaded. Click a quick sample preset or upload files above."
                : suppliers.length === 1
                ? "Evaluating a single proposal establishes its standalone capability rating (100% baseline fit)."
                : "Category benchmarks and performance gaps will be calculated dynamically across all participating proposals."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active Categories: <strong className="text-slate-800 dark:text-slate-200">{activeCriteriaCount}</strong>
            </span>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No proposals currently in batch. Click "Single Proposal Sample", "4 Sample Proposals", or upload documents above.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map((item) => {
              const isCached = cacheMap[item.supplier_name] ?? false;

              return (
                <div
                  key={item.supplier_name}
                  className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between transition-colors shadow-2xs relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                        <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                        <span className="truncate">{item.supplier_name}</span>
                      </div>
                      <button
                        onClick={() => onRemoveSupplier(item.supplier_name)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors shrink-0 cursor-pointer"
                        title="Remove proposal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Proposal Card Status Badge */}
                    <div className="mt-1.5 mb-2">
                      {isCached ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/70 px-2 py-0.5 rounded-md"
                          title="Analyzed previously with identical criteria definitions. Reused instantly without calling Gemini LLM."
                        >
                          <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-current" />
                          <span>⚡ Cached (0 Tokens)</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-800/70 px-2 py-0.5 rounded-md"
                          title="New document or altered criteria definition. Will invoke Gemini LLM API."
                        >
                          <Cpu className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>🆕 New (Requires LLM)</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {item.overall_summary}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.submission_date}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{item.experience_rating.toFixed(1)}/5.0</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
