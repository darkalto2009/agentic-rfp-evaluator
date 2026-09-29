"""
seed_db.py: Script to initialize and seed the SQLite database with default evaluation criteria.
Run this script to set up a clean database before launching the Streamlit app.
"""

from database import init_db, seed_criteria, get_all_criteria

def main():
    print("Initializing SQLite database tables...")
    init_db()
    print("Seeding default evaluation criteria...")
    seed_criteria(force_reseed=True)
    criteria = get_all_criteria()
    print("\n--- ACTIVE CRITERIA LOADED ---")
    total_weight = 0
    for c in criteria:
        status = "ACTIVE" if c["is_active"] else "INACTIVE"
        print(f"[{c['criterion_id']}] {c['name']} (Weight: {c['weight']}%, Max: {c['max_score']}) - {status}")
        if c["is_active"]:
            total_weight += c["weight"]
    print(f"\nTotal Active Weight: {total_weight}% (Must be 100%)\n")
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    main()
