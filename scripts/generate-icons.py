#!/usr/bin/env python3
"""Generate IPTV Client launcher / banner / favicon art.

Mark: white I (plain stem) + white > chevron (triangle, no left bar)
on a red rounded square over black.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android-tv/app/src/main/res"
RED = (220, 38, 38, 255)  # #DC2626
WHITE = (255, 255, 255, 255)
BLACK = (11, 11, 13, 255)
AMBER = (245, 158, 11, 255)
TITLE_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
LIVE_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

LAUNCHER = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
BANNERS = {
    "": (320, 180),
    "mdpi": (160, 90),
    "hdpi": (240, 135),
    "xhdpi": (320, 180),
    "xxhdpi": (480, 270),
    "xxxhdpi": (640, 360),
}


def _scale(draw: ImageDraw.ImageDraw, factor: int):
    """Wrap ImageDraw so callers can work in CSS-like logical pixels."""

    class Scaled:
        def rounded_rectangle(self, xy, radius, fill):
            x0, y0, x1, y1 = xy
            draw.rounded_rectangle(
                (x0 * factor, y0 * factor, x1 * factor, y1 * factor),
                radius=radius * factor,
                fill=fill,
            )

        def rectangle(self, xy, fill):
            x0, y0, x1, y1 = xy
            draw.rectangle(
                (x0 * factor, y0 * factor, x1 * factor, y1 * factor),
                fill=fill,
            )

        def polygon(self, pts, fill):
            draw.polygon([(x * factor, y * factor) for x, y in pts], fill=fill)

    return Scaled()


def draw_mark(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], factor: int) -> None:
    """Draw I + > inside box (logical pixels). I is a stem; > is an open chevron."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    s = _scale(draw, factor)

    # I: plain vertical bar, no serifs.
    bar_w = w * 0.10
    bar_h = h * 0.46
    i_cx = x0 + w * 0.32
    cy = (y0 + y1) / 2
    s.rectangle(
        (i_cx - bar_w / 2, cy - bar_h / 2, i_cx + bar_w / 2, cy + bar_h / 2),
        fill=WHITE,
    )

    # >: filled chevron — two diagonals meeting at a tip. Left side is a V, not a bar.
    left = x0 + w * 0.48
    tip = x0 + w * 0.82
    top, bot = cy - bar_h / 2, cy + bar_h / 2
    stroke = w * 0.13
    s.polygon(
        [
            (left, top),
            (left + stroke, top),
            (tip, cy),
            (left + stroke, bot),
            (left, bot),
            (tip - stroke * 1.55, cy),
        ],
        fill=WHITE,
    )


def launcher(size: int) -> Image.Image:
    factor = 8
    canvas = Image.new("RGBA", (size * factor, size * factor), BLACK)
    draw = ImageDraw.Draw(canvas)
    s = _scale(draw, factor)
    pad = size * 0.12
    radius = size * 0.18
    s.rounded_rectangle((pad, pad, size - pad, size - pad), radius=radius, fill=RED)
    inset = size * 0.22
    draw_mark(draw, (inset, inset, size - inset, size - inset), factor)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def banner(width: int, height: int) -> Image.Image:
    factor = 4
    canvas = Image.new("RGBA", (width * factor, height * factor), BLACK)
    draw = ImageDraw.Draw(canvas)
    s = _scale(draw, factor)

    mark = min(height * 0.50, width * 0.22)
    mx = width * 0.06
    my = (height - mark) / 2
    radius = mark * 0.18
    s.rounded_rectangle((mx, my, mx + mark, my + mark), radius=radius, fill=RED)
    inset = mark * 0.16
    draw_mark(draw, (mx + inset, my + inset, mx + mark - inset, my + mark - inset), factor)

    text_left = mx + mark + width * 0.045
    text_right = width * 0.94
    title_size = max(11, int(height * 0.168))
    title_font = ImageFont.truetype(TITLE_FONT, title_size * factor)
    title = "IPTV Client"
    # Shrink title until it fits the remaining banner width.
    while title_size > 9:
        bbox = title_font.getbbox(title)
        tw = (bbox[2] - bbox[0]) / factor
        if tw <= text_right - text_left:
            break
        title_size -= 1
        title_font = ImageFont.truetype(TITLE_FONT, title_size * factor)
    live_size = max(8, int(title_size * 0.55))
    live_font = ImageFont.truetype(LIVE_FONT, live_size * factor)
    tx = text_left * factor
    title_h = title_font.getbbox(title)[3] - title_font.getbbox(title)[1]
    live_h = live_font.getbbox("LIVE")[3] - live_font.getbbox("LIVE")[1]
    gap = height * 0.06 * factor
    block = title_h + gap + live_h
    ty = (height * factor - block) / 2
    draw.text((tx, ty), title, font=title_font, fill=WHITE)
    draw.text((tx, ty + title_h + gap), "LIVE", font=live_font, fill=AMBER)
    return canvas.resize((width, height), Image.Resampling.LANCZOS)


def save(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    print(f"wrote {path.relative_to(ROOT)} {img.size[0]}x{img.size[1]}")


def main() -> None:
    for density, size in LAUNCHER.items():
        icon = launcher(size)
        save(icon, RES / f"mipmap-{density}" / "ic_launcher.png")
        save(icon, RES / f"mipmap-{density}" / "ic_launcher_round.png")

    for density, (w, h) in BANNERS.items():
        folder = RES / ("drawable" if density == "" else f"drawable-{density}")
        save(banner(w, h), folder / "tv_banner.png")

    web = launcher(512)
    save(web, ROOT / "src/app/icon.png")
    save(launcher(32), ROOT / "public/favicon-32.png")
    launcher(256).save(
        ROOT / "src/app/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("wrote src/app/favicon.ico")


if __name__ == "__main__":
    main()
