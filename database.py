"""
database.py
------------
SQLite initialization and data-access helpers for the Agentic RFP Evaluation
and Supplier Ranking System.

Tables
------
evaluation_criteria : the active/inactive scoring criteria + weights
rfp_runs            : one row per evaluation batch ("RFP_RUN_ID")
supplier_results    : one row per supplier per run, with the full JSON payload

No LLM logic and no scoring math lives here — this module is pure persistence.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Optional

DB_PATH = Path(__file__).parent / "data" / "rfp_evaluation.db"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    criterion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    weight REAL NOT NULL,
    max_score REAL DEFAULT 10.0,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rfp_runs (
    rfp_run_id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL
);

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
);
"""

DEFAULT_CRITERIA = [
    # name, description, weight, max_score
    ("Technical Capability", "Architecture, integrations, scalability, technical fit.", 30.0, 10.0),
    ("Implementation Plan", "Timeline, milestones, staffing, risk plan.", 20.0, 10.0),
    ("Commercial Value", "Pricing clarity, total cost, assumptions.", 20.0, 10.0),
    ("Security & Compliance", "Controls, certifications, privacy, auditability.", 20.0, 10.0),
    ("Support & Experience", "Support model, similar projects, references.", 10.0, 10.0),
]


def get_db_path() -> Path:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DB_PATH


@contextmanager
def get_connection():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create tables if they do not already exist. Idempotent."""
    with get_connection() as conn:
        conn.executescript(SCHEMA_SQL)


def seed_default_criteria(force: bool = False) -> None:
    """Insert the five default criteria if the table is empty (or always, if force=True)."""
    with get_connection() as conn:
        if force:
            conn.execute("DELETE FROM evaluation_criteria;")
        else:
            count = conn.execute("SELECT COUNT(*) AS c FROM evaluation_criteria;").fetchone()["c"]
            if count > 0:
                return
        conn.executemany(
            """INSERT INTO evaluation_criteria (name, description, weight, max_score, is_active)
               VALUES (?, ?, ?, ?, 1)""",
            DEFAULT_CRITERIA,
        )


# --------------------------------------------------------------------------- #
# Criteria helpers
# --------------------------------------------------------------------------- #

def get_active_criteria() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM evaluation_criteria WHERE is_active = 1 ORDER BY criterion_id;"
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_criteria() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM evaluation_criteria ORDER BY criterion_id;").fetchall()
        return [dict(r) for r in rows]


def total_active_weight() -> float:
    return round(sum(c["weight"] for c in get_active_criteria()), 4)


def upsert_criterion(
    name: str,
    description: str,
    weight: float,
    max_score: float = 10.0,
    is_active: bool = True,
    criterion_id: Optional[int] = None,
) -> int:
    with get_connection() as conn:
        if criterion_id is not None:
            conn.execute(
                """UPDATE evaluation_criteria
                   SET name=?, description=?, weight=?, max_score=?, is_active=?
                   WHERE criterion_id=?""",
                (name, description, weight, max_score, int(is_active), criterion_id),
            )
            return criterion_id
        cur = conn.execute(
            """INSERT INTO evaluation_criteria (name, description, weight, max_score, is_active)
               VALUES (?, ?, ?, ?, ?)""",
            (name, description, weight, max_score, int(is_active)),
        )
        return cur.lastrowid


def set_criterion_active(criterion_id: int, is_active: bool) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE evaluation_criteria SET is_active=? WHERE criterion_id=?",
            (int(is_active), criterion_id),
        )


def delete_criterion(criterion_id: int) -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM evaluation_criteria WHERE criterion_id=?", (criterion_id,))


# --------------------------------------------------------------------------- #
# Run + result helpers
# --------------------------------------------------------------------------- #

def create_run(status: str = "in_progress") -> str:
    rfp_run_id = f"RFP-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO rfp_runs (rfp_run_id, status) VALUES (?, ?);",
            (rfp_run_id, status),
        )
    return rfp_run_id


def update_run_status(rfp_run_id: str, status: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE rfp_runs SET status=? WHERE rfp_run_id=?;",
            (status, rfp_run_id),
        )


def save_supplier_result(
    rfp_run_id: str,
    supplier_name: str,
    submission_date: str,
    experience_rating: float,
    absolute_score: float,
    ppi: float,
    final_rank: int,
    result_payload: dict[str, Any],
) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO supplier_results
               (rfp_run_id, supplier_name, submission_date, experience_rating,
                absolute_score, ppi, final_rank, result_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rfp_run_id,
                supplier_name,
                submission_date,
                experience_rating,
                absolute_score,
                ppi,
                final_rank,
                json.dumps(result_payload),
            ),
        )


def get_runs() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM rfp_runs ORDER BY created_at DESC;"
        ).fetchall()
        return [dict(r) for r in rows]


def get_results_for_run(rfp_run_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT * FROM supplier_results
               WHERE rfp_run_id = ?
               ORDER BY final_rank ASC;""",
            (rfp_run_id,),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["result_json"] = json.loads(d["result_json"])
            out.append(d)
        return out


def clear_all_data() -> None:
    """Danger: wipes runs + results (keeps criteria). Useful for demos/tests."""
    with get_connection() as conn:
        conn.execute("DELETE FROM supplier_results;")
        conn.execute("DELETE FROM rfp_runs;")


if __name__ == "__main__":
    init_db()
    seed_default_criteria()
    print(f"Database ready at: {get_db_path()}")
    print(f"Active criteria total weight: {total_active_weight()}%")
    for c in get_active_criteria():
        print(f"  - {c['name']} ({c['weight']}%, max {c['max_score']})")
