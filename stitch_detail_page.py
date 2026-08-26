from PIL import Image
from pathlib import Path

folder = Path(__file__).resolve().parent / "달빛하얀소복_상세페이지"
pages = [Image.open(p).convert("RGB") for p in sorted(folder.glob("[0-9][0-9]_*.png")) if not p.name.startswith("00_")]

width = 860
height = sum(page.height for page in pages)
long_page = Image.new("RGB", (width, height), "#F8F5EF")

y = 0
for page in pages:
    long_page.paste(page, (0, y))
    y += page.height

long_page.save(folder / "달빛하얀소복_쇼핑몰상세페이지_860x11000.png", optimize=True)
long_page.save(folder / "달빛하얀소복_쇼핑몰상세페이지_860x11000.webp", "WEBP", quality=88, method=6)

print(f"size={long_page.size}, pages={len(pages)}")
