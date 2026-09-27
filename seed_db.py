"""
seed_db.py
-----------
Standalone script: initializes the SQLite schema and seeds the five default
evaluation criteria (idempotent — safe to re-run).

Usage:
    python seed_db.py            # seed only if criteria table is empty
    python seed_db.py --force    # wipe and re-seed the default criteria
"""

from __future__ import annotations

import argparse

import database


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize and seed the RFP evaluation database.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Delete existing criteria and reinsert the five defaults.",
    )
    args = parser.parse_args()

    database.init_db()
    database.seed_default_criteria(force=args.force)

    print(f"Database ready at: {database.get_db_path()}")
    criteria = database.get_active_criteria()
    total_weight = database.total_active_weight()
    print(f"Active criteria ({len(criteria)}), total weight = {total_weight}%")
    for c in criteria:
        print(f"  [{c['criterion_id']}] {c['name']:<24} weight={c['weight']:>5.1f}%  max_score={c['max_score']}")

    if abs(total_weight - 100.0) > 1e-6:
        print(f"WARNING: active criteria weights sum to {total_weight}%, not 100%.")


if __name__ == "__main__":
    main()
