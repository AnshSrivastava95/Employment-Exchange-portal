import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT

def create_resume():
    pdf_filename = "Ansh_Srivastava_Resume.pdf"
    
    # 0.5 inch margins (36 points) optimized for ATS single-page scanners
    doc = SimpleDocTemplate(
        pdf_filename, 
        pagesize=letter,
        leftMargin=36, 
        rightMargin=36, 
        topMargin=36, 
        bottomMargin=36
    )
    
    story = []
    
    # Palette definition
    PRIMARY_COLOR = colors.HexColor("#0F172A")    # Dark Slate
    ACCENT_COLOR = colors.HexColor("#059669")     # Emerald Accent
    TEXT_COLOR = colors.HexColor("#334155")       # Charcoal Body Text
    LINE_COLOR = colors.HexColor("#CBD5E1")       # Muted Divider Line
    
    base_styles = getSampleStyleSheet()
    
    name_style = ParagraphStyle(
        'HeaderName',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY_COLOR,
        textTransform='uppercase'
    )
    
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=ACCENT_COLOR
    )
    
    contact_style = ParagraphStyle(
        'HeaderContact',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_COLOR,
        alignment=TA_RIGHT
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=PRIMARY_COLOR,
        spaceBefore=8,
        spaceAfter=2,
        textTransform='uppercase'
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=PRIMARY_COLOR
    )
    
    body_text = ParagraphStyle(
        'BodyText',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_COLOR
    )
    
    right_text = ParagraphStyle(
        'RightText',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=TEXT_COLOR,
        alignment=TA_RIGHT
    )

    # -------------------------------------------------------------------------
    # HEADER SECTION
    # -------------------------------------------------------------------------
    left_header = [
        Paragraph("Ansh Srivastava", name_style),
        Spacer(1, 3),
        Paragraph("Software Engineer / Full-Stack Developer", title_style)
    ]
    
    right_header = [
        Paragraph("ansh.srivastava@example.com", contact_style),
        Paragraph("+91 98765 43210", contact_style),
        Paragraph("Varanasi, India", contact_style),
        Paragraph("github.com/ansh-srivastava", contact_style)
    ]
    
    header_table = Table([[left_header, right_header]], colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    def add_section_divider(title_text):
        t = Table([[Paragraph(title_text, section_heading)]], colWidths=[540])
        t.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 1, LINE_COLOR),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 4))

    # -------------------------------------------------------------------------
    # PROFESSIONAL EXPERIENCE
    # -------------------------------------------------------------------------
    add_section_divider("Professional Experience")
    
    exp_left = Paragraph("Volunteer Intern — <font color='#059669'>K.V. Jan Kalyan Trust</font>", body_bold)
    exp_right = Paragraph("June 12, 2025 – June 20, 2025", right_text)
    exp_table = Table([[exp_left, exp_right]], colWidths=[380, 160])
    exp_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(exp_table)
    story.append(Spacer(1, 2))
    
    exp_bullets = Paragraph(
        "• Assisted in managing digital data pipelines and structural organization of community records.<br/>"
        "• Streamlined internal database architectures to improve search layout efficiency and data retrieval.<br/>"
        "• Maintained local technical solutions for data management and regular reporting frameworks.",
        body_text
    )
    story.append(exp_bullets)
    story.append(Spacer(1, 6))

    # -------------------------------------------------------------------------
    # EDUCATION
    # -------------------------------------------------------------------------
    add_section_divider("Education")
    
    edu_left = Paragraph("B.Tech in Computer Science & Engineering — <font color='#334155'>Lovely Professional University</font>", body_bold)
    edu_right = Paragraph("July 2024 – Present", right_text)
    edu_table = Table([[edu_left, edu_right]], colWidths=[400, 140])
    edu_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(edu_table)
    story.append(Spacer(1, 2))
    story.append(Paragraph("Core foundational and advanced coursework in software development, engineering principles, and database management systems.", body_text))
    story.append(Spacer(1, 6))

    # -------------------------------------------------------------------------
    # TECHNICAL SKILLS
    # -------------------------------------------------------------------------
    add_section_divider("Technical Skills")
    
    skills_text = Paragraph(
        "<b>Languages & Frameworks:</b> React, Node.js, Python, Tailwind CSS, REST APIs<br/>"
        "<b>Developer Tools & Infrastructure:</b> Git, GitHub Copilot, Notion, Domain Hosting & Server Deployment<br/>"
        "<b>Core Systems:</b> NLP Systems, Database Query Optimization, Data Architecture, Structural Verification Matrix",
        body_text
    )
    story.append(skills_text)
    story.append(Spacer(1, 6))

    # -------------------------------------------------------------------------
    # COMPETITIONS & HIGHLIGHTS
    # -------------------------------------------------------------------------
    add_section_divider("Key Highlights & Technical Competitions")
    
    highlights_text = Paragraph(
        "• <b>AI for Bharat Hackathon (April 2026):</b> Collaborated on developing custom localized AI components and language processing configurations.<br/>"
        "• <b>Tech Blitz TechSprint (February 2025):</b> Participated in an intensive multi-day sprint engineering responsive feature iterations and application structures.<br/>"
        "• <b>Gen AI Exchange Hackathon by Google (October 2024):</b> Designed generative layout patterns and smart context flows within a competitive rapid-prototyping window.<br/>"
        "• <b>Leadership Edge Event, LPU (February 2025):</b> Selected to join a leadership development cohort focused on project management, technical scaling dynamics, and cross-functional project ownership.",
        body_text
    )
    story.append(highlights_text)

    # Compile PDF
    doc.build(story)
    print(f"Success! PDF compiled cleanly into '{pdf_filename}'.")

if __name__ == "__main__":
    create_resume()