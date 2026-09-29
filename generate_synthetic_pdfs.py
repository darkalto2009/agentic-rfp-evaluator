"""
Synthetic RFP Proposal PDF Generator
Generates 4 realistic supplier proposal PDFs for testing the Agentic RFP Evaluation System.
Includes:
- Apex Systems: Strong technical & security, higher price, moderate timeline.
- BrightPath Tech: Lowest price, fast timeline, weak compliance, limited experience.
- NexaWorks: Balanced proposal, strongest implementation & support.
- Orbit Digital: Strong experience & references, vague integration, medium price.
"""

import os
import sys

def create_pdf_minimal(filename: str, title: str, supplier_name: str, date: str, experience: float, content_sections: list):
    """
    Creates a standard, valid PDF 1.4 document containing formatted proposal text
    without needing external heavyweight binary dependencies.
    Also compatible with standard PDF readers (PyMuPDF, pypdf, Adobe, Chrome).
    """
    lines = []
    lines.append(f"%PDF-1.4")
    lines.append(f"%âãÏÓ")

    # We will build pages. Each page has text stream.
    pages = []
    
    # Page 1: Title, Executive Summary, Solution
    # Page 2: Timeline, Pricing
    # Page 3: Security, Support & References
    
    page1_text = [
        f"SUPPLIER RFP PROPOSAL: {title.upper()}",
        f"Supplier: {supplier_name} | Date: {date} | Experience Rating: {experience}/5.0",
        "--------------------------------------------------------------------------------",
        "",
        "SECTION 1: EXECUTIVE SUMMARY & UNDERSTANDING OF REQUIREMENT",
        content_sections[0],
        "",
        "SECTION 2: PROPOSED SOLUTION & TECHNICAL ARCHITECTURE",
        content_sections[1],
    ]
    
    page2_text = [
        f"SUPPLIER RFP PROPOSAL: {supplier_name} (Page 2)",
        "--------------------------------------------------------------------------------",
        "",
        "SECTION 3: TIMELINE, TEAM STRUCTURE, AND MILESTONES",
        content_sections[2],
        "",
        "SECTION 4: PRICING TABLE & COMMERCIAL ASSUMPTIONS",
        content_sections[3],
    ]
    
    page3_text = [
        f"SUPPLIER RFP PROPOSAL: {supplier_name} (Page 3)",
        "--------------------------------------------------------------------------------",
        "",
        "SECTION 5: SECURITY, COMPLIANCE, AND RISK CONTROLS",
        content_sections[4],
        "",
        "SECTION 6: SUPPORT MODEL, RELEVANT EXPERIENCE, & CLIENT REFERENCES",
        content_sections[5],
    ]
    
    pages = [page1_text, page2_text, page3_text]
    
    objects = []
    
    def add_object(obj_content):
        objects.append(obj_content)
        return len(objects) # 1-indexed

    # Object 1: Catalog
    # Object 2: Outlines
    # Object 3: Pages
    catalog_id = 1
    outlines_id = 2
    pages_id = 3
    
    # We will populate later
    page_obj_ids = []
    font_id = 4
    
    current_id = 5
    page_content_ids = []
    for p in pages:
        page_content_ids.append(current_id)
        current_id += 1
        page_obj_ids.append(current_id)
        current_id += 1
        
    # Build text streams
    def wrap_text(text, max_len=85):
        words = text.split()
        wrapped = []
        cur_line = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + 1 > max_len:
                wrapped.append(" ".join(cur_line))
                cur_line = [w]
                cur_len = len(w)
            else:
                cur_line.append(w)
                cur_len += len(w) + 1
        if cur_line:
            wrapped.append(" ".join(cur_line))
        return wrapped

    pdf_streams = []
    for p_lines in pages:
        stream_cmds = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL"]
        first = True
        for raw_line in p_lines:
            if raw_line.startswith("SUPPLIER RFP PROPOSAL"):
                stream_cmds.append("/F1 14 Tf")
                stream_cmds.append(f"({raw_line}) Tj")
                stream_cmds.append("T*")
                stream_cmds.append("/F1 10 Tf")
            elif raw_line.startswith("SECTION"):
                stream_cmds.append("T*")
                stream_cmds.append("/F1 11 Tf")
                stream_cmds.append(f"({raw_line}) Tj")
                stream_cmds.append("T*")
                stream_cmds.append("/F1 9 Tf")
            elif raw_line == "":
                stream_cmds.append("T*")
            else:
                # Wrap long paragraphs
                wrapped = wrap_text(raw_line)
                for wl in wrapped:
                    # Escape parentheses
                    safe_wl = wl.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
                    stream_cmds.append(f"({safe_wl}) Tj")
                    stream_cmds.append("T*")
        stream_cmds.append("ET")
        stream_data = "\n".join(stream_cmds).encode('latin-1')
        pdf_streams.append(stream_data)

    # Now write complete PDF objects
    obj_table = {}
    output = bytearray()
    output.extend(b"%PDF-1.4\n")
    
    def write_obj(oid, content_bytes):
        offset = len(output)
        obj_table[oid] = offset
        output.extend(f"{oid} 0 obj\n".encode('latin-1'))
        output.extend(content_bytes)
        output.extend(b"\nendobj\n")

    # Obj 1: Catalog
    write_obj(1, f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode('latin-1'))
    # Obj 2: Outlines
    write_obj(2, b"<< /Type /Outlines /Count 0 >>")
    # Obj 3: Pages
    kids_str = " ".join([f"{pid} 0 R" for pid in page_obj_ids])
    write_obj(3, f"<< /Type /Pages /Kids [{kids_str}] /Count {len(pages)} >>".encode('latin-1'))
    # Obj 4: Font
    write_obj(4, b"<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>")

    for i in range(len(pages)):
        cid = page_content_ids[i]
        pid = page_obj_ids[i]
        stream_bytes = pdf_streams[i]
        
        # Write stream object
        c_obj = f"<< /Length {len(stream_bytes)} >>\nstream\n".encode('latin-1') + stream_bytes + b"\nendstream"
        write_obj(cid, c_obj)
        
        # Write page object
        p_obj = f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] /Contents {cid} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> >>".encode('latin-1')
        write_obj(pid, p_obj)

    xref_offset = len(output)
    output.extend(b"xref\n")
    total_objs = current_id
    output.extend(f"0 {total_objs}\n".encode('latin-1'))
    output.extend(b"0000000000 65535 f \n")
    for oid in range(1, total_objs):
        offset = obj_table.get(oid, 0)
        output.extend(f"{offset:010d} 00000 n \n".encode('latin-1'))
        
    output.extend(b"trailer\n")
    output.extend(f"<< /Size {total_objs} /Root {catalog_id} 0 R >>\n".encode('latin-1'))
    output.extend(b"startxref\n")
    output.extend(f"{xref_offset}\n%%EOF".encode('latin-1'))

    os.makedirs(os.path.dirname(filename) or '.', exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(output)
    print(f"Generated synthetic proposal: {filename} ({len(output)} bytes)")


def generate_all_proposals(output_dir="input"):
    """
    Generates 4 synthetic proposals matching the requirements:
    1. Apex Systems
    2. BrightPath Tech
    3. NexaWorks
    4. Orbit Digital
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Apex Systems
    apex_sections = [
        # Executive Summary
        "Apex Systems presents an enterprise-grade cloud modernization proposal. We architect resilient zero-trust platforms for global procurement networks. Our solution prioritizes unmatched security hardening, horizontal auto-scaling, and microservices agility. We commit to 99.999% SLA availability and zero unscheduled downtime across multi-region hybrid clouds.",
        # Solution & Architecture
        "Technical Architecture: Distributed Kubernetes cluster with Istio service mesh, Kafka event streaming, and PostgreSQL distributed DB. Fully automated CI/CD pipelines with GitOps via ArgoCD. Seamless REST and GraphQL integrations with legacy ERP systems including SAP and Oracle. Scalability tested up to 250,000 concurrent transactions/sec.",
        # Timeline & Team
        "Delivery Schedule: 24 weeks total duration. Phase 1 (Weeks 1-6): Discovery & Cloud Infrastructure Provisioning. Phase 2 (Weeks 7-16): Core Microservices and Data Migration. Phase 3 (Weeks 17-22): User Acceptance Testing and Penetration Testing. Phase 4 (Weeks 23-24): Production Cutover. Team: 1 Senior Principal Architect, 4 Lead Engineers, 2 DevOps Specialists, 1 Dedicated Scrum Master.",
        # Pricing & Assumptions
        "Commercial Value: Total Project Fixed Fee is $480,000. Annual cloud infrastructure support fee is $72,000/year. Payment Milestones: 25% upon contract execution, 35% on UAT milestone, 40% on production sign-off. Assumptions: Client provides dedicated staging VPC and OAuth access within 5 business days of kickoff.",
        # Security & Compliance
        "Security & Compliance Controls: ISO 27001, SOC 2 Type II, and FedRAMP certified. AES-256 encryption at rest and TLS 1.3 in transit. Comprehensive automated SAST/DAST scanning, strict zero-trust identity federation, role-based access control (RBAC), and immutable audit logs retained for 7 years.",
        # Support & References
        "Support Model & References: 24/7/365 follow-the-sun technical support with 15-minute response SLA for Severity-1 incidents. Client Reference 1: FinTech Global (Enterprise ERP Migration, Contact: ctodesk@fintechglobal.com). Client Reference 2: HealthCorp Cloud Modernization."
    ]
    
    # 2. BrightPath Tech
    brightpath_sections = [
        # Executive Summary
        "BrightPath Tech offers an agile, rapid, and budget-optimized procurement transformation. Our lean methodology delivers core capabilities at the lowest overall cost in the market, completing the deployment in record time without administrative overhead.",
        # Solution & Architecture
        "Technical Architecture: Monolithic Node.js/Express API with SQLite/MySQL database and Redis caching layer. Hosted on lightweight Docker containers in a single cloud region. Basic REST endpoints for procurement intake. Scalability up to 10,000 transactions/sec.",
        # Timeline & Team
        "Delivery Schedule: Accelerated 10 weeks delivery. Phase 1 (Weeks 1-2): Setup & Mockups. Phase 2 (Weeks 3-7): Feature Sprint. Phase 3 (Weeks 8-10): Testing & Deployment. Staffing: 2 Full-Stack Developers and 1 Part-Time Project Manager.",
        # Pricing & Assumptions
        "Commercial Value: Total Project Cost is $145,000 (industry-lowest fixed price). Monthly maintenance is $3,500/month. Payment terms: 50% upfront, 50% upon deployment. Assumptions: No custom legacy ERP integrations required out-of-the-box.",
        # Security & Compliance
        "Security & Compliance Controls: Standard HTTPS/TLS encryption. Basic username and password authentication with bcrypt hashing. Basic firewall protection. Note: SOC 2 and ISO 27001 certifications are currently pending audit; compliance self-attestation provided.",
        # Support & References
        "Support Model & References: Standard business hours support (Monday-Friday 9 AM - 5 PM EST) via email ticket desk. Average response time: 8-12 hours. Experience: 3 years in commercial software development. References: Local Retail Logistics Corp, GreenLine Distributors."
    ]
    
    # 3. NexaWorks
    nexaworks_sections = [
        # Executive Summary
        "NexaWorks delivers a balanced, pragmatic, and highly structured procurement solution. We combine modern modular architecture with the market's most rigorous implementation methodology, change management program, and white-glove operational support.",
        # Solution & Architecture
        "Technical Architecture: Modular domain-driven design using Python FastAPI services, Next.js frontend, and PostgreSQL with Redis caching. Pre-built connectors for SAP, Workday, and Salesforce. Scalability benchmarks confirm stable response times under 100,000 concurrent users with 99.95% availability SLA.",
        # Timeline & Team
        "Delivery Schedule: Comprehensive 16 weeks timeline. Phase 1 (Weeks 1-4): Requirements & Architecture Blueprint. Phase 2 (Weeks 5-10): Core Integration & Workflows. Phase 3 (Weeks 11-14): Comprehensive End-to-End Testing & Staff Training. Phase 4 (Weeks 15-16): Phased Rollout & Hypercare. Team: PMP-certified Project Director, Enterprise Solutions Architect, 3 Senior Engineers, Dedicated Change Management Consultant.",
        # Pricing & Assumptions
        "Commercial Value: Total Investment is $295,000. Includes implementation, change management, and 6 months of premium hypercare. Annual license & maintenance: $45,000. Transparent milestone payments tied strictly to deliverable approvals.",
        # Security & Compliance
        "Security & Compliance Controls: SOC 2 Type II certified, GDPR and CCPA compliant. Role-based access control, SSO/SAML integration, vulnerability patch cycle within 48 hours, annual third-party penetration testing reports available under NDA.",
        # Support & References
        "Support Model & References: Dedicated Customer Success Manager with 24/7 P1 incident response (<30 mins) and quarterly executive business reviews. References: Global Retail Partners (Contact: ops@globalretail.com), Apex Logistics Group (ERP Automation, 2025)."
    ]
    
    # 4. Orbit Digital
    orbit_sections = [
        # Executive Summary
        "Orbit Digital is an established enterprise procurement veteran with over 15 years of industry excellence. We bring deep domain expertise, having successfully delivered over 50 large-scale public and private sector procurement transformations.",
        # Solution & Architecture
        "Technical Architecture: Cloud-hosted platform built on Spring Boot microservices with Oracle Cloud / AWS support. Note: Legacy core architecture with standard batch data sync; real-time webhooks available as roadmap items. Custom connectors built on request.",
        # Timeline & Team
        "Timeline & Team: 18 weeks delivery cycle. Phase 1 (Weeks 1-5): Design and Governance. Phase 2 (Weeks 6-13): System Configuration. Phase 3 (Weeks 14-18): Pilot and Transition. Team led by Senior Partner with 20+ years procurement experience and 4 implementation specialists.",
        # Pricing & Assumptions
        "Commercial Value: Total Project Cost is $340,000. Annual maintenance: $52,000. Payment schedule: 30% upfront, 30% midpoint, 40% final sign-off. Assumptions: Client provides clean data extracts and IT lead.",
        # Security & Compliance
        "Security & Compliance Controls: ISO 27001 certified, HIPAA compliant, SOC 1 Type II certified. Standard role-based permissions, automated daily backups, and disaster recovery RTO of 4 hours and RPO of 15 minutes.",
        # Support & References
        "Support Model & References: 24/5 global support with dedicated escalation matrix. Industry references: State Procurement Board (10-year client), Fortune 100 Manufacturing Corp (Enterprise Rollout, 2024), Metro Supply Alliance."
    ]
    
    proposals = [
        ("Apex_Systems_RFP_Proposal.pdf", "Apex Systems Procurement Platform Proposal", "Apex Systems", "2026-03-01", 4.8, apex_sections),
        ("BrightPath_Tech_RFP_Proposal.pdf", "BrightPath Tech Agile Proposal", "BrightPath Tech", "2026-03-02", 3.5, brightpath_sections),
        ("NexaWorks_RFP_Proposal.pdf", "NexaWorks Enterprise Modernization Proposal", "NexaWorks", "2026-03-01", 4.5, nexaworks_sections),
        ("Orbit_Digital_RFP_Proposal.pdf", "Orbit Digital Procurement Transformation Proposal", "Orbit Digital", "2026-03-03", 4.2, orbit_sections),
    ]
    
    generated_files = []
    for fname, title, supp, date, exp, secs in proposals:
        target_path = os.path.join(output_dir, fname)
        create_pdf_minimal(target_path, title, supp, date, exp, secs)
        generated_files.append(target_path)
        
    return generated_files

if __name__ == "__main__":
    generate_all_proposals()
