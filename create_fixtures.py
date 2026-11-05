import os
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from pypdf import PdfWriter, PdfReader

FIXTURES_DIR = Path(__file__).resolve().parent / 'fixtures'
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

print(f"Generating test fixtures in: {FIXTURES_DIR} using ReportLab, Pillow, and pypdf...")

# 1. Valid one-page PDF with selectable text
c1_buf = BytesIO()
c1 = canvas.Canvas(c1_buf, pagesize=letter, invariant=1)
c1.setFont("Helvetica-Bold", 16)
c1.drawString(72, 720, "Simatrix PDF Tools - One Page Test Document")
c1.setFont("Helvetica", 11)
c1.drawString(72, 690, "This is a clean, single-page test document with selectable text.")
c1.drawString(72, 670, "Paragraph 2: Fast, secure and accurate conversion testing.")
c1.showPage()
c1.save()
(FIXTURES_DIR / "sample_one_page.pdf").write_bytes(c1_buf.getvalue())

# 2. Valid multi-page PDF (3 pages)
c2_buf = BytesIO()
c2 = canvas.Canvas(c2_buf, pagesize=letter, invariant=1)
for i in range(1, 4):
    c2.setFont("Helvetica-Bold", 16)
    c2.drawString(72, 720, f"Simatrix Multi-Page Document - Page {i}")
    c2.setFont("Helvetica", 11)
    c2.drawString(72, 690, f"Content on page {i} of 3 for multi-page extraction, split, and merge testing.")
    c2.showPage()
c2.save()
(FIXTURES_DIR / "sample_multi_page.pdf").write_bytes(c2_buf.getvalue())

# 3. Valid JPG and PNG images
img = Image.new('RGB', (300, 200), color=(59, 130, 246))
draw = ImageDraw.Draw(img)
draw.rectangle([20, 20, 280, 180], outline=(255, 255, 255), width=3)
img.save(str(FIXTURES_DIR / "sample_image.jpg"), "JPEG")

img2 = Image.new('RGBA', (300, 200), color=(16, 185, 129, 255))
draw2 = ImageDraw.Draw(img2)
draw2.ellipse([50, 50, 250, 150], fill=(255, 255, 255, 200))
img2.save(str(FIXTURES_DIR / "sample_image.png"), "PNG")
img2.save(str(FIXTURES_DIR / "img1.png"), "PNG")
img.save(str(FIXTURES_DIR / "img2.jpg"), "JPEG")

# 4. PDF containing image
c3_buf = BytesIO()
c3 = canvas.Canvas(c3_buf, pagesize=letter, invariant=1)
c3.setFont("Helvetica-Bold", 16)
c3.drawString(72, 720, "Document with Embedded Image")
c3.drawImage(str(FIXTURES_DIR / "sample_image.jpg"), 72, 400, width=300, height=200)
c3.showPage()
c3.save()
(FIXTURES_DIR / "sample_with_image.pdf").write_bytes(c3_buf.getvalue())

# 5. Protected PDF (AES-256 encrypted with pypdf)
writer = PdfWriter()
reader = PdfReader(BytesIO(c1_buf.getvalue()))
for page in reader.pages:
    writer.add_page(page)
writer.encrypt(user_password="secretpassword", algorithm="AES-256")
with open(FIXTURES_DIR / "sample_protected.pdf", "wb") as f:
    writer.write(f)

# 6. Blank / Empty PDF
c_empty = canvas.Canvas(str(FIXTURES_DIR / "sample_empty.pdf"), pagesize=letter, invariant=1)
c_empty.showPage()
c_empty.save()

# 7. Scanned PDF (single full-page raster image, standard A4 dimensions)
a4_width, a4_height = 595.275590551181, 841.8897637795276
scanned_img = Image.new('RGB', (int(a4_width), int(a4_height)), color=(245, 245, 245))
s_draw = ImageDraw.Draw(scanned_img)
s_draw.rectangle([50, 50, int(a4_width) - 50, int(a4_height) - 50], outline=(100, 100, 100), width=2)
scanned_img_path = FIXTURES_DIR / "temp_scanned.jpg"
scanned_img.save(str(scanned_img_path), "JPEG")

c_scan = canvas.Canvas(str(FIXTURES_DIR / "sample_scanned.pdf"), pagesize=(a4_width, a4_height), invariant=1)
c_scan.drawImage(str(scanned_img_path), 0, 0, width=a4_width, height=a4_height)
c_scan.showPage()
c_scan.save()
if scanned_img_path.exists():
    scanned_img_path.unlink()

print("All fixtures successfully generated using ReportLab, Pillow, and pypdf.")
