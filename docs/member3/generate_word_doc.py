"""
Generate Microsoft Word (.docx) Document for Component C Report
SE3090 — Software Engineering Frameworks (2026)
Author: Vijayakumar Vithusan (VTN02)

100% Strict Schema Compliant with Microsoft Word 2016 / 2019 / 2021 / Office 365
"""

import os
import re
from PIL import Image
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def clean_xml(text):
    if not text:
        return ""
    # Strip any control characters that break XML 1.0
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', str(text))

def set_cell_background(cell, fill_hex):
    # Safe cell shading in tcPr
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def add_header_footer(doc):
    for s in doc.sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
        # Header
        header = s.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("SE3090 Assignment 1 | Component C: Clerk & Documentation Management | LegalEase")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(100, 116, 139)
        
        # Footer
        footer = s.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        frun = fp.add_run("Vijayakumar Vithusan (VTN02) — BSc (Hons) Software Engineering")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(100, 116, 139)

def format_inlines(paragraph, text, default_color=None, default_size=Pt(10.0), is_italic=False):
    text = clean_xml(text)
    pattern = re.compile(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)')
    parts = pattern.split(text)
    
    for part in parts:
        if not part:
            continue
        if part.startswith('**') and part.endswith('**') and len(part) >= 4:
            run = paragraph.add_run(clean_xml(part[2:-2]))
            run.bold = True
            run.font.name = "Calibri"
            run.font.size = default_size
            if default_color:
                run.font.color.rgb = default_color
            if is_italic:
                run.italic = True
        elif part.startswith('*') and part.endswith('*') and len(part) >= 2:
            run = paragraph.add_run(clean_xml(part[1:-1]))
            run.italic = True
            run.font.name = "Calibri"
            run.font.size = default_size
            if default_color:
                run.font.color.rgb = default_color
        elif part.startswith('`') and part.endswith('`') and len(part) >= 2:
            run = paragraph.add_run(clean_xml(part[1:-1]))
            run.font.name = "Consolas"
            run.font.size = Pt(9.0)
            run.font.color.rgb = RGBColor(15, 23, 42)
        else:
            run = paragraph.add_run(clean_xml(part))
            run.font.name = "Calibri"
            run.font.size = default_size
            if default_color:
                run.font.color.rgb = default_color
            if is_italic:
                run.italic = True

def add_code_block(doc, code_text):
    code_text = clean_xml(code_text)
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Light Shading Accent 1' if 'Light Shading Accent 1' in [s.name for s in doc.styles] else 'Table Grid'
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, "F1F5F9")
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.05
    
    run = p.add_run(code_text.rstrip())
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(15, 23, 42)
    
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.space_after = Pt(4)

def add_callout(doc, quote_text):
    quote_text = clean_xml(quote_text)
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, "EFF6FF") # light blue
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    format_inlines(p, quote_text, default_color=RGBColor(30, 58, 138), default_size=Pt(9.5), is_italic=True)
    
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.space_after = Pt(4)

def parse_markdown_table(lines):
    rows = []
    for l in lines:
        l = l.strip()
        if not l.startswith('|'):
            continue
        cells = [c.strip() for c in l.strip('|').split('|')]
        if all(re.match(r'^:?-+:?$', c) for c in cells):
            continue
        rows.append(cells)
    return rows

def render_table(doc, table_data):
    if not table_data or len(table_data) < 1:
        return
    
    num_cols = max(len(r) for r in table_data)
    num_rows = len(table_data)
    
    table = doc.add_table(rows=num_rows, cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'
    
    for row_idx, row in enumerate(table_data):
        is_header = (row_idx == 0)
        while len(row) < num_cols:
            row.append("")
            
        for col_idx, text in enumerate(row):
            cell = table.cell(row_idx, col_idx)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.1
            
            if is_header:
                set_cell_background(cell, "1E3A8A") # Navy
                format_inlines(p, f"**{text}**", default_color=RGBColor(255, 255, 255), default_size=Pt(9.0))
            else:
                bg = "FFFFFF" if row_idx % 2 == 1 else "F8FAFC"
                set_cell_background(cell, bg)
                format_inlines(p, text, default_color=RGBColor(30, 41, 59), default_size=Pt(8.5))
                
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.space_after = Pt(4)

def build_word_document():
    base_dir = "docs/member3"
    readme_path = os.path.join(base_dir, "README.md")
    output_docx = os.path.join(base_dir, "Component_C_Clerk_Documentation_Management_Report.docx")
    
    with open(readme_path, "r", encoding="utf-8") as f:
        md_text = f.read()
        
    doc = Document()
    add_header_footer(doc)
    
    lines = md_text.split("\n")
    i = 0
    total_lines = len(lines)
    
    in_code_block = False
    code_block_text = ""
    
    in_table = False
    table_lines = []
    
    while i < total_lines:
        line = lines[i]
        stripped = line.strip()
        
        # Code block handling
        if stripped.startswith("```"):
            if in_code_block:
                add_code_block(doc, code_block_text)
                in_code_block = False
                code_block_text = ""
            else:
                in_code_block = True
                code_block_text = ""
            i += 1
            continue
            
        if in_code_block:
            code_block_text += line + "\n"
            i += 1
            continue
            
        # Table handling
        if stripped.startswith("|") and stripped.endswith("|"):
            if not in_table:
                in_table = True
                table_lines = [stripped]
            else:
                table_lines.append(stripped)
            i += 1
            continue
        else:
            if in_table:
                tbl_data = parse_markdown_table(table_lines)
                render_table(doc, tbl_data)
                in_table = False
                table_lines = []
                
        # Empty line
        if not stripped:
            i += 1
            continue
            
        # Horizontal rule
        if stripped in ["---", "***", "___"]:
            i += 1
            continue
            
        # Image handling ![alt](path)
        img_match = re.match(r'^!\[(.*?)\]\((.*?)\)$', stripped)
        if img_match:
            caption = img_match.group(1)
            img_rel_path = img_match.group(2)
            img_full_path = os.path.normpath(os.path.join(base_dir, img_rel_path))
            
            if os.path.exists(img_full_path):
                try:
                    with Image.open(img_full_path) as im:
                        width, height = im.size
                        is_vertical = height > width
                        
                    ip = doc.add_paragraph()
                    ip.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    ip.paragraph_format.space_before = Pt(8)
                    ip.paragraph_format.space_after = Pt(2)
                    irun = ip.add_run()
                    
                    if is_vertical:
                        irun.add_picture(img_full_path, width=Inches(2.8))
                    else:
                        irun.add_picture(img_full_path, width=Inches(6.0))
                        
                    # Caption
                    if caption:
                        cp = doc.add_paragraph()
                        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        cp.paragraph_format.space_before = Pt(2)
                        cp.paragraph_format.space_after = Pt(8)
                        crun = cp.add_run(clean_xml(f"Figure: {caption}"))
                        crun.font.name = "Calibri"
                        crun.font.size = Pt(9.0)
                        crun.font.italic = True
                        crun.font.color.rgb = RGBColor(100, 116, 139)
                except Exception as ex:
                    print(f"Error adding image {img_full_path}: {ex}")
            else:
                print(f"Warning: Image file not found: {img_full_path}")
            i += 1
            continue
            
        # Blockquote > text
        if stripped.startswith(">"):
            quote_text = stripped.lstrip(">").strip()
            add_callout(doc, quote_text)
            i += 1
            continue
            
        # Headers
        if stripped.startswith("# "):
            title_text = clean_xml(stripped[2:].strip())
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(title_text)
            run.bold = True
            run.font.name = "Calibri"
            run.font.size = Pt(18)
            run.font.color.rgb = RGBColor(30, 58, 138) # Deep navy #1E3A8A
            i += 1
            continue
            
        if stripped.startswith("## "):
            h2_text = clean_xml(stripped[3:].strip())
            if re.match(r'^(##\s*[1-9]|##\s*10|##\s*11)', stripped):
                doc.add_page_break()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(h2_text)
            run.bold = True
            run.font.name = "Calibri"
            run.font.size = Pt(13.5)
            run.font.color.rgb = RGBColor(37, 99, 235) # Royal blue #2563EB
            i += 1
            continue
            
        if stripped.startswith("### "):
            h3_text = clean_xml(stripped[4:].strip())
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(9)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(h3_text)
            run.bold = True
            run.font.name = "Calibri"
            run.font.size = Pt(11.0)
            run.font.color.rgb = RGBColor(30, 41, 59) # Dark slate #1E293B
            i += 1
            continue
            
        if stripped.startswith("#### "):
            h4_text = clean_xml(stripped[5:].strip())
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(h4_text)
            run.bold = True
            run.font.name = "Calibri"
            run.font.size = Pt(10.0)
            run.font.color.rgb = RGBColor(71, 85, 105)
            i += 1
            continue
            
        # Bullet list item
        if stripped.startswith("- ") or stripped.startswith("* "):
            item_text = stripped[2:].strip()
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            format_inlines(p, item_text, default_color=RGBColor(30, 41, 59), default_size=Pt(9.5))
            i += 1
            continue
            
        # Numbered list item
        num_match = re.match(r'^(\d+)\.\s+(.*)$', stripped)
        if num_match:
            item_text = num_match.group(2)
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            format_inlines(p, item_text, default_color=RGBColor(30, 41, 59), default_size=Pt(9.5))
            i += 1
            continue
            
        # Regular paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        format_inlines(p, stripped, default_color=RGBColor(30, 41, 59), default_size=Pt(9.5))
        i += 1

    if in_table:
        tbl_data = parse_markdown_table(table_lines)
        render_table(doc, tbl_data)

    doc.save(output_docx)
    print(f"Word document successfully created: {output_docx}")

if __name__ == "__main__":
    build_word_document()
