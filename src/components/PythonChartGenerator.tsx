import React, { useState, useMemo } from 'react';
import { SupplierResult } from '../types';
import { BarChart3, Copy, Download, Check, Code2, Terminal, Info, Sparkles, FileCode, LineChart as LineChartIcon, Eye, Radar } from 'lucide-react';

interface PythonChartGeneratorProps {
  suppliers: SupplierResult[];
}

export const PythonChartGenerator: React.FC<PythonChartGeneratorProps> = ({ suppliers }) => {
  const [chartType, setChartType] = useState<'line' | 'radar' | 'bar' | 'gap' | 'svg_standalone'>('line');
  const [libraryType, setLibraryType] = useState<'matplotlib' | 'plotly' | 'pure_python'>('pure_python');
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  // Generate clean supplier JSON data for Python
  const suppListJson = useMemo(() => {
    return JSON.stringify(
      suppliers.map((s) => ({
        name: s.supplier_name,
        rank: s.final_rank,
        ppi: s.ppi,
        score: s.absolute_score,
        scores: s.criteria.map((c) => ({
          category: c.name,
          score: c.score,
          benchmark: c.benchmark ?? c.score,
          relative: c.relative_percentage
        }))
      })),
      null,
      2
    );
  }, [suppliers]);

  // Generate python script based on chartType and libraryType
  const pythonScript = useMemo(() => {
    // Pure Python Zero-Dependency SVG scripts
    if (libraryType === 'pure_python') {
      if (chartType === 'line') {
        return `#!/usr/bin/env python3
"""
Criteria Performance Trajectory (Line Graph) - Pure Python SVG Generator
Generates clean SVG line charts illustrating ranking crossovers and performance slopes.
Zero third-party dependencies (no numpy, matplotlib, or plotly required).
Run: python3 rfp_line_pure_python.py
"""
import math

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
n_cats = len(categories)

def generate_trajectory_svg(filename="chart_trajectory.svg", width=740, height=440):
    margin_l, margin_r, margin_t, margin_b = 60, 40, 60, 65
    cw = width - margin_l - margin_r
    ch = height - margin_t - margin_b
    svg = [f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:system-ui,sans-serif;">']
    svg.append(f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Criteria Performance Trajectory (Line Graph)</text>')
    svg.append(f'<text x="{width/2}" y="48" text-anchor="middle" font-size="11" fill="#64748b">Crossover Slope Analysis · Slopes indicate relative category trade-offs</text>')
    
    # Y-axis Grid Lines (0 to 10 in steps of 2)
    for s in range(0, 11, 2):
        y = margin_t + ch - (s / 10.0) * ch
        svg.append(f'<line x1="{margin_l}" y1="{y:.1f}" x2="{margin_l + cw}" y2="{y:.1f}" stroke="#f1f5f9" stroke-width="1"/>')
        svg.append(f'<text x="{margin_l - 10}" y="{y + 4:.1f}" text-anchor="end" font-size="10" fill="#94a3b8">{s}</text>')
    
    # X-axis Categories
    step_x = cw / max(n_cats - 1, 1)
    xs = [margin_l + i * step_x for i in range(n_cats)]
    for i, (cat, x) in enumerate(zip(categories, xs)):
        svg.append(f'<line x1="{x:.1f}" y1="{margin_t}" x2="{x:.1f}" y2="{margin_t + ch}" stroke="#e2e8f0" stroke-dasharray="3 3" stroke-width="1"/>')
        short = cat if len(cat) <= 14 else cat[:12] + "..."
        svg.append(f'<text x="{x:.1f}" y="{margin_t + ch + 20}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">{short}</text>')
    
    # Proposal Lines & Dots
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
    for idx, v in enumerate(data):
        col = colors[idx % len(colors)]
        pts = []
        dots = []
        for i, x in enumerate(xs):
            score = v['scores'][i]['score']
            y = margin_t + ch - (max(0, min(10, score)) / 10.0) * ch
            pts.append(f"{x:.1f},{y:.1f}")
            dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{col}" stroke="#ffffff" stroke-width="2"/>')
        svg.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{col}" stroke-width="2.5"/>')
        svg.extend(dots)
    
    # Legend
    leg_x = margin_l
    item_w = cw / max(len(data), 1)
    for idx, v in enumerate(data):
        col = colors[idx % len(colors)]
        x = leg_x + idx * item_w
        svg.append(f'<line x1="{x}" y1="{height-15}" x2="{x+16}" y2="{height-15}" stroke="{col}" stroke-width="3"/>')
        svg.append(f'<circle cx="{x+8}" cy="{height-15}" r="3.5" fill="{col}"/>')
        svg.append(f'<text x="{x+22}" y="{height-11}" font-size="11" font-weight="600" fill="#1e293b">#{v["rank"]} {v["name"]}</text>')
    
    svg.append('</svg>')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(svg))
    print(f"✓ Standalone SVG Trajectory Line Chart saved to: {filename}")

if __name__ == '__main__':
    generate_trajectory_svg()
`;
      } else if (chartType === 'radar') {
        return `#!/usr/bin/env python3
"""
Proposal Capabilities Radar Profile - Pure Python SVG Generator
Zero third-party dependencies (no numpy, matplotlib, or plotly required).
Run: python3 rfp_radar_pure_python.py
"""
import math

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
n_cats = len(categories)

def generate_radar_svg(filename="chart_radar.svg", width=640, height=520):
    cx, cy, r = width / 2, height / 2 - 20, 160
    svg = [f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:system-ui,sans-serif;">']
    svg.append(f'<text x="{cx}" y="35" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Proposal Capabilities Radar Profile</text>')
    
    # Grid rings
    for ring in [0.25, 0.5, 0.75, 1.0]:
        ring_r = r * ring
        svg.append(f'<circle cx="{cx}" cy="{cy}" r="{ring_r}" fill="none" stroke="#e2e8f0" stroke-width="1"/>')
        svg.append(f'<text x="{cx+5}" y="{cy-ring_r+12}" font-size="9" fill="#94a3b8">{int(ring*10)}/10</text>')
    
    # Spoke axes
    angles = [i * 2 * math.pi / n_cats - math.pi / 2 for i in range(n_cats)]
    for i, (cat, ang) in enumerate(zip(categories, angles)):
        x2 = cx + r * math.cos(ang)
        y2 = cy + r * math.sin(ang)
        svg.append(f'<line x1="{cx}" y1="{cy}" x2="{x2}" y2="{y2}" stroke="#cbd5e1" stroke-width="1"/>')
        lx = cx + (r + 28) * math.cos(ang)
        ly = cy + (r + 28) * math.sin(ang) + 4
        anchor = "middle" if abs(math.cos(ang)) < 0.2 else ("start" if math.cos(ang) > 0 else "end")
        svg.append(f'<text x="{lx}" y="{ly}" text-anchor="{anchor}" font-size="11" font-weight="bold" fill="#334155">{cat}</text>')

    # Proposals
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
    for idx, v in enumerate(data):
        pts = []
        for i, ang in enumerate(angles):
            val = v['scores'][i]['score']
            norm = max(0, min(10, val)) / 10.0
            px = cx + (r * norm) * math.cos(ang)
            py = cy + (r * norm) * math.sin(ang)
            pts.append(f"{px:.1f},{py:.1f}")
        col = colors[idx % len(colors)]
        svg.append(f'<polygon points="{" ".join(pts)}" fill="{col}" fill-opacity="0.22" stroke="{col}" stroke-width="2.5"/>')

    # Legend
    leg_x = cx - (len(data) * 110) / 2
    for idx, v in enumerate(data):
        col = colors[idx % len(colors)]
        svg.append(f'<rect x="{leg_x + idx*115}" y="{height-30}" width="12" height="12" rx="3" fill="{col}"/>')
        svg.append(f'<text x="{leg_x + idx*115 + 18}" y="{height-20}" font-size="11" font-weight="600" fill="#334155">{v["name"]}</text>')

    svg.append('</svg>')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(svg))
    print(f"✓ Standalone SVG Radar Chart saved to: {filename}")

if __name__ == '__main__':
    generate_radar_svg()
`;
      } else if (chartType === 'bar') {
        return `#!/usr/bin/env python3
"""
Category Scores Grouped Bars - Pure Python SVG Generator
Zero third-party dependencies (no numpy, matplotlib, or plotly required).
Run: python3 rfp_bars_pure_python.py
"""
data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
n_cats = len(categories)

def generate_bars_svg(filename="chart_bars.svg", width=700, height=420):
    m_left, m_right, m_top, m_bottom = 140, 40, 50, 50
    cw = width - m_left - m_right
    ch = height - m_top - m_bottom
    svg = [f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:system-ui,sans-serif;">']
    svg.append(f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Category Scores Comparison</text>')
    
    # Scale grid
    for s in range(0, 11, 2):
        x = m_left + (s / 10.0) * cw
        svg.append(f'<line x1="{x:.1f}" y1="{m_top}" x2="{x:.1f}" y2="{m_top + ch}" stroke="#f1f5f9" stroke-width="1"/>')
        svg.append(f'<text x="{x:.1f}" y="{m_top + ch + 18}" text-anchor="middle" font-size="10" fill="#94a3b8">{s}</text>')
        
    cat_h = ch / n_cats
    bar_h = (cat_h * 0.75) / max(len(data), 1)
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
    
    for c_idx, cat in enumerate(categories):
        cy = m_top + c_idx * cat_h
        svg.append(f'<text x="{m_left - 10}" y="{cy + cat_h/2 + 4}" text-anchor="end" font-size="11" font-weight="600" fill="#334155">{cat}</text>')
        for v_idx, v in enumerate(data):
            score = v['scores'][c_idx]['score']
            bw = (score / 10.0) * cw
            by = cy + (cat_h * 0.125) + v_idx * bar_h
            svg.append(f'<rect x="{m_left}" y="{by:.1f}" width="{bw:.1f}" height="{bar_h - 2:.1f}" rx="2" fill="{colors[v_idx % len(colors)]}"/>')
            
    svg.append('</svg>')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(svg))
    print(f"✓ Standalone SVG Bars Chart saved to: {filename}")

if __name__ == '__main__':
    generate_bars_svg()
`;
      } else if (chartType === 'gap') {
        return `#!/usr/bin/env python3
"""
Deficit Gap vs Category Leader - Pure Python SVG Generator
Zero third-party dependencies (no numpy, matplotlib, or plotly required).
Run: python3 rfp_gap_pure_python.py
"""
data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
n_cats = len(categories)

def generate_gap_svg(filename="chart_gap.svg", width=700, height=420):
    m_left, m_right, m_top, m_bottom = 140, 40, 50, 50
    cw = width - m_left - m_right
    ch = height - m_top - m_bottom
    svg = [f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:system-ui,sans-serif;">']
    svg.append(f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gap vs Category Leader Benchmark (&lt;= 0.0)</text>')
    
    # Zero baseline on right
    svg.append(f'<line x1="{m_left + cw}" y1="{m_top}" x2="{m_left + cw}" y2="{m_top + ch}" stroke="#334155" stroke-width="2"/>')
    svg.append(f'<text x="{m_left + cw}" y="{m_top - 10}" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">Benchmark (0.0)</text>')
    
    cat_h = ch / n_cats
    bar_h = (cat_h * 0.75) / max(len(data), 1)
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
    
    for c_idx, cat in enumerate(categories):
        cy = m_top + c_idx * cat_h
        svg.append(f'<text x="{m_left - 10}" y="{cy + cat_h/2 + 4}" text-anchor="end" font-size="11" font-weight="600" fill="#334155">{cat}</text>')
        for v_idx, v in enumerate(data):
            c_data = v['scores'][c_idx]
            gap = c_data['score'] - c_data['benchmark']  # <= 0
            bw = (abs(gap) / 10.0) * cw
            bx = (m_left + cw) - bw
            by = cy + (cat_h * 0.125) + v_idx * bar_h
            svg.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bar_h - 2:.1f}" rx="2" fill="{colors[v_idx % len(colors)]}" opacity="0.85"/>')
            
    svg.append('</svg>')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(svg))
    print(f"✓ Standalone SVG Gap Chart saved to: {filename}")

if __name__ == '__main__':
    generate_gap_svg()
`;
      } else {
        // Multi-chart generate_charts.py
        return `#!/usr/bin/env python3
"""
Pure Python Zero-Dependency Multi-Chart Generator (generate_charts.py)
Generates both Radar Profile AND Trajectory Line Graph SVGs directly.
Run: python3 generate_charts.py
"""
import math

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
n_cats = len(categories)

def generate_trajectory_svg(filename="chart_trajectory.svg", width=740, height=440):
    margin_l, margin_r, margin_t, margin_b = 60, 40, 60, 65
    cw = width - margin_l - margin_r
    ch = height - margin_t - margin_b
    svg = [f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:system-ui,sans-serif;">']
    svg.append(f'<text x="{width/2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Criteria Performance Trajectory (Line Graph)</text>')
    svg.append(f'<text x="{width/2}" y="48" text-anchor="middle" font-size="11" fill="#64748b">Crossover Slope Analysis</text>')
    
    for s in range(0, 11, 2):
        y = margin_t + ch - (s / 10.0) * ch
        svg.append(f'<line x1="{margin_l}" y1="{y:.1f}" x2="{margin_l + cw}" y2="{y:.1f}" stroke="#f1f5f9" stroke-width="1"/>')
        svg.append(f'<text x="{margin_l - 10}" y="{y + 4:.1f}" text-anchor="end" font-size="10" fill="#94a3b8">{s}</text>')
    
    step_x = cw / max(n_cats - 1, 1)
    xs = [margin_l + i * step_x for i in range(n_cats)]
    for i, (cat, x) in enumerate(zip(categories, xs)):
        svg.append(f'<line x1="{x:.1f}" y1="{margin_t}" x2="{x:.1f}" y2="{margin_t + ch}" stroke="#e2e8f0" stroke-dasharray="3 3" stroke-width="1"/>')
        short = cat if len(cat) <= 14 else cat[:12] + "..."
        svg.append(f'<text x="{x:.1f}" y="{margin_t + ch + 20}" text-anchor="middle" font-size="11" font-weight="600" fill="#334155">{short}</text>')
    
    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
    for idx, v in enumerate(data):
        col = colors[idx % len(colors)]
        pts = []
        dots = []
        for i, x in enumerate(xs):
            score = v['scores'][i]['score']
            y = margin_t + ch - (max(0, min(10, score)) / 10.0) * ch
            pts.append(f"{x:.1f},{y:.1f}")
            dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{col}" stroke="#ffffff" stroke-width="2"/>')
        svg.append(f'<polyline points="{" ".join(pts)}" fill="none" stroke="{col}" stroke-width="2.5"/>')
        svg.extend(dots)
    
    leg_x = margin_l
    item_w = cw / max(len(data), 1)
    for idx, v in enumerate(data):
        col = colors[idx % len(colors)]
        x = leg_x + idx * item_w
        svg.append(f'<line x1="{x}" y1="{height-15}" x2="{x+16}" y2="{height-15}" stroke="{col}" stroke-width="3"/>')
        svg.append(f'<circle cx="{x+8}" cy="{height-15}" r="3.5" fill="{col}"/>')
        svg.append(f'<text x="{x+22}" y="{height-11}" font-size="11" font-weight="600" fill="#1e293b">#{v["rank"]} {v["name"]}</text>')
    
    svg.append('</svg>')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(svg))
    print(f"✓ Standalone SVG Trajectory Line Chart saved to: {filename}")

def generate_radar_svg(filename="chart_radar.svg", width=640, height=520):
    cx, cy, r = width / 2, height / 2 - 20, 160
    svg = [f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;font-family:system-ui,sans-serif;">']
    svg.append(f'<text x="{cx}" y="35" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Proposal Capabilities Radar Profile</text>')
    
    for ring in [0.25, 0.5, 0.75, 1.0]:
        ring_r = r * ring
        svg.append(f'<circle cx="{cx}" cy="{cy}" r="{ring_r}" fill="none" stroke="#e2e8f0" stroke-width="1"/>')
        svg.append(f'<text x="{cx+5}" y="{cy-ring_r+12}" font-size="9" fill="#94a3b8">{int(ring*10)}/10</text>')
    
    angles = [i * 2 * math.pi / n_cats - math.pi / 2 for i in range(n_cats)]
    for i, (cat, ang) in enumerate(zip(categories, angles)):
        x2 = cx + r * math.cos(ang)
        y2 = cy + r * math.sin(ang)
        svg.append(f'<line x1="{cx}" y1="{cy}" x2="{x2}" y2="{y2}" stroke="#cbd5e1" stroke-width="1"/>')
        lx = cx + (r + 28) * math.cos(ang)
        ly = cy + (r + 28) * math.sin(ang) + 4
        anchor = "middle" if abs(math.cos(ang)) < 0.2 else ("start" if math.cos(ang) > 0 else "end")
        svg.append(f'<text x="{lx}" y="{ly}" text-anchor="{anchor}" font-size="11" font-weight="bold" fill="#334155">{cat}</text>')

    colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
    for idx, v in enumerate(data):
        pts = []
        for i, ang in enumerate(angles):
            val = v['scores'][i]['score']
            norm = max(0, min(10, val)) / 10.0
            px = cx + (r * norm) * math.cos(ang)
            py = cy + (r * norm) * math.sin(ang)
            pts.append(f"{px:.1f},{py:.1f}")
        col = colors[idx % len(colors)]
        svg.append(f'<polygon points="{" ".join(pts)}" fill="{col}" fill-opacity="0.22" stroke="{col}" stroke-width="2.5"/>')

    leg_x = cx - (len(data) * 110) / 2
    for idx, v in enumerate(data):
        col = colors[idx % len(colors)]
        svg.append(f'<rect x="{leg_x + idx*115}" y="{height-30}" width="12" height="12" rx="3" fill="{col}"/>')
        svg.append(f'<text x="{leg_x + idx*115 + 18}" y="{height-20}" font-size="11" font-weight="600" fill="#334155">{v["name"]}</text>')

    svg.append('</svg>')
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(svg))
    print(f"✓ Standalone SVG Radar Chart saved to: {filename}")

if __name__ == '__main__':
    generate_trajectory_svg()
    generate_radar_svg()
`;
      }
    }

    if (libraryType === 'plotly') {
      if (chartType === 'line') {
        return `"""
Criteria Performance Trajectory (Line Graph) using Plotly
Requirements: pip install plotly
Run: python3 plot_trajectory_plotly.py
"""
import plotly.graph_objects as go

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]

fig = go.Figure()

for vendor in data:
    scores = [c['score'] for c in vendor['scores']]
    fig.add_trace(go.Scatter(
        name=f"#{vendor['rank']} {vendor['name']}",
        x=categories,
        y=scores,
        mode='lines+markers',
        line=dict(width=2.5),
        marker=dict(size=8)
    ))

fig.update_layout(
    title="Criteria Performance Trajectory & Ranking Crossovers",
    yaxis_title="Score (out of 10)",
    xaxis_title="Evaluation Categories",
    yaxis_range=[0, 10.5],
    template="plotly_white",
    hovermode="x unified"
)

fig.show()
`;
      } else if (chartType === 'radar') {
        return `"""
Interactive Radar Profile Chart using Plotly
Requirements: pip install plotly
Run: python3 plot_radar_plotly.py
"""
import plotly.graph_objects as go

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
categories_closed = categories + [categories[0]]

fig = go.Figure()

for vendor in data:
    scores = [c['score'] for c in vendor['scores']]
    scores_closed = scores + [scores[0]]
    fig.add_trace(go.Scatterpolar(
        r=scores_closed,
        theta=categories_closed,
        fill='toself',
        name=f"#{vendor['rank']} {vendor['name']} ({vendor['ppi']:.1f}%)"
    ))

fig.update_layout(
    polar=dict(
        radialaxis=dict(
            visible=True,
            range=[0, 10]
        )
    ),
    title="Proposal Capabilities Radar Profile",
    showlegend=True,
    template="plotly_white"
)

fig.show()
`;
      } else if (chartType === 'gap') {
        return `"""
Leader Gap Analysis Chart using Plotly
Requirements: pip install plotly
Run: python3 plot_gap_plotly.py
"""
import plotly.graph_objects as go

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]

fig = go.Figure()

for vendor in data:
    gaps = [c['score'] - c['benchmark'] for c in vendor['scores']]
    fig.add_trace(go.Bar(
        name=f"{vendor['name']} (Rank #{vendor['rank']})",
        x=categories,
        y=gaps
    ))

fig.update_layout(
    barmode='group',
    title="Capability Gap vs Category Benchmark Leader (<= 0)",
    yaxis_title="Score Gap vs Leader",
    xaxis_title="Evaluation Criteria",
    template="plotly_white"
)

fig.show()
`;
      } else {
        return `"""
Category Scores Grouped Bar Chart using Plotly
Requirements: pip install plotly
Run: python3 plot_bars_plotly.py
"""
import plotly.graph_objects as go

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]

fig = go.Figure()

for vendor in data:
    scores = [c['score'] for c in vendor['scores']]
    fig.add_trace(go.Bar(
        name=f"{vendor['name']} (Match: {vendor['ppi']:.1f}%)",
        x=categories,
        y=scores
    ))

fig.update_layout(
    barmode='group',
    title="Proposal Scores across Evaluation Categories",
    yaxis_title="Score (out of 10)",
    yaxis_range=[0, 10.5],
    template="plotly_white"
)

fig.show()
`;
      }
    }

    // Default: Matplotlib
    if (chartType === 'line') {
      return `"""
Criteria Performance Trajectory Line Graph generated by Python
Requirements: pip install matplotlib numpy
Run: python3 plot_trajectory.py
"""
import numpy as np
import matplotlib.pyplot as plt

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
x = np.arange(len(categories))

fig, ax = plt.subplots(figsize=(10, 6))
colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']
markers = ['o', 's', '^', 'D', 'v', 'p']

for idx, vendor in enumerate(data):
    scores = [c['score'] for c in vendor['scores']]
    color = colors[idx % len(colors)]
    marker = markers[idx % len(markers)]
    ax.plot(x, scores, marker=marker, linewidth=2.5, markersize=8, label=f"#{vendor['rank']} {vendor['name']}", color=color)

ax.set_ylabel('Score (0-10)', fontweight='bold')
ax.set_title('Criteria Performance Trajectory & Ranking Crossovers', fontsize=14, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(categories, rotation=15, ha='right')
ax.legend(title='Proposals')
ax.set_ylim(0, 10.5)
ax.grid(True, linestyle='--', alpha=0.6)
plt.tight_layout()
plt.show()
`;
    } else if (chartType === 'radar') {
      return `"""
Proposal Capabilities Radar Profile Chart
Requirements: pip install matplotlib numpy
Run: python3 plot_radar.py
"""
import numpy as np
import matplotlib.pyplot as plt

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
N = len(categories)

# Calculate angles for each category
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]  # Close circular radar

fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
plt.xticks(angles[:-1], categories, color='grey', size=10, weight='bold')
ax.set_rlabel_position(0)
plt.yticks([2, 4, 6, 8, 10], ["2", "4", "6", "8", "10"], color="grey", size=8)
plt.ylim(0, 10)

colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']

for idx, vendor in enumerate(data):
    scores = [c['score'] for c in vendor['scores']]
    scores += scores[:1]
    color = colors[idx % len(colors)]
    ax.plot(angles, scores, linewidth=2, linestyle='solid', label=f"#{vendor['rank']} {vendor['name']}", color=color)
    ax.fill(angles, scores, color=color, alpha=0.18)

plt.title('Proposal Capabilities Radar Profile', size=15, weight='bold', y=1.08)
plt.legend(loc='upper right', bbox_to_anchor=(1.25, 1.1))
plt.tight_layout()
plt.show()
`;
    } else if (chartType === 'bar') {
      return `"""
Side-by-Side Category Scores Bar Chart
Requirements: pip install matplotlib numpy
Run: python3 plot_bars.py
"""
import numpy as np
import matplotlib.pyplot as plt

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
x = np.arange(len(categories))
width = 0.8 / len(data)

fig, ax = plt.subplots(figsize=(10, 6))
colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']

for idx, vendor in enumerate(data):
    scores = [c['score'] for c in vendor['scores']]
    offset = (idx - len(data) / 2 + 0.5) * width
    ax.bar(x + offset, scores, width, label=f"#{vendor['rank']} {vendor['name']}", color=colors[idx % len(colors)])

ax.set_ylabel('Category Score (0-10)', fontweight='bold')
ax.set_title('Proposal Category Scores Comparison', fontsize=14, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(categories, rotation=15, ha='right')
ax.legend(title='Proposals')
ax.set_ylim(0, 10.5)
ax.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.show()
`;
    } else {
      return `"""
Leader Gap Analysis Chart generated by Python
Requirements: pip install matplotlib numpy
Run: python3 plot_gaps.py
"""
import numpy as np
import matplotlib.pyplot as plt

data = ${suppListJson}
categories = [c['category'] for c in data[0]['scores']]
x = np.arange(len(categories))
width = 0.8 / len(data)

fig, ax = plt.subplots(figsize=(10, 6))
colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669']

for idx, vendor in enumerate(data):
    gaps = [c['score'] - c['benchmark'] for c in vendor['scores']]
    offset = (idx - len(data) / 2 + 0.5) * width
    ax.bar(x + offset, gaps, width, label=f"#{vendor['rank']} {vendor['name']}", color=colors[idx % len(colors)])

ax.axhline(0, color='black', linewidth=1)
ax.set_ylabel('Gap vs Category Leader (<= 0)', fontweight='bold')
ax.set_title('Performance Gap vs Category Leader Benchmark', fontsize=14, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(categories, rotation=15, ha='right')
ax.legend(title='Proposals')
ax.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.show()
`;
    }
  }, [suppliers, suppListJson, chartType, libraryType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `rfp_${chartType}_${libraryType}.py`;
    const blob = new Blob([pythonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper palette
  const colors = ['#6366f1', '#0284c7', '#d97706', '#e11d48', '#8b5cf6', '#059669'];
  const categories = useMemo(() => {
    return suppliers[0]?.criteria?.map(c => c.name) || [];
  }, [suppliers]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Python Chart Generator &amp; Visualization Scripts</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export standalone Python visualization code bound to the current evaluation session ({suppliers.length} proposals), including the Criteria Performance Trajectory Line Graph.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Preview vs Code */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setActiveView('preview')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'preview'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Live Chart Preview</span>
              </button>
              <button
                onClick={() => setActiveView('code')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'code'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Python Script</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chart Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart Style Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs space-y-2.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            1. Select Visualization Type:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                chartType === 'line'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <LineChartIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Trajectory (Line Graph)</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Parallel ranking crossovers</div>
            </button>

            <button
              onClick={() => setChartType('radar')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                chartType === 'radar'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Radar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Radar Capabilities</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Multivariate polar chart</div>
            </button>

            <button
              onClick={() => setChartType('bar')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Category Scores Bars</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Grouped side-by-side bars</div>
            </button>

            <button
              onClick={() => setChartType('gap')}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                chartType === 'gap'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Gap vs Leader Benchmark</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Deficit vs top supplier</div>
            </button>

            <button
              onClick={() => {
                setChartType('svg_standalone');
                setLibraryType('pure_python');
              }}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer col-span-2 ${
                chartType === 'svg_standalone'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-500 text-indigo-950 dark:text-indigo-200 font-semibold ring-1 ring-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pure Python Multi-Chart Suite (generate_charts.py)</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Outputs Radar + Trajectory Line Graph SVGs with zero external libraries
              </div>
            </button>
          </div>
        </div>

        {/* Engine / Framework Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs space-y-2.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            2. Select Python Library:
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setLibraryType('pure_python')}
              className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                libraryType === 'pure_python'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div>
                <span className="text-xs font-bold block">Pure Python Zero-Dependency (SVG)</span>
                <span className="text-[11px] opacity-80">Generates clean standalone SVGs without any pip packages</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold">
                No pip needed
              </span>
            </button>

            <button
              onClick={() => {
                setLibraryType('matplotlib');
                if (chartType === 'svg_standalone') setChartType('line');
              }}
              className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                libraryType === 'matplotlib' && chartType !== 'svg_standalone'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div>
                <span className="text-xs font-bold block">Matplotlib &amp; NumPy</span>
                <span className="text-[11px] opacity-80">Publication-ready static plots for academic or enterprise reports</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800">
                pip install matplotlib
              </span>
            </button>

            <button
              onClick={() => {
                setLibraryType('plotly');
                if (chartType === 'svg_standalone') setChartType('line');
              }}
              className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                libraryType === 'plotly' && chartType !== 'svg_standalone'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div>
                <span className="text-xs font-bold block">Plotly Interactive</span>
                <span className="text-[11px] opacity-80">Interactive web tooltips, zoom, and dynamic traces</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800">
                pip install plotly
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Chart Preview OR Python Code Block */}
      {activeView === 'preview' ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {chartType === 'line' && 'Criteria Performance Trajectory (Line Graph) Live Preview'}
                  {chartType === 'radar' && 'Radar Capabilities Profile Live Preview'}
                  {chartType === 'bar' && 'Category Scores Comparison Live Preview'}
                  {chartType === 'gap' && 'Gap vs Leader Benchmark Live Preview'}
                  {chartType === 'svg_standalone' && 'Pure Python SVG Suite: Trajectory Line Graph & Radar Profile'}
                </span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Generated via Pure Python SVG Logic
              </span>
            </div>
            <button
              onClick={() => setActiveView('code')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Inspect Python Code</span>
            </button>
          </div>

          {/* SVG RENDERER CONTAINER */}
          <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
            {chartType === 'line' || chartType === 'svg_standalone' ? (
              <svg viewBox="0 0 740 440" width="740" height="440" className="max-w-full h-auto bg-white dark:bg-slate-900 rounded-lg shadow-2xs font-sans">
                <text x="370" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" className="text-slate-900 dark:text-white">
                  Criteria Performance Trajectory (Line Graph)
                </text>
                <text x="370" y="48" textAnchor="middle" fontSize="11" fill="currentColor" className="text-slate-500 dark:text-slate-400">
                  Slopes illustrate category ranking crossovers and performance trade-offs
                </text>

                {/* Horizontal Grid lines (0 to 10) */}
                {[0, 2, 4, 6, 8, 10].map((s) => {
                  const y = 60 + 315 - (s / 10.0) * 315;
                  return (
                    <g key={s}>
                      <line x1="60" y1={y} x2="700" y2={y} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                      <text x="50" y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" className="text-slate-400 font-mono">
                        {s}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Category Guidelines */}
                {categories.map((cat, i) => {
                  const stepX = 640 / Math.max(categories.length - 1, 1);
                  const x = 60 + i * stepX;
                  const short = cat.length <= 15 ? cat : cat.slice(0, 13) + '...';
                  return (
                    <g key={cat}>
                      <line x1={x} y1="60" x2={x} y2="375" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
                      <text x={x} y="395" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" className="text-slate-700 dark:text-slate-300">
                        {short}
                      </text>
                    </g>
                  );
                })}

                {/* Proposal Lines and Data Markers */}
                {suppliers.map((v, vIdx) => {
                  const col = colors[vIdx % colors.length];
                  const stepX = 640 / Math.max(categories.length - 1, 1);
                  const points = v.criteria.map((c, i) => {
                    const x = 60 + i * stepX;
                    const y = 60 + 315 - (Math.max(0, Math.min(10, c.score)) / 10.0) * 315;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  return (
                    <g key={v.supplier_name}>
                      <polyline points={points} fill="none" stroke={col} strokeWidth="2.5" />
                      {v.criteria.map((c, i) => {
                        const x = 60 + i * stepX;
                        const y = 60 + 315 - (Math.max(0, Math.min(10, c.score)) / 10.0) * 315;
                        return (
                          <circle key={i} cx={x} cy={y} r="4.5" fill={col} stroke="#ffffff" strokeWidth="2">
                            <title>{`${v.supplier_name} - ${c.name}: ${c.score}/10`}</title>
                          </circle>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Legend */}
                {suppliers.map((v, vIdx) => {
                  const col = colors[vIdx % colors.length];
                  const itemW = 640 / Math.max(suppliers.length, 1);
                  const x = 60 + vIdx * itemW;
                  return (
                    <g key={`legend-${v.supplier_name}`}>
                      <line x1={x} y1="425" x2={x + 16} y2="425" stroke={col} strokeWidth="3" />
                      <circle cx={x + 8} cy="425" r="3.5" fill={col} />
                      <text x={x + 22} y="429" fontSize="11" fontWeight="600" fill="currentColor" className="text-slate-800 dark:text-slate-200">
                        #{v.final_rank} {v.supplier_name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : chartType === 'radar' ? (
              <svg viewBox="0 0 640 520" width="640" height="520" className="max-w-full h-auto bg-white dark:bg-slate-900 rounded-lg shadow-2xs font-sans">
                <text x="320" y="35" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" className="text-slate-900 dark:text-white">
                  Proposal Capabilities Radar Profile
                </text>
                {/* Rings */}
                {[0.25, 0.5, 0.75, 1.0].map((ring) => (
                  <circle key={ring} cx="320" cy="240" r={160 * ring} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                ))}
                {/* Spokes */}
                {categories.map((cat, i) => {
                  const ang = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                  const x2 = 320 + 160 * Math.cos(ang);
                  const y2 = 240 + 160 * Math.sin(ang);
                  const lx = 320 + 188 * Math.cos(ang);
                  const ly = 240 + 188 * Math.sin(ang) + 4;
                  return (
                    <g key={cat}>
                      <line x1="320" y1="240" x2={x2} y2={y2} stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1" />
                      <text x={lx} y={ly} textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" className="text-slate-700 dark:text-slate-300">
                        {cat}
                      </text>
                    </g>
                  );
                })}
                {/* Polygons */}
                {suppliers.map((v, vIdx) => {
                  const col = colors[vIdx % colors.length];
                  const points = v.criteria.map((c, i) => {
                    const ang = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
                    const norm = Math.max(0, Math.min(10, c.score)) / 10.0;
                    const px = 320 + 160 * norm * Math.cos(ang);
                    const py = 240 + 160 * norm * Math.sin(ang);
                    return `${px.toFixed(1)},${py.toFixed(1)}`;
                  }).join(' ');
                  return (
                    <polygon key={v.supplier_name} points={points} fill={col} fillOpacity="0.22" stroke={col} strokeWidth="2.5" />
                  );
                })}
                {/* Legend */}
                {suppliers.map((v, vIdx) => {
                  const col = colors[vIdx % colors.length];
                  const legX = 320 - (suppliers.length * 110) / 2;
                  return (
                    <g key={v.supplier_name}>
                      <rect x={legX + vIdx * 115} y="490" width="12" height="12" rx="3" fill={col} />
                      <text x={legX + vIdx * 115 + 18} y="500" fontSize="11" fontWeight="600" fill="currentColor" className="text-slate-800 dark:text-slate-200">
                        {v.supplier_name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <svg viewBox="0 0 700 380" width="700" height="380" className="max-w-full h-auto bg-white dark:bg-slate-900 rounded-lg shadow-2xs font-sans">
                <text x="350" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" className="text-slate-900 dark:text-white">
                  {chartType === 'gap' ? 'Gap vs Category Benchmark Leader (<= 0)' : 'Category Scores Comparison'}
                </text>
                {/* Score Grid */}
                {[0, 2, 4, 6, 8, 10].map((s) => {
                  const x = 140 + (s / 10.0) * 520;
                  return (
                    <g key={s}>
                      <line x1={x} y1="50" x2={x} y2="330" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                      <text x={x} y="348" textAnchor="middle" fontSize="10" fill="currentColor" className="text-slate-400 font-mono">
                        {s}
                      </text>
                    </g>
                  );
                })}
                {/* Bars */}
                {categories.map((cat, cIdx) => {
                  const catH = 280 / categories.length;
                  const barH = (catH * 0.75) / Math.max(suppliers.length, 1);
                  const cy = 50 + cIdx * catH;
                  return (
                    <g key={cat}>
                      <text x="130" y={cy + catH / 2 + 4} textAnchor="end" fontSize="11" fontWeight="600" fill="currentColor" className="text-slate-700 dark:text-slate-300">
                        {cat}
                      </text>
                      {suppliers.map((v, vIdx) => {
                        const score = v.criteria[cIdx]?.score || 0;
                        const bw = (score / 10.0) * 520;
                        const by = cy + catH * 0.125 + vIdx * barH;
                        return (
                          <rect key={v.supplier_name} x="140" y={by} width={bw} height={barH - 2} rx="2" fill={colors[vIdx % colors.length]} />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      ) : (
        /* Code Viewer */
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="font-mono text-slate-300 ml-2">
                rfp_{chartType}_{libraryType}.py
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {pythonScript.split('\n').length} lines · UTF-8
            </span>
          </div>
          <pre className="p-4 text-slate-200 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed selection:bg-indigo-500/30">
            <code>{pythonScript}</code>
          </pre>
        </div>
      )}

      {/* Execution Instructions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
          <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Quick Terminal Execution:</span>
        </div>
        <div className="p-3 bg-slate-950 font-mono text-xs text-emerald-400 rounded-lg overflow-x-auto border border-slate-800 space-y-1">
          <div className="text-slate-500"># 1. Run repository built-in generator (zero external dependencies):</div>
          <div>python3 generate_charts.py</div>
          <div className="text-slate-500 mt-2"># 2. Or execute this downloaded script directly:</div>
          <div>python3 rfp_{chartType}_{libraryType}.py</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            The generated script embeds your current evaluation scores directly so you can reproduce, modify, or embed these charts into formal vendor evaluation reports without extra API keys.
          </span>
        </div>
      </div>
    </div>
  );
};

