# GitHub Copilot & Cursor Instructions

## Repository: RFP Evaluation & Supplier Ranking

This file instructs GitHub Copilot, Cursor, and other AI coding assistants on the conventions, architectural invariants, and constraints of this repository.

---

## 1. Golden Rule: Pure Deterministic Mathematics & Zero Key Storage

- **DO NOT** suggest or generate code that asks an LLM to compute weighted averages, peer benchmarks, capability gaps, or final ranks.
- **DO NOT** introduce floating-point calculation drift.
- **DO NOT** write code that stores API keys in localStorage, cookies, session storage, or committed repository files. Always rely on server-side runtime injection via `GEMINI_API_KEY`.
- All ranking calculations belong in:
  - Python: `ranker.py`
  - Frontend: `src/utils/rfpMath.ts`
- All caching calculations belong in:
  - Python: `database.py`
  - Frontend: `src/utils/evaluationCache.ts`

---

## 2. Mathematical Reference

When completing or generating ranking code, adhere to these formulas:

```typescript
// 1. Absolute Score (0 to 100)
absolute_score = sum((c.score / c.max_score) * c.weight for c in criteria)

// 2. Peer Benchmark
benchmark[c] = max(all_suppliers.map(s => s.criterion[c].score))

// 3. Gap vs Leader (always <= 0.0)
gap[s, c] = s.criterion[c].score - benchmark[c]

// 4. Relative Score %
relative_pct[s, c] = benchmark[c] > 0 ? (s.criterion[c].score / benchmark[c]) * 100.0 : 100.0

// 5. Peer Performance Index (PPI)
ppi = sum(relative_pct[s, c] * (c.weight / 100.0) for c in criteria)

// 6. Mandatory Tie-Break Order:
// 1) ppi DESC, 2) submission_date ASC, 3) experience_rating DESC, 4) supplier_name ASC
```

---

## 3. Frontend Standards (React + TypeScript + Tailwind)

- Always import types from `src/types.ts`.
- Use Tailwind CSS classes for styling (including `dark:` variants for all components).
- Never use `window.alert` or `window.confirm`; use custom modals or inline banners.
- When generating visual components, ensure color schemes match the high-contrast aesthetic:
  - Slate backgrounds (`bg-white dark:bg-slate-900`)
  - Subtle borders (`border-slate-200 dark:border-slate-800`)
  - Indigo/Emerald primary accents.
- Maintain the footer copyright:
  `© 2026 Darkalto Developer | All Rights Reserved`

---

## 4. Python Backend Standards

- Maintain SQLite schema consistency in `database.py`.
- Pydantic models must be used for all JSON validation in `validator.py`.
- `generate_charts.py` must stay pure Python with zero mandatory pip dependencies for basic SVG generation.
- Keep terminal scripts executable directly:
  ```bash
  python3 orchestrator.py
  python3 generate_charts.py
  ```
