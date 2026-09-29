#!/usr/bin/env python3
"""
generate_charts.py
Python utility to generate professional proposal comparison charts:
1. Pure Python SVG Radar Capabilities Profile
2. Pure Python SVG Category Scores Bar Chart
3. Pure Python SVG Gap vs Category Leader Benchmark Chart
4. Terminal Visual Comparison Table (ASCII / Unicode bars)

Can be executed in any Python 3 environment without external packages:
    python3 generate_charts.py
"""

import os
import json
import math
import sqlite3

def load_latest_evaluation_data():
    """Load latest evaluation data from SQLite database or fallback sample."""
    db_path = "rfp_evaluation.db"
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT rfp_run_id, created_at FROM rfp_runs ORDER BY created_at DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                run_id = row[0]
                cursor.execute(
                    "SELECT supplier_name, final_rank, absolute_score, ppi, criteria_scores_json "
                    "FROM supplier_results WHERE rfp_run_id = ? ORDER BY final_rank ASC", 
                    (run_id,)
                )
                results = cursor.fetchall()
                conn.close()
                if results:
                    suppliers = []
                    for r in results:
                        suppliers.append({
                            "supplier_name": r[0],
                            "final_rank": r[1],
                            "absolute_score": r[2],
                            "ppi": r[3],
                            "criteria": json.loads(r[4])
                        })
                    return run_id, suppliers
        except Exception:
            pass

    # Standard fallback sample data
    sample_suppliers = [
        {
            "supplier_name": "NexaWorks",
            "final_rank": 1,
            "absolute_score": 89.6,
            "ppi": 93.74,
            "criteria": [
                {"name": "Technical Capability", "score": 8.8, "benchmark": 9.5},
                {"name": "Implementation Plan", "score": 9.5, "benchmark": 9.5},
                {"name": "Commercial Value", "score": 8.5, "benchmark": 9.5},
                {"name": "Security & Compliance", "score": 9.0, "benchmark": 9.8},
                {"name": "Support & Experience", "score": 9.2, "benchmark": 9.5}
            ]
        },
        {
            "supplier_name": "Apex Systems",
            "final_rank": 2,
            "absolute_score": 85.1,
            "ppi": 88.95,
            "criteria": [
                {"name": "Technical Capability", "score": 9.5, "benchmark": 9.5},
                {"name": "Implementation Plan", "score": 7.8, "benchmark": 9.5},
                {"name": "Commercial Value", "score": 6.2, "benchmark": 9.5},
                {"name": "Security & Compliance", "score": 9.8, "benchmark": 9.8},
                {"name": "Support & Experience", "score": 9.0, "benchmark": 9.5}
            ]
        },
        {
            "supplier_name": "Orbit Digital",
            "final_rank": 3,
            "absolute_score": 83.0,
            "ppi": 86.85,
            "criteria": [
                {"name": "Technical Capability", "score": 7.2, "benchmark": 9.5},
                {"name": "Implementation Plan", "score": 7.5, "benchmark": 9.5},
                {"name": "Commercial Value", "score": 7.0, "benchmark": 9.5},
                {"name": "Security & Compliance", "score": 8.0, "benchmark": 9.8},
                {"name": "Support & Experience", "score": 9.5, "benchmark": 9.5}
            ]
        },
        {
            "supplier_name": "BrightPath Tech",
            "final_rank": 4,
            "absolute_score": 65.6,
            "ppi": 68.80,
            "criteria": [
                {"name": "Technical Capability", "score": 5.5, "benchmark": 9.5},
                {"name": "Implementation Plan", "score": 6.0, "benchmark": 9.5},
                {"name": "Commercial Value", "score": 9.5, "benchmark": 9.5},
                {"name": "Security & Compliance", "score": 4.0, "benchmark": 9.8},
                {"name": "Support & Experience", "score": 5.0, "benchmark": 9.5}
            ]
        }
    ]
    return "SAMPLE-EVALUATION-RUN", sample_suppliers

def generate_text_chart(run_id, suppliers):
    """Outputs a clean terminal visualization comparing all proposals."""
    print("=" * 72)
    print(f"  VENDOR EVALUATION & SELECTION SUMMARY ({run_id})")
    print("=" * 72)
    for s in suppliers:
        bar_len = int(s['ppi'] / 3.33)  # Scale to 30 chars
        bar = "█" * bar_len + "░" * (30 - bar_len)
        print(f"  Rank #{s['final_rank']:<2} {s['supplier_name']:<18} | Match: {s['ppi']:>5.1f}% [{bar}] | Score: {s['absolute_score']:>4.1f}/100")
    print("=" * 72)

def generate_svg_radar_chart(run_id, suppliers, output_path="chart_radar.svg"):
    """Generates an SVG radar chart without external libraries."""
    cx, cy, radius = 300, 300, 200
    categories = [c['name'] for c in suppliers[0]['criteria']]
    n = len(categories)
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" width="600" height="640" style="background:#ffffff; font-family:system-ui, sans-serif;">',
        f'<text x="300" y="40" text-anchor="middle" font-size="18" font-weight="bold" fill="#0f172a">Proposal Capabilities Radar Profile</text>',
        f'<text x="300" y="60" text-anchor="middle" font-size="12" fill="#64748b">Session: {run_id}</text>'
    ]

    # Concentric grid rings
    for level in [0.25, 0.5, 0.75, 1.0]:
        r = radius * level
        points = []
        for i in range(n):
            angle = (2 * math.pi / n) * i - (math.pi / 2)
            px = cx + r * math.cos(angle)
            py = cy + r * math.sin(angle)
            points.append(f"{px:.1f},{py:.1f}")
        svg.append(f'<polygon points="{" ".join(points)}" fill="none" stroke="#e2e8f0" stroke-width="1" />')

    # Spoke axes and category labels
    for i, cat in enumerate(categories):
        angle = (2 * math.pi / n) * i - (math.pi / 2)
        px = cx + radius * math.cos(angle)
        py = cy + radius * math.sin(angle)
        svg.append(f'<line x1="{cx}" y1="{cy}" x2="{px:.1f}" y2="{py:.1f}" stroke="#cbd5e1" stroke-width="1" />')
        lx = cx + (radius + 28) * math.cos(angle)
        ly = cy + (radius + 28) * math.sin(angle)
        svg.append(f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">{cat}</text>')

    # Proposal polygons
    for s_idx, s in enumerate(suppliers):
        color = colors[s_idx % len(colors)]
        points = []
        for i, c in enumerate(s['criteria']):
            score = c.get('score', 0)
            norm = min(max(score / 10.0, 0), 1.0)
            r = radius * norm
            angle = (2 * math.pi / n) * i - (math.pi / 2)
            px = cx + r * math.cos(angle)
            py = cy + r * math.sin(angle)
            points.append(f"{px:.1f},{py:.1f}")
        svg.append(f'<polygon points="{" ".join(points)}" fill="{color}" fill-opacity="0.15" stroke="{color}" stroke-width="2.5" />')

    # Legend
    legend_y = 590
    item_width = 540 / max(len(suppliers), 1)
    for s_idx, s in enumerate(suppliers):
        color = colors[s_idx % len(colors)]
        x = 40 + s_idx * item_width
        svg.append(f'<rect x="{x}" y="{legend_y}" width="12" height="12" rx="3" fill="{color}" />')
        svg.append(f'<text x="{x + 18}" y="{legend_y + 10}" font-size="11" font-weight="600" fill="#1e293b">#{s["final_rank"]} {s["supplier_name"]}</text>')

    svg.append('</svg>')
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg))
    print(f"  ✓ SVG Radar Chart saved to: {output_path}")

def generate_svg_bars_chart(run_id, suppliers, output_path="chart_bars.svg"):
    """Generates an SVG bar chart comparing category scores across proposals."""
    categories = [c['name'] for c in suppliers[0]['criteria']]
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']

    width, height = 700, 400
    margin_left, margin_bottom, margin_top, margin_right = 140, 50, 60, 40
    chart_width = width - margin_left - margin_right
    chart_height = height - margin_top - margin_bottom

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background:#ffffff; font-family:system-ui, sans-serif;">',
        f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Category Scores Comparison</text>',
        f'<text x="{width/2}" y="48" text-anchor="middle" font-size="11" fill="#64748b">Session: {run_id} · Scale: 0 to 10</text>'
    ]

    # Grid lines
    for score in range(0, 11, 2):
        x = margin_left + (score / 10.0) * chart_width
        svg.append(f'<line x1="{x:.1f}" y1="{margin_top}" x2="{x:.1f}" y2="{margin_top + chart_height}" stroke="#f1f5f9" stroke-width="1" />')
        svg.append(f'<text x="{x:.1f}" y="{margin_top + chart_height + 18}" text-anchor="middle" font-size="10" fill="#94a3b8">{score}</text>')

    cat_height = chart_height / len(categories)
    bar_height = (cat_height * 0.75) / len(suppliers)

    for c_idx, cat in enumerate(categories):
        cy = margin_top + c_idx * cat_height
        svg.append(f'<text x="{margin_left - 10}" y="{cy + cat_height/2 + 4}" text-anchor="end" font-size="11" font-weight="600" fill="#334155">{cat}</text>')

        for s_idx, s in enumerate(suppliers):
            color = colors[s_idx % len(colors)]
            score = s['criteria'][c_idx].get('score', 0)
            bar_w = (score / 10.0) * chart_width
            by = cy + (cat_height * 0.125) + s_idx * bar_height
            svg.append(f'<rect x="{margin_left}" y="{by:.1f}" width="{bar_w:.1f}" height="{bar_height - 2:.1f}" rx="2" fill="{color}" />')

    svg.append('</svg>')
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg))
    print(f"  ✓ SVG Bar Chart saved to: {output_path}")

def generate_svg_line_trajectory_chart(run_id, suppliers, output_path="chart_trajectory.svg"):
    """Generates an SVG line graph tracing parallel criteria trajectories and ranking crossovers."""
    categories = [c['name'] for c in suppliers[0]['criteria']]
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']

    width, height = 740, 440
    margin_left, margin_bottom, margin_top, margin_right = 60, 65, 60, 40
    chart_width = width - margin_left - margin_right
    chart_height = height - margin_top - margin_bottom

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background:#ffffff; font-family:system-ui, sans-serif;">',
        f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Criteria Performance Trajectory (Line Graph)</text>',
        f'<text x="{width/2}" y="48" text-anchor="middle" font-size="11" fill="#64748b">Session: {run_id} · Slopes highlight category ranking crossovers</text>'
    ]

    # Horizontal Grid lines
    for score in range(0, 11, 2):
        y = margin_top + chart_height - (score / 10.0) * chart_height
        svg.append(f'<line x1="{margin_left}" y1="{y:.1f}" x2="{margin_left + chart_width}" y2="{y:.1f}" stroke="#f1f5f9" stroke-width="1" />')
        svg.append(f'<text x="{margin_left - 10}" y="{y + 4:.1f}" text-anchor="end" font-size="10" fill="#94a3b8">{score}</text>')

    # Vertical Category lines
    n_cats = len(categories)
    step_x = chart_width / max(n_cats - 1, 1)
    cat_x_coords = []
    for c_idx, cat in enumerate(categories):
        x = margin_left + c_idx * step_x
        cat_x_coords.append(x)
        svg.append(f'<line x1="{x:.1f}" y1="{margin_top}" x2="{x:.1f}" y2="{margin_top + chart_height}" stroke="#e2e8f0" stroke-dasharray="3 3" stroke-width="1" />')
        
        # Abbreviate or wrap category label
        short_cat = cat if len(cat) <= 15 else cat[:13] + "..."
        svg.append(f'<text x="{x:.1f}" y="{margin_top + chart_height + 20}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">{short_cat}</text>')

    # Proposal lines & dots
    for s_idx, s in enumerate(suppliers):
        color = colors[s_idx % len(colors)]
        pts = []
        dots = []
        for c_idx, x in enumerate(cat_x_coords):
            score = s['criteria'][c_idx].get('score', 0)
            y = margin_top + chart_height - (min(max(score, 0), 10) / 10.0) * chart_height
            pts.append(f"{x:.1f},{y:.1f}")
            dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{color}" stroke="#ffffff" stroke-width="2" />')
        
        svg.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{color}" stroke-width="2.5" />')
        svg.extend(dots)

    # Legend
    legend_y = height - 15
    item_width = chart_width / max(len(suppliers), 1)
    for s_idx, s in enumerate(suppliers):
        color = colors[s_idx % len(colors)]
        x = margin_left + s_idx * item_width
        svg.append(f'<line x1="{x}" y1="{legend_y}" x2="{x + 18}" y2="{legend_y}" stroke="{color}" stroke-width="3" />')
        svg.append(f'<circle cx="{x + 9}" cy="{legend_y}" r="3" fill="{color}" />')
        svg.append(f'<text x="{x + 24}" y="{legend_y + 4}" font-size="11" font-weight="600" fill="#1e293b">#{s["final_rank"]} {s["supplier_name"]}</text>')

    svg.append('</svg>')
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg))
    print(f"  ✓ SVG Trajectory Line Chart saved to: {output_path}")

if __name__ == "__main__":
    run_id, suppliers = load_latest_evaluation_data()
    generate_text_chart(run_id, suppliers)
    generate_svg_radar_chart(run_id, suppliers)
    generate_svg_bars_chart(run_id, suppliers)
    generate_svg_line_trajectory_chart(run_id, suppliers)
