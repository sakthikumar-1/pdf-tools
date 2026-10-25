import os
from pathlib import Path
from io import BytesIO
import pymupdf as fitz
from PIL import Image, ImageDraw

FIXTURES_DIR = Path(__file__).resolve().parent / 'fixtures'
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

print(f"Generating test fixtures in: {FIXTURES_DIR}")

# 1. Valid one-page PDF with selectable text
doc1 = fitz.open()
page1 = doc1.new_page(width=612, height=792)
page1.insert_text((72, 72), "Simatrix PDF Tools - One Page Test Document", fontsize=16)
page1.insert_text((72, 110), "This is a clean, single-page test document with selectable text.", fontsize=11)
page1.insert_text((72, 130), "Paragraph 2: Fast, secure and accurate conversion testing.", fontsize=11)
doc1.save(str(FIXTURES_DIR / "sample_one_page.pdf"))
doc1.close()

# 2. Valid multi-page PDF (3 pages)
doc2 = fitz.open()
for i in range(1, 4):
    p = doc2.new_page(width=612, height=792)
    p.insert_text((72, 72), f"Simatrix Multi-Page Document - Page {i}", fontsize=16)
    p.insert_text((72, 110), f"Content on page {i} of 3 for multi-page extraction, split, and merge testing.", fontsize=11)
doc2.save(str(FIXTURES_DIR / "sample_multi_page.pdf"))
doc2.close()

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
doc3 = fitz.open()
p3 = doc3.new_page(width=612, height=792)
p3.insert_text((72, 72), "Document with Embedded Image", fontsize=16)
p3.insert_image(fitz.Rect(72, 120, 372, 320), filename=str(FIXTURES_DIR / "sample_image.jpg"))
doc3.save(str(FIXTURES_DIR / "sample_with_image.pdf"))
doc3.close()

# 5. PDF with structured tables
doc4 = fitz.open()
p4 = doc4.new_page(width=612, height=792)
p4.insert_text((72, 72), "Monthly Financial Report - Table Document", fontsize=16)
# Draw table headers
p4.insert_text((72, 120), "Department", fontsize=12)
p4.insert_text((220, 120), "Quarter 1", fontsize=12)
p4.insert_text((350, 120), "Quarter 2", fontsize=12)
p4.insert_text((470, 120), "Total Revenue", fontsize=12)
# Draw rows
rows = [
    ("Engineering", "$125,000", "$145,000", "$270,000"),
    ("Marketing", "$85,000", "$92,000", "$177,000"),
    ("Customer Support", "$45,000", "$48,000", "$93,000"),
    ("Sales Operations", "$210,000", "$235,000", "$445,000"),
]
y = 150
for row in rows:
    p4.insert_text((72, y), row[0], fontsize=10)
    p4.insert_text((220, y), row[1], fontsize=10)
    p4.insert_text((350, y), row[2], fontsize=10)
    p4.insert_text((470, y), row[3], fontsize=10)
    y += 25
doc4.save(str(FIXTURES_DIR / "sample_table.pdf"))
doc4.close()

# 6. Rotated-page PDF
doc5 = fitz.open()
p5 = doc5.new_page(width=612, height=792)
p5.insert_text((72, 72), "Rotated Page Document", fontsize=16)
p5.set_rotation(90)
doc5.save(str(FIXTURES_DIR / "sample_rotated.pdf"))
doc5.close()

# 7. Password-protected PDF (password: 'SimatrixPass123!')
doc6 = fitz.open()
p6 = doc6.new_page(width=612, height=792)
p6.insert_text((72, 72), "Top Secret Protected PDF Content", fontsize=16)
p6.insert_text((72, 110), "This content should only be accessible with password.", fontsize=11)
doc6.save(
    str(FIXTURES_DIR / "sample_protected.pdf"),
    encryption=fitz.PDF_ENCRYPT_AES_256,
    owner_pw="SimatrixOwner123!",
    user_pw="SimatrixPass123!"
)
doc6.close()

# 8. Damaged / Corrupt PDF
with open(FIXTURES_DIR / "damaged_corrupt.pdf", "wb") as f:
    f.write(b"%PDF-1.4\n%This is a completely broken and damaged file that should fail gracefully\x00\xff")

# 9. Filename with spaces and Unicode
doc7 = fitz.open()
p7 = doc7.new_page(width=612, height=792)
p7.insert_text((72, 72), "Unicode and Spaced Filename Test Document: 🚀 ñ", fontsize=16)
doc7.save(str(FIXTURES_DIR / "test doc 🚀 ñ.pdf"))
doc7.close()

print("All 9 test fixture categories created successfully.")
for p in sorted(FIXTURES_DIR.glob('*')):
    print(f" - {p.name} ({p.stat().st_size} bytes)")
