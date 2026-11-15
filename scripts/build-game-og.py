"""Build the 1200x630 Open Graph share images for every JoyFlock game.

Reads dist/assets/og/manifest.json, which scripts/build-game-seo.mjs derives
from the single SEO contract (dist/seo-games.js). Run the .mjs generator first:

    node scripts/build-game-seo.mjs
    python scripts/build-game-og.py

Each image uses the game's existing cover art, a dark left-to-right scrim for
text contrast, and the Chinese / English game names. Tic-tac-toe has only an
SVG cover, so its background is drawn procedurally instead of rasterised.
"""
import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUT = DIST / "assets" / "og"
W, H = 1200, 630
BG = (11, 16, 32)
GOLD = (231, 200, 132)
WHITE = (240, 245, 255)
MUTED = (180, 198, 230)

FONTS = Path("C:/Windows/Fonts")
CN_BOLD = str(FONTS / "msyhbd.ttc")
CN = str(FONTS / "msyh.ttc")
EN_BOLD = str(FONTS / "segoeuib.ttf")
EN = str(FONTS / "segoeui.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


def cover_crop(im):
    """Resize to fully cover 1200x630, then centre-crop."""
    src_w, src_h = im.size
    scale = max(W / src_w, H / src_h)
    nw, nh = int(src_w * scale + 0.5), int(src_h * scale + 0.5)
    im = im.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - W) // 2, (nh - H) // 2
    return im.crop((left, top, left + W, top + H))


def tictactoe_background():
    """A vector-free stand-in for the SVG-only tic-tac-toe cover."""
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # Soft blue glow behind the board.
    for r in range(260, 0, -4):
        a = int(20 * (1 - r / 260))
        d.ellipse((830 - r, 315 - r, 830 + r, 315 + r), fill=(20 + a, 34 + a, 76 + a))
    cell = 118
    x0, y0 = 720, 196
    grid = (110, 150, 230)
    for i in (1, 2):
        d.line((x0 + i * cell, y0, x0 + i * cell, y0 + 3 * cell), fill=grid, width=7)
        d.line((x0, y0 + i * cell, x0 + 3 * cell, y0 + i * cell), fill=grid, width=7)
    # A few X / O marks with a rounded, neon-ish finish.
    for cx, cy, kind in [(0, 0, "x"), (1, 1, "o"), (2, 0, "o"), (0, 2, "x")]:
        px, py = x0 + cx * cell + cell / 2, y0 + cy * cell + cell / 2
        rad = 35
        if kind == "x":
            d.line((px - rad, py - rad, px + rad, py + rad), fill=(231, 200, 132), width=10)
            d.line((px + rad, py - rad, px - rad, py + rad), fill=(231, 200, 132), width=10)
        else:
            d.ellipse((px - rad, py - rad, px + rad, py + rad), outline=(127, 165, 255), width=10)
    return im.convert("RGBA")


def background(entry):
    rel = entry["cover"].lstrip("/")
    if rel.endswith(".svg"):
        return tictactoe_background()
    src = Image.open(DIST / rel).convert("RGBA")
    if src.getextrema()[3][0] < 255:  # transparent cover (the golden plane)
        base = Image.new("RGBA", src.size, BG + (255,))
        src = Image.alpha_composite(base, src)
    return cover_crop(src).convert("RGBA")


def scrim(im):
    """Darken the left half so white/gold text stays readable on any cover."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(W):
        # 205 -> 0 alpha across the first 78% of the image.
        a = int(205 * max(0.0, 1 - x / (W * 0.78)) ** 1.25)
        d.line((x, 0, x, H), fill=(7, 12, 27, a))
    for y in range(H - 170, H):
        a = int(110 * (y - (H - 170)) / 170)
        d.line((0, y, W, y), fill=(7, 12, 27, a))
    return Image.alpha_composite(im, layer).convert("RGB")


def text(d, xy, value, f, fill, stroke=(4, 8, 20)):
    d.text(xy, value, font=f, fill=fill, stroke_width=2, stroke_fill=stroke)


def build(entry):
    im = scrim(background(entry))
    d = ImageDraw.Draw(im)
    # Brand row.
    d.rounded_rectangle((72, 68, 88, 84), radius=4, fill=GOLD)
    text(d, (102, 62), "JoyFlock", font(EN_BOLD, 30), GOLD)
    # Game names.
    text(d, (70, 218), entry["name"]["zh"], font(CN_BOLD, 76), WHITE)
    text(d, (72, 322), entry["name"]["en"], font(EN_BOLD, 38), GOLD)
    # A thin accent rule and one bilingual line.
    d.rounded_rectangle((72, 398, 152, 403), radius=2, fill=GOLD)
    text(d, (72, 430), "免费在线玩  ·  Free to play, no download", font(CN, 24), MUTED)
    # Player count badge.
    badge = entry["players"]["zh"]
    bf = font(CN, 22)
    box = d.textbbox((0, 0), badge, font=bf)
    bw = box[2] - box[0] + 36
    d.rounded_rectangle((72, 500, 72 + bw, 548), radius=24, outline=(231, 200, 132, 160), width=2)
    text(d, (90, 508), badge, bf, WHITE)
    target = OUT / (entry["slug"] + ".png")
    im.save(target, "PNG", optimize=True)
    return target, im.size, target.stat().st_size


def build_site(manifest):
    """One default share image for the lobby / home / table shells."""
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # A faint blue halo behind the 3x3 cover collage on the right.
    for r in range(330, 0, -6):
        a = int(14 * (1 - r / 330))
        d.ellipse((900 - r, 315 - r, 900 + r, 315 + r), fill=(16 + a, 27 + a, 58 + a))
    tile, gap, x0, y0 = 150, 14, 675, 88
    for i, entry in enumerate(manifest[:9]):
        cx, cy = i % 3, i // 3
        thumb = background(entry).convert("RGB").resize((tile, tile), Image.LANCZOS)
        thumb = thumb.crop((0, 0, tile, tile))
        # Rounded corners via an alpha mask.
        mask = Image.new("L", (tile, tile), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, tile - 1, tile - 1), radius=18, fill=255)
        im.paste(thumb, (x0 + cx * (tile + gap), y0 + cy * (tile + gap)), mask)
    d.rounded_rectangle((72, 68, 88, 84), radius=4, fill=GOLD)
    text(d, (102, 62), "JoyFlock", font(EN_BOLD, 30), GOLD)
    text(d, (70, 200), "九款游戏", font(CN_BOLD, 80), WHITE)
    text(d, (72, 302), "打开就能玩", font(CN_BOLD, 58), GOLD)
    d.rounded_rectangle((72, 400, 152, 405), radius=2, fill=GOLD)
    text(d, (72, 430), "Nine games, just open one", font(EN_BOLD, 28), WHITE)
    text(d, (72, 480), "免费在线玩  ·  Free to play, no download", font(CN, 23), MUTED)
    target = OUT / "joyflock.png"
    im.save(target, "PNG", optimize=True)
    return target, im.size, target.stat().st_size


def main():
    manifest = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for entry in manifest:
        path, size, nbytes = build(entry)
        total += nbytes
        print(f"  {path.relative_to(DIST)}  {size[0]}x{size[1]}  {nbytes // 1024} KB")
    path, size, nbytes = build_site(manifest)
    total += nbytes
    print(f"  {path.relative_to(DIST)}  {size[0]}x{size[1]}  {nbytes // 1024} KB  (site default)")
    print(f"built {len(manifest)} OG images plus the site default ({total // 1024} KB total)")


if __name__ == "__main__":
    main()
