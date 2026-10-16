"""
Generate Styled HTML and PDF for Component C Report
SE3090 — Software Engineering Frameworks (2026)
Author: Vijayakumar Vithusan (VTN02)
"""

import os
import re
import subprocess
import markdown

def generate():
    base_dir = "docs/member3"
    readme_path = os.path.join(base_dir, "README.md")
    html_path = os.path.join(base_dir, "Component_C_Report.html")
    pdf_path = os.path.join(base_dir, "Component_C_Clerk_Documentation_Management_Report.pdf")

    with open(readme_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Convert Markdown to HTML with tables, fenced code, and TOC extensions
    body_html = markdown.markdown(
        md_text,
        extensions=['tables', 'fenced_code', 'nl2br']
    )

    # Style HTML
    styled_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SE3090 Assignment 1 — Component C Technical Report</title>
<style>
    @page {{
        size: A4;
        margin: 20mm 18mm 20mm 18mm;
    }}
    body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        background: #ffffff;
        line-height: 1.6;
        font-size: 13.5px;
        max-width: 900px;
        margin: 0 auto;
        padding: 24px;
    }}
    h1 {{
        color: #1e3a8a;
        font-size: 22px;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 8px;
        margin-top: 32px;
        page-break-after: avoid;
    }}
    h2 {{
        color: #2563eb;
        font-size: 17px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 6px;
        margin-top: 28px;
        page-break-after: avoid;
        page-break-before: auto;
    }}
    h3 {{
        color: #334155;
        font-size: 14.5px;
        margin-top: 20px;
        page-break-after: avoid;
    }}
    h4 {{
        color: #475569;
        font-size: 13.5px;
        margin-top: 16px;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 12.5px;
        page-break-inside: avoid;
    }}
    th, td {{
        border: 1px solid #cbd5e1;
        padding: 8px 12px;
        text-align: left;
    }}
    th {{
        background: #1e3a8a;
        color: #ffffff;
        font-weight: 600;
    }}
    tr:nth-child(even) {{
        background: #f8fafc;
    }}
    pre {{
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-left: 4px solid #3b82f6;
        padding: 12px 16px;
        border-radius: 4px;
        overflow-x: auto;
        font-family: Consolas, "Courier New", monospace;
        font-size: 11.5px;
        line-height: 1.45;
        page-break-inside: avoid;
    }}
    code {{
        font-family: Consolas, "Courier New", monospace;
        background: #f1f5f9;
        color: #0f172a;
        padding: 2px 5px;
        border-radius: 3px;
        font-size: 12px;
    }}
    pre code {{
        background: transparent;
        padding: 0;
        border-radius: 0;
    }}
    blockquote {{
        border-left: 4px solid #2563eb;
        background: #eff6ff;
        margin: 16px 0;
        padding: 10px 16px;
        color: #1e3a8a;
        font-style: italic;
        border-radius: 0 4px 4px 0;
    }}
    img {{
        max-width: 100%;
        height: auto;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        display: block;
        margin: 16px auto 6px auto;
        page-break-inside: avoid;
    }}
    hr {{
        border: 0;
        height: 1px;
        background: #e2e8f0;
        margin: 24px 0;
    }}
    .footer-note {{
        margin-top: 40px;
        padding-top: 16px;
        border-top: 1px solid #cbd5e1;
        font-size: 11px;
        color: #64748b;
        text-align: center;
    }}
    @media print {{
        body {{
            max-width: 100%;
            padding: 0;
        }}
        h2 {{
            page-break-before: always;
        }}
        h2:first-of-type {{
            page-break-before: avoid;
        }}
    }}
</style>
</head>
<body>
{body_html}
<div class="footer-note">
    SE3090 — Software Engineering Frameworks (2026) | Assignment 1 Technical Report | Vijayakumar Vithusan (VTN02)
</div>
</body>
</html>
"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(styled_html)
    print(f"HTML report successfully generated: {html_path}")

    # Generate PDF using Microsoft Edge headless
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_exe = None
    for ep in edge_paths:
        if os.path.exists(ep):
            edge_exe = ep
            break

    if edge_exe:
        abs_html = os.path.abspath(html_path)
        abs_pdf = os.path.abspath(pdf_path)
        cmd = [
            edge_exe,
            "--headless",
            "--disable-gpu",
            f"--print-to-pdf={abs_pdf}",
            abs_html
        ]
        print("Exporting PDF via Edge headless...")
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(abs_pdf):
            print(f"PDF report successfully created: {abs_pdf} ({os.path.getsize(abs_pdf)} bytes)")
        else:
            print(f"Failed to create PDF. Stderr: {res.stderr}")

if __name__ == "__main__":
    generate()
