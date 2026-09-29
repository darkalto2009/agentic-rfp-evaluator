# Claude Development Guide & Context

## Project: RFP Evaluation & Supplier Ranking

This document is tailored for **Claude** (Anthropic) and Claude-powered agents (such as Claude Code, Cursor with Claude 3.5 Sonnet / Claude 3.7 Sonnet) working on this codebase.

---

## 1. Project Overview & Role Definition

This application automates RFP proposal evaluation with strict governance:
- **LLM Responsibility:** Qualitative text analysis, criteria scoring within bounds, and citing exact proposal evidence.
- **Deterministic Python Responsibility:** All arithmetic, peer benchmarking, gap analysis, PPI calculation, and tie-breaking.
- **Frontend Stack:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **Backend / Python Stack:** Python 3.10+, PyMuPDF (`fitz`), Pydantic, SQLite3, Google GenAI SDK.
- **Caching & Token Optimization:** Three-Tier Zero-Redundancy Caching (`caching_system.md`) delivering 80%-95% token savings.

---

## 2. Inviolable Invariants

When editing code, **NEVER**:
1. Do not ask the LLM to calculate sums, averages, PPI, gaps, or rankings.
2. Do not change the 4-tier tie-breaking order:
   - 1) PPI descending
   - 2) Submission date ascending
   - 3) Experience rating descending
   - 4) Supplier name ascending
3. Do not alter the footer copyright text:
   `© 2026 Darkalto Developer | All Rights Reserved`
4. Do not hardcode or store API keys in source files, git history, or browser localStorage. Use server-side environment variables (`GEMINI_API_KEY`).
5. Do not break zero-dependency SVG generation in `generate_charts.py`.
6. Maintain the canonical proposal folder at `./input/` (do not recreate `sample_rfps`).
7. In visual comparisons, maintain **Trajectory (Line)** positioned before **Total Score**, with **Decision Insight** situated on top of Category Leaders.

---

## 3. Directory Layout & File Responsibilities

```
/
├── architecture.md           # Full system architecture documentation
├── caching_system.md         # Three-Tier Zero-Redundancy Caching guide
├── instruction.md            # Best practices and engineering rules
├── Agents.md                 # Agent roles and multi-agent lifecycle
├── Claude.md                 # This file (guidance for Claude agents)
├── copilot-instruction.md    # Instructions for GitHub Copilot & Cursor
├── README.md                 # Public documentation and quickstart
├── generate_charts.py        # Standalone Python script for SVG & terminal charts
├── rfp_evaluation_test.ipynb # Jupyter test notebook verifying all math & agents
├── rfp_evaluation.db         # SQLite database
├── input/                    # Canonical directory for proposal PDFs
│
├── src/                      # React SPA
│   ├── App.tsx               # Main application container & state orchestration
│   ├── types.ts              # TypeScript domain types (Criterion, SupplierResult, RFPRun)
│   ├── utils/rfpMath.ts      # Pure TypeScript port of Python ranking mathematics
│   ├── utils/evaluationCache.ts # Three-tier zero-redundancy caching engine
│   ├── components/
│   │   ├── Header.tsx                 # Navigation, theme toggle, run ID, Doc Hub & Tools
│   │   ├── LeaderboardView.tsx        # High-level ranking cards & summary table + Export JSON
│   │   ├── ScorecardDrilldown.tsx     # Deep dive into vendor scorecards & citations
│   │   ├── SupplierChartsSection.tsx  # Recharts visualizations (Radar, Bars, Gaps, Trajectory)
│   │   ├── CriteriaManager.tsx        # Dynamic criteria weighting & management
│   │   ├── EvaluationRunner.tsx       # Proposal intake, cache awareness & batch execution
│   │   ├── PastRunsHistory.tsx        # Historical run snapshots loaded from SQLite
│   │   ├── DocumentationHubModal.tsx  # Interactive technical documentation hub
│   │   ├── DeveloperHubModal.tsx      # Tools & Tests Hub (Notebook, Code, Model, Charts)
│   │   ├── PythonChartGenerator.tsx   # Interactive Python code exporter (Matplotlib/Plotly/SVG)
│   │   ├── NotebookViewer.tsx         # Interactive view of rfp_evaluation_test.ipynb
│   │   └── CodeArtifactsHub.tsx       # Live browser for all Python backend scripts
```

---

## 4. Coding Conventions for Claude

### TypeScript / React
- Write clean, functional React components with standard hooks (`useState`, `useMemo`, `useEffect`).
- Prefer Tailwind CSS utility classes; avoid inline styles.
- Support both light and dark themes using Tailwind's `dark:` variant.
- Use explicit TypeScript interfaces from `src/types.ts`.

### Python
- Type annotations on all function signatures (`typing.List`, `typing.Dict`, `typing.Optional`, etc.).
- Defensive error handling with graceful fallbacks.
- Keep `generate_charts.py` executable in vanilla Python without mandatory pip installs.

### Verification
Whenever you finish a modification:
1. Run `python3 generate_charts.py` to confirm Python logic runs cleanly.
2. Verify TypeScript build passes without errors.
