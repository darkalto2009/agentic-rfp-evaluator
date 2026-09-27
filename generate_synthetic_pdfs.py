"""
generate_synthetic_pdfs.py
----------------------------
Generates four fictional, clearly-labeled synthetic supplier RFP response
PDFs for classroom use. No real supplier data is used anywhere.

Each PDF contains six sections:
  Executive Summary, Proposed Solution, Timeline & Team, Pricing & Assumptions,
  Security & Compliance, Support & References

Run directly:  python generate_synthetic_pdfs.py
Outputs land in: ./data/proposals/<Supplier Name>.pdf
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib import colors

OUTPUT_DIR = Path(__file__).parent / "data" / "proposals"

# --------------------------------------------------------------------------- #
# Synthetic supplier profiles (fictional — for classroom testing only)
# --------------------------------------------------------------------------- #

SUPPLIERS = {
    "Apex Systems": {
        "submission_date": "2026-03-01",
        "experience_rating": 4.8,
        "executive_summary": (
            "Apex Systems proposes a cloud-native procurement automation platform built on a "
            "microservices architecture. We understand the requirement for a scalable, secure, "
            "and highly integrated solution and believe our technical depth is the strongest "
            "differentiator in this proposal."
        ),
        "proposed_solution": (
            "Our solution is composed of independently deployable microservices communicating over "
            "gRPC and REST APIs, deployed on Kubernetes for horizontal scalability. We provide native "
            "integrations with SAP Ariba, Oracle Procurement Cloud, and Coupa via pre-built connectors. "
            "The architecture supports multi-region active-active deployment and has been load-tested "
            "to 50,000 concurrent users. Our platform uses an event-driven design (Kafka) to keep "
            "downstream systems synchronized in near real time."
        ),
        "timeline_team": (
            "Delivery is planned over 22 weeks across four phases: Discovery (3 weeks), Core Build "
            "(10 weeks), Integration & Hardening (6 weeks), and Go-Live & Hypercare (3 weeks). The core "
            "delivery team includes a Technical Architect, 4 senior engineers, 1 DevOps engineer, and a "
            "dedicated project manager. A RAID log will be maintained jointly with the customer, with a "
            "documented risk mitigation plan for integration slippage and data migration risk."
        ),
        "pricing_assumptions": (
            "Total Cost of Ownership over 3 years: $1,240,000, comprising $410,000 implementation and "
            "$276,667 per year in platform and support fees. Pricing assumes a single production region "
            "plus one DR region, up to 500 named users, and standard connector packages for the three "
            "ERPs listed above. Additional connectors are quoted at $18,000 each. Assumes customer "
            "provides a dedicated product owner for the duration of the engagement."
        ),
        "security_compliance": (
            "Apex Systems holds SOC 2 Type II and ISO 27001 certifications (available on request under "
            "NDA). All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We support SSO via "
            "SAML 2.0 and OIDC, role-based access control, and full audit logging retained for 7 years. "
            "Annual third-party penetration testing reports are shared with customers under NDA. GDPR "
            "and CCPA data processing addenda are available."
        ),
        "support_references": (
            "24/7 Severity-1 support with a 30-minute response SLA, and a named Customer Success Manager "
            "for the first 12 months. Apex has delivered 14 similar procurement transformation projects "
            "for enterprise manufacturing and logistics clients over the past 5 years. References "
            "available for two Fortune 500 manufacturing customers upon request."
        ),
    },
    "BrightPath Tech": {
        "submission_date": "2026-03-02",
        "experience_rating": 3.5,
        "executive_summary": (
            "BrightPath Tech offers the most cost-effective and fastest path to a working procurement "
            "evaluation tool. We focus on shipping a lean, functional product quickly rather than "
            "over-engineering for scale the customer may not need yet."
        ),
        "proposed_solution": (
            "Our solution is a single web application backed by a PostgreSQL database, with a simple "
            "REST API layer. We provide a CSV import/export bridge that can be used to move data in and "
            "out of common ERPs; direct native connectors are on our roadmap but not yet available in "
            "production. The application is deployed as a single container which can be scaled "
            "vertically as usage grows."
        ),
        "timeline_team": (
            "We can deliver a working version in 8 weeks: 1 week discovery, 5 weeks build, 2 weeks "
            "testing and launch. The team is two full-stack engineers and a part-time project "
            "coordinator. Given the compressed timeline, formal change-management and risk-register "
            "processes are lightweight; issues are tracked in a shared spreadsheet."
        ),
        "pricing_assumptions": (
            "Total Cost of Ownership over 3 years: $310,000, comprising $60,000 implementation and "
            "$83,333 per year subscription. This is the lowest-priced option in the market for this "
            "scope. Pricing assumes up to 100 named users and does not include custom ERP connector "
            "development, which would be scoped separately."
        ),
        "security_compliance": (
            "Data is encrypted in transit via TLS. We are in the process of pursuing SOC 2 Type I "
            "certification, targeted for completion next year; it has not yet been achieved. We do not "
            "currently offer field-level encryption at rest beyond standard cloud-provider disk "
            "encryption. Access control is managed via basic username/password login; SSO support is "
            "planned but not yet available."
        ),
        "support_references": (
            "Support is available on business days, 9am-6pm, via email ticketing, with a target response "
            "time of 1 business day. BrightPath Tech was founded 3 years ago and has completed 4 client "
            "engagements to date, primarily for small and mid-sized businesses. One reference is "
            "available from a regional retail client."
        ),
    },
    "NexaWorks": {
        "submission_date": "2026-03-01",
        "experience_rating": 4.5,
        "executive_summary": (
            "NexaWorks proposes a balanced, low-risk implementation that pairs solid technical "
            "architecture with the strongest delivery methodology in this evaluation. Our focus is on "
            "predictable delivery, thorough staffing, and a support model built for long-term "
            "partnership."
        ),
        "proposed_solution": (
            "Our platform uses a modular monolith architecture with clearly separated service "
            "boundaries, which we believe offers the right balance of maintainability and scalability "
            "for this use case. We offer native integrations with two major ERPs and a well-documented "
            "webhook framework for others. The system scales horizontally behind a load balancer and "
            "has been proven at deployments of up to 15,000 users."
        ),
        "timeline_team": (
            "Our delivery plan spans 16 weeks across five clearly staffed milestones: Discovery (2 "
            "weeks), Design Sign-off (2 weeks), Build Sprint 1-3 (8 weeks), UAT (2 weeks), and Go-Live "
            "(2 weeks). The team includes a delivery lead, solutions architect, 3 engineers, a QA "
            "engineer, and a change-management specialist. A detailed RAID log and weekly steering "
            "committee cadence is included as standard, with named risk owners for every identified "
            "delivery risk."
        ),
        "pricing_assumptions": (
            "Total Cost of Ownership over 3 years: $780,000, comprising $210,000 implementation and "
            "$190,000 per year. Pricing assumes up to 300 named users and includes two ERP connectors "
            "and quarterly platform reviews. Assumptions are clearly itemized in the attached pricing "
            "appendix, including a defined change-request rate card."
        ),
        "security_compliance": (
            "NexaWorks holds ISO 27001 certification and is midway through SOC 2 Type II audit, with "
            "completion expected in two quarters. Data is encrypted at rest and in transit. SSO via "
            "SAML 2.0 is supported, along with role-based access control and audit logging retained for "
            "3 years. A data processing agreement covering GDPR is available."
        ),
        "support_references": (
            "NexaWorks provides a dedicated support pod with a documented escalation path and a 2-hour "
            "response SLA for critical issues, considered by our customers to be one of our strongest "
            "differentiators. We have delivered 9 similar procurement and vendor-management "
            "implementations over the past 4 years, with 3 customer references available covering "
            "healthcare, manufacturing, and public-sector clients."
        ),
    },
    "Orbit Digital": {
        "submission_date": "2026-03-03",
        "experience_rating": 4.2,
        "executive_summary": (
            "Orbit Digital brings deep domain experience in procurement transformation, having "
            "delivered similar programs for numerous enterprise clients. Our proposal emphasizes proven "
            "outcomes and a strong support model over architectural novelty."
        ),
        "proposed_solution": (
            "Our platform is built on a proven, configurable procurement suite used across our client "
            "base, with the evaluation workflow module tailored to this RFP's requirements. Integration "
            "with the customer's existing ERP landscape will be scoped during discovery; at a high "
            "level, we plan to connect via the ERP's standard API layer, though the specific integration "
            "pattern, data mapping, and real-time vs. batch approach will be finalized with the "
            "customer's IT team after contract signature."
        ),
        "timeline_team": (
            "Estimated delivery is 18-24 weeks, with exact phasing to be confirmed after discovery. The "
            "team will include a program manager and engineers drawn from our delivery bench, sized "
            "according to final scope. A standard risk log template will be used once the project "
            "kicks off."
        ),
        "pricing_assumptions": (
            "Estimated Total Cost of Ownership over 3 years: approximately $860,000, comprising roughly "
            "$230,000 implementation and $210,000 per year, pending final scoping. Pricing assumes a "
            "typical mid-size deployment; final numbers will be confirmed in a detailed statement of "
            "work."
        ),
        "security_compliance": (
            "Orbit Digital maintains enterprise-grade security practices in line with industry "
            "standards, and our clients include several regulated organizations. Data is encrypted in "
            "transit and at rest. Specific certification numbers and audit dates will be shared during "
            "contracting."
        ),
        "support_references": (
            "Orbit Digital has delivered 22 procurement and vendor-management platforms over the past 7 "
            "years, spanning finance, healthcare, and the public sector. We are proud to offer 5 "
            "references from long-standing clients, several of whom have been with us for over 5 years, "
            "reflecting our strong track record on relationship management and support."
        ),
    },
}

SECTION_TITLES = [
    ("Executive Summary", "executive_summary"),
    ("Proposed Solution", "proposed_solution"),
    ("Timeline & Team", "timeline_team"),
    ("Pricing & Assumptions", "pricing_assumptions"),
    ("Security & Compliance", "security_compliance"),
    ("Support & References", "support_references"),
]


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="RFPTitle",
            parent=styles["Title"],
            fontSize=20,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="RFPSection",
            parent=styles["Heading2"],
            spaceBefore=16,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="RFPBody",
            parent=styles["BodyText"],
            alignment=TA_JUSTIFY,
            leading=15,
        )
    )
    return styles


def generate_pdf(supplier_name: str, profile: dict, output_path: Path) -> Path:
    styles = _build_styles()
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        title=f"{supplier_name} - RFP Response",
    )

    flow = []
    flow.append(Paragraph(f"{supplier_name}", styles["RFPTitle"]))
    flow.append(Paragraph("RFP Response — Procurement Evaluation Platform", styles["Heading3"]))
    flow.append(Spacer(1, 10))

    meta_table = Table(
        [
            ["Submission Date", profile["submission_date"]],
            ["Historical Experience Rating", f'{profile["experience_rating"]} / 5.0'],
            ["Prepared for", "Procurement Evaluation Committee (synthetic classroom exercise)"],
        ],
        colWidths=[2.6 * inch, 3.6 * inch],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    flow.append(meta_table)
    flow.append(Spacer(1, 14))

    for title, key in SECTION_TITLES:
        flow.append(Paragraph(title, styles["RFPSection"]))
        flow.append(Paragraph(profile[key], styles["RFPBody"]))

    flow.append(Spacer(1, 16))
    flow.append(
        Paragraph(
            "<i>This document is a synthetic, fictional proposal generated for a classroom "
            "exercise. It does not represent a real company, offer, or price.</i>",
            styles["BodyText"],
        )
    )

    doc.build(flow)
    return output_path


def generate_all(output_dir: Path = OUTPUT_DIR) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for supplier_name, profile in SUPPLIERS.items():
        out_path = output_dir / f"{supplier_name.replace(' ', '_')}.pdf"
        generate_pdf(supplier_name, profile, out_path)
        paths.append(out_path)
    return paths


if __name__ == "__main__":
    generated = generate_all()
    print(f"Generated {len(generated)} synthetic supplier proposal PDFs in {OUTPUT_DIR}:")
    for p in generated:
        print(f"  - {p.name}")
