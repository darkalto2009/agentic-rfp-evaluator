"""
database.py: SQLite Database Persistence Layer
Handles schema creation, criteria CRUD, and storage of RFP evaluation runs and supplier scorecards.
"""

import sqlite3
import json
import os
import hashlib
from typing import List, Dict, Any, Optional

DEFAULT_DB_PATH = "rfp_evaluation.db"

DEFAULT_CRITERIA = [
    {
        "name": "Technical Capability",
        "description": "Architecture, integrations, scalability, technical fit",
        "weight": 30.0,
        "max_score": 10.0,
        "is_active": 1
    },
    {
        "name": "Implementation Plan",
        "description": "Timeline, milestones, staffing, risk plan",
        "weight": 20.0,
        "max_score": 10.0,
        "is_active": 1
    },
    {
        "name": "Commercial Value",
        "description": "Pricing clarity, total cost, assumptions",
        "weight": 20.0,
        "max_score": 10.0,
        "is_active": 1
    },
    {
        "name": "Security & Compliance",
        "description": "Controls, certifications, privacy, auditability",
        "weight": 20.0,
        "max_score": 10.0,
        "is_active": 1
    },
    {
        "name": "Support & Experience",
        "description": "Support model, similar projects, references",
        "weight": 10.0,
        "max_score": 10.0,
        "is_active": 1
    }
]


def get_db_connection(db_path: str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    """Creates a connection to SQLite database with dictionary cursor row factory."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: str = DEFAULT_DB_PATH):
    """Initializes tables for evaluation_criteria, rfp_runs, and supplier_results."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # Table 1: evaluation_criteria
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_criteria (
        criterion_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        weight REAL NOT NULL,
        max_score REAL DEFAULT 10.0,
        is_active INTEGER DEFAULT 1
    )
    """)

    # Table 2: rfp_runs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rfp_runs (
        rfp_run_id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL
    )
    """)

    # Table 3: supplier_results
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS supplier_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rfp_run_id TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        submission_date TEXT NOT NULL,
        experience_rating REAL NOT NULL,
        absolute_score REAL NOT NULL,
        ppi REAL NOT NULL,
        final_rank INTEGER NOT NULL,
        result_json TEXT NOT NULL,
        FOREIGN KEY (rfp_run_id) REFERENCES rfp_runs (rfp_run_id)
    )
    """)

    # Table 4: document_cache (Tier 1 Document Fingerprinting & Extraction Cache)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_cache (
        doc_hash TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        extracted_text TEXT NOT NULL,
        extracted_metadata_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Table 5: evaluation_cache (Tier 2 Qualitative Evaluation Scorecard Cache)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evaluation_cache (
        cache_key TEXT PRIMARY KEY,
        doc_hash TEXT NOT NULL,
        criteria_def_hash TEXT NOT NULL,
        model_name TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        scorecard_json TEXT NOT NULL,
        estimated_prompt_tokens INTEGER DEFAULT 4500,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doc_hash) REFERENCES document_cache(doc_hash)
    )
    """)

    # Index for rapid lookup by document hash
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_eval_cache_doc ON evaluation_cache(doc_hash)")

    conn.commit()
    conn.close()


def seed_criteria(db_path: str = DEFAULT_DB_PATH, force_reseed: bool = False):
    """Seeds the initial 5 evaluation criteria if table is empty or force_reseed is True."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM evaluation_criteria")
    count = cursor.fetchone()["count"]

    if count == 0 or force_reseed:
        if force_reseed:
            cursor.execute("DELETE FROM evaluation_criteria")
        for crit in DEFAULT_CRITERIA:
            cursor.execute("""
            INSERT INTO evaluation_criteria (name, description, weight, max_score, is_active)
            VALUES (?, ?, ?, ?, ?)
            """, (crit["name"], crit["description"], crit["weight"], crit["max_score"], crit["is_active"]))
        conn.commit()
        print(f"Seeded {len(DEFAULT_CRITERIA)} default evaluation criteria into {db_path}")

    conn.close()


def get_all_criteria(db_path: str = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """Fetches all evaluation criteria."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT criterion_id, name, description, weight, max_score, is_active FROM evaluation_criteria ORDER BY criterion_id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_active_criteria(db_path: str = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """Fetches only active criteria (is_active = 1)."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT criterion_id, name, description, weight, max_score, is_active FROM evaluation_criteria WHERE is_active = 1 ORDER BY criterion_id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_criterion(criterion_id: int, weight: float, max_score: float, is_active: int, db_path: str = DEFAULT_DB_PATH):
    """Updates the weight, max_score, and active status of a criterion."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE evaluation_criteria
    SET weight = ?, max_score = ?, is_active = ?
    WHERE criterion_id = ?
    """, (weight, max_score, is_active, criterion_id))
    conn.commit()
    conn.close()


def add_criterion(name: str, description: str, weight: float, max_score: float = 10.0, is_active: int = 1, db_path: str = DEFAULT_DB_PATH) -> int:
    """Adds a new evaluation criterion."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO evaluation_criteria (name, description, weight, max_score, is_active)
    VALUES (?, ?, ?, ?, ?)
    """, (name, description, weight, max_score, is_active))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def save_rfp_run(rfp_run_id: str, status: str, ranked_suppliers: List[Dict[str, Any]], db_path: str = DEFAULT_DB_PATH):
    """Saves run metadata and all supplier ranking results into SQLite."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR REPLACE INTO rfp_runs (rfp_run_id, status)
    VALUES (?, ?)
    """, (rfp_run_id, status))

    # Remove existing supplier results for this run if re-running
    cursor.execute("DELETE FROM supplier_results WHERE rfp_run_id = ?", (rfp_run_id,))

    for supp in ranked_suppliers:
        result_json_str = json.dumps(supp, default=str)
        cursor.execute("""
        INSERT INTO supplier_results (
            rfp_run_id, supplier_name, submission_date, experience_rating,
            absolute_score, ppi, final_rank, result_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rfp_run_id,
            supp["supplier_name"],
            supp["submission_date"],
            float(supp["experience_rating"]),
            float(supp["absolute_score"]),
            float(supp["ppi"]),
            int(supp["final_rank"]),
            result_json_str
        ))

    conn.commit()
    conn.close()


def get_all_runs(db_path: str = DEFAULT_DB_PATH) -> List[Dict[str, Any]]:
    """Retrieves all past RFP runs with metadata."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.rfp_run_id, r.created_at, r.status, COUNT(s.id) as supplier_count
    FROM rfp_runs r
    LEFT JOIN supplier_results s ON r.rfp_run_id = s.rfp_run_id
    GROUP BY r.rfp_run_id
    ORDER BY r.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_run_details(rfp_run_id: str, db_path: str = DEFAULT_DB_PATH) -> Dict[str, Any]:
    """Retrieves complete details and ranked suppliers for an RFP run."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT rfp_run_id, created_at, status FROM rfp_runs WHERE rfp_run_id = ?", (rfp_run_id,))
    run_row = cursor.fetchone()
    if not run_row:
        conn.close()
        return {}

    run_dict = dict(run_row)

    cursor.execute("""
    SELECT supplier_name, submission_date, experience_rating, absolute_score, ppi, final_rank, result_json
    FROM supplier_results
    WHERE rfp_run_id = ?
    ORDER BY final_rank ASC
    """, (rfp_run_id,))
    supplier_rows = cursor.fetchall()
    conn.close()

    suppliers = []
    for row in supplier_rows:
        parsed = json.loads(row["result_json"])
        suppliers.append(parsed)

    run_dict["suppliers"] = suppliers
    return run_dict


# ============================================================================
# Caching, Token Optimization & Incremental Evaluation Engine
# ============================================================================

def compute_hash(data: Any) -> str:
    """Computes SHA-256 hex digest for bytes, string, or json-serializable objects."""
    if isinstance(data, str):
        b = data.encode("utf-8")
    elif isinstance(data, (bytes, bytearray)):
        b = bytes(data)
    else:
        b = json.dumps(data, sort_keys=True).encode("utf-8")
    return hashlib.sha256(b).hexdigest()


def compute_criteria_definition_hash(active_criteria: List[Dict[str, Any]]) -> str:
    """
    Computes a deterministic hash over active criteria definitions.
    INVARIANT: Intentionally EXCLUDES criteria 'weight' because weights only affect
    Tier 3 deterministic arithmetic, not qualitative LLM scoring.
    """
    canonical = [
        {
            "id": int(c["criterion_id"]),
            "name": str(c["name"]).strip().lower(),
            "description": str(c.get("description", "")).strip().lower(),
            "max_score": float(c.get("max_score", 10.0))
        }
        for c in sorted(active_criteria, key=lambda x: int(x["criterion_id"]))
    ]
    return compute_hash(canonical)


def get_cached_document(doc_hash: str, db_path: str = DEFAULT_DB_PATH) -> Optional[Dict[str, Any]]:
    """Retrieves extracted document text and detected metadata from Tier 1 cache."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT * FROM document_cache WHERE doc_hash = ?", (doc_hash,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def save_cached_document(
    doc_hash: str,
    filename: str,
    file_size_bytes: int,
    extracted_text: str,
    extracted_metadata: Dict[str, Any],
    db_path: str = DEFAULT_DB_PATH
):
    """Saves document extraction output into Tier 1 cache."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT OR REPLACE INTO document_cache (doc_hash, filename, file_size_bytes, extracted_text, extracted_metadata_json)
        VALUES (?, ?, ?, ?, ?)
    """, (doc_hash, filename, file_size_bytes, extracted_text, json.dumps(extracted_metadata)))
    conn.commit()
    conn.close()


def get_cached_scorecard(cache_key: str, db_path: str = DEFAULT_DB_PATH) -> tuple[Optional[Dict[str, Any]], int]:
    """Retrieves qualitative scorecard and estimated prompt tokens saved from Tier 2 cache."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT scorecard_json, estimated_prompt_tokens FROM evaluation_cache WHERE cache_key = ?", (cache_key,))
    row = cur.fetchone()
    conn.close()
    if row:
        return json.loads(row["scorecard_json"]), int(row["estimated_prompt_tokens"])
    return None, 0


def save_cached_scorecard(
    cache_key: str,
    doc_hash: str,
    criteria_def_hash: str,
    model_name: str,
    supplier_name: str,
    scorecard: Dict[str, Any],
    estimated_prompt_tokens: int = 4500,
    db_path: str = DEFAULT_DB_PATH
):
    """Saves qualitative scorecard output into Tier 2 cache."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.execute("""
        INSERT OR REPLACE INTO evaluation_cache
        (cache_key, doc_hash, criteria_def_hash, model_name, supplier_name, scorecard_json, estimated_prompt_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (cache_key, doc_hash, criteria_def_hash, model_name, supplier_name, json.dumps(scorecard), estimated_prompt_tokens))
    conn.commit()
    conn.close()


def get_token_optimization_stats(db_path: str = DEFAULT_DB_PATH) -> Dict[str, Any]:
    """Returns cumulative statistics on cached documents, evaluations, and estimated token savings."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as doc_count FROM document_cache")
    doc_count = cur.fetchone()["doc_count"]

    cur.execute("SELECT COUNT(*) as eval_count, COALESCE(SUM(estimated_prompt_tokens), 0) as total_tokens FROM evaluation_cache")
    row = cur.fetchone()
    eval_count = row["eval_count"]
    total_tokens = row["total_tokens"]
    conn.close()

    return {
        "cached_documents": doc_count,
        "cached_evaluations": eval_count,
        "total_estimated_tokens_saved": total_tokens
    }
