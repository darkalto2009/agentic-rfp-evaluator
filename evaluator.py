"""
evaluator.py
-------------
Evaluation Agent: builds the grounded, criteria-driven prompt for a single
supplier proposal, calls a JSON-capable LLM (Google Gemini or OpenAI), and
returns the RAW parsed JSON dict (unvalidated — validator.py normalizes it).

Strict LLM / math isolation: this module NEVER computes scores, benchmarks,
PPI, or ranks. It only asks the LLM to read the document and produce a
qualitative, evidence-grounded scorecard.

A deterministic `mock_llm_call` is included so the whole pipeline can be
tested end-to-end without any API key or network access (used by the
prototyping notebook and by the Streamlit app's "Demo / offline mode").
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from typing import Any, Optional

SYSTEM_DIRECTIVE = """You are a procurement evaluation assistant.
Inspect ONLY the text present in the supplier proposal document below.
Do not invent facts, and do not assume a certification, price, or capability
exists unless it is explicitly stated in the proposal text.
Evaluate EVERY criterion listed, even if the proposal does not address it
(in that case, score it low and say so in the justification).
Output STRICT JSON ONLY. No markdown, no code fences, no commentary before
or after the JSON object."""


def build_prompt(supplier_name: str, proposal_text: str, active_criteria: list[dict[str, Any]]) -> str:
    """Construct the evaluation prompt for one supplier against the active criteria."""
    criteria_block = "\n".join(
        f'- criterion_id={c["criterion_id"]}: "{c["name"]}" (weight {c["weight"]}%, max_score '
        f'{c["max_score"]}) — inspect: {c.get("description", "")}'
        for c in active_criteria
    )

    schema_example = {
        "supplier_name": supplier_name,
        "criteria": [
            {
                "criterion_id": active_criteria[0]["criterion_id"] if active_criteria else 1,
                "score": 0.0,
                "max_score": active_criteria[0]["max_score"] if active_criteria else 10.0,
                "justification": "Grounded explanation referencing the proposal text.",
                "evidence": "Direct quote or explicit section reference from the proposal.",
            }
        ],
        "risks": ["Identified risk phrased in your own words."],
        "overall_summary": "Concise synthesis of strengths and weaknesses.",
    }

    return f"""{SYSTEM_DIRECTIVE}

SUPPLIER: {supplier_name}

ACTIVE EVALUATION CRITERIA:
{criteria_block}

RESPONSE JSON SCHEMA (return one entry in "criteria" for every criterion_id above):
{json.dumps(schema_example, indent=2)}

SUPPLIER PROPOSAL TEXT:
\"\"\"
{proposal_text}
\"\"\"

Return the JSON object now.
"""


def strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers some LLMs add despite instructions."""
    text = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, flags=re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()
    return text


def parse_llm_json(raw_text: str) -> dict[str, Any]:
    """Parse the LLM's raw text response into a dict, tolerating minor formatting noise."""
    cleaned = strip_markdown_fences(raw_text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Last-resort recovery: grab the first {...} block in the text.
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse LLM response as JSON. Raw response:\n{raw_text[:1000]}")


# --------------------------------------------------------------------------- #
# Real LLM backends (used by the Streamlit app when an API key is configured)
# --------------------------------------------------------------------------- #

def call_gemini(prompt: str, api_key: str, model: str = "gemini-2.0-flash") -> str:
    import google.generativeai as genai  # local import: optional dependency

    genai.configure(api_key=api_key)
    llm = genai.GenerativeModel(
        model,
        generation_config={"response_mime_type": "application/json"},
    )
    response = llm.generate_content(prompt)
    return response.text


def call_openai(prompt: str, api_key: str, model: str = "gpt-4o-mini") -> str:
    from openai import OpenAI  # local import: optional dependency

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You output strict JSON only, per the user's schema."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content


def evaluate_supplier(
    supplier_name: str,
    proposal_text: str,
    active_criteria: list[dict[str, Any]],
    provider: str = "mock",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> dict[str, Any]:
    """
    Run the Evaluation Agent for one supplier and return the RAW parsed JSON
    (still unvalidated). `provider` is one of: "gemini", "openai", "mock".
    """
    prompt = build_prompt(supplier_name, proposal_text, active_criteria)

    if provider == "mock":
        raw_text = mock_llm_call(supplier_name, proposal_text, active_criteria)
    elif provider == "gemini":
        if not api_key:
            raise ValueError("Gemini provider selected but no API key was supplied.")
        raw_text = call_gemini(prompt, api_key, model or "gemini-2.0-flash")
    elif provider == "openai":
        if not api_key:
            raise ValueError("OpenAI provider selected but no API key was supplied.")
        raw_text = call_openai(prompt, api_key, model or "gpt-4o-mini")
    else:
        raise ValueError(f"Unknown provider: {provider}")

    return parse_llm_json(raw_text)


# --------------------------------------------------------------------------- #
# Deterministic mock LLM (no network, no API key — used for testing/demo)
# --------------------------------------------------------------------------- #

_KEYWORD_HINTS: dict[str, list[str]] = {
    "technical": ["architecture", "integration", "scalab", "api", "technical", "microservice", "infrastructure"],
    "implementation": ["timeline", "milestone", "staffing", "risk plan", "project plan", "phase", "team structure"],
    "commercial": ["price", "pricing", "cost", "assumption", "fee", "budget", "$"],
    "security": ["security", "compliance", "certification", "iso", "soc 2", "privacy", "audit", "encrypt"],
    "support": ["support", "reference", "similar project", "sla", "experience", "case stud"],
}


def _score_from_keywords(text: str, criterion_name: str, max_score: float) -> tuple[float, str]:
    """
    Deterministic, content-aware heuristic used ONLY by the offline mock LLM:
    counts keyword hits relevant to the criterion and maps that to a score.
    This intentionally mimics "reading the document" so the mock produces
    different (but fully reproducible) scores per supplier/criterion,
    without any network call.
    """
    lower = text.lower()
    name_lower = criterion_name.lower()
    bucket = "technical"
    for key in _KEYWORD_HINTS:
        if key in name_lower:
            bucket = key
            break

    hits = sum(lower.count(kw) for kw in _KEYWORD_HINTS[bucket])
    # Deterministic hash-based jitter so identical hit-counts don't all tie exactly,
    # mirroring the "different suppliers -> different nuance" reality, but staying
    # 100% reproducible for the same input text.
    digest = hashlib.sha256((criterion_name + text[:200]).encode("utf-8")).hexdigest()
    jitter = (int(digest[:4], 16) % 100) / 100.0  # 0.0 - 0.99, deterministic

    base = min(hits, 8) / 8.0  # 0..1
    score = round(min(max(base * 0.7 + jitter * 0.3, 0.05), 1.0) * max_score, 2)
    justification = (
        f"[MOCK EVALUATOR] Found {hits} keyword reference(s) related to "
        f"'{criterion_name}' in the proposal text."
    )
    return score, justification


def mock_llm_call(supplier_name: str, proposal_text: str, active_criteria: list[dict[str, Any]]) -> str:
    """Return a JSON *string*, exactly like a real LLM API response would."""
    criteria_out = []
    for c in active_criteria:
        score, justification = _score_from_keywords(proposal_text, c["name"], float(c["max_score"]))
        snippet_idx = proposal_text.lower().find(c["name"].split()[0].lower())
        evidence = (
            proposal_text[snippet_idx: snippet_idx + 140].strip().replace("\n", " ")
            if snippet_idx != -1
            else "(no direct section match found by mock evaluator)"
        )
        criteria_out.append(
            {
                "criterion_id": c["criterion_id"],
                "score": score,
                "max_score": c["max_score"],
                "justification": justification,
                "evidence": evidence,
            }
        )

    payload = {
        "supplier_name": supplier_name,
        "criteria": criteria_out,
        "risks": [
            "[MOCK] Automatically generated risk placeholder based on lowest-scoring criterion."
        ],
        "overall_summary": (
            f"[MOCK EVALUATOR] Deterministic offline scorecard generated for {supplier_name} "
            f"based on keyword analysis of the extracted proposal text (no live LLM call made)."
        ),
    }
    return json.dumps(payload)


if __name__ == "__main__":
    demo_criteria = [
        {"criterion_id": 1, "name": "Technical Capability", "weight": 30.0, "max_score": 10.0, "description": "..."},
        {"criterion_id": 2, "name": "Security & Compliance", "weight": 20.0, "max_score": 10.0, "description": "..."},
    ]
    demo_text = "Our architecture uses scalable microservices. We hold SOC 2 and ISO 27001 certifications."
    raw = evaluate_supplier("Apex Systems", demo_text, demo_criteria, provider="mock")
    print(json.dumps(raw, indent=2))
