#!/usr/bin/env python3
"""Generate IPTV Client launcher / banner / favicon art.

Red rounded square, thick black frame, white I stem, and a uniform-width
white > with short horizontal terminals. White marks have no outline.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android-tv/app/src/main/res"
RED = (255, 0, 0, 255)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
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
    class Scaled:
        def rounded_rectangle(self, xy, radius, fill, outline=None, width=0):
            x0, y0, x1, y1 = xy
            draw.rounded_rectangle(
                (x0 * factor, y0 * factor, x1 * factor, y1 * factor),
                radius=radius * factor,
                fill=fill,
                outline=outline,
                width=int(width * factor),
            )

        def rectangle(self, xy, fill):
            x0, y0, x1, y1 = xy
            draw.rectangle(
                (x0 * factor, y0 * factor, x1 * factor, y1 * factor),
                fill=fill,
            )

        def polygon(self, pts, fill):
            draw.polygon([(x * factor, y * factor) for x, y in pts], fill=fill)

        def ellipse(self, xy, fill):
            x0, y0, x1, y1 = xy
            draw.ellipse(
                (x0 * factor, y0 * factor, x1 * factor, y1 * factor),
                fill=fill,
            )

    return Scaled()


def _thick_line(p1: tuple[float, float], p2: tuple[float, float], width: float) -> list[tuple[float, float]]:
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length * width / 2, dx / length * width / 2
    return [
        (p1[0] + nx, p1[1] + ny),
        (p1[0] - nx, p1[1] - ny),
        (p2[0] - nx, p2[1] - ny),
        (p2[0] + nx, p2[1] + ny),
    ]


def _dot(s, c: tuple[float, float], diameter: float) -> None:
    r = diameter / 2
    s.ellipse((c[0] - r, c[1] - r, c[0] + r, c[1] + r), fill=WHITE)


def draw_mark(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], factor: int) -> None:
    """White I + short-bar > with curved joins.

    Gap between I and > is one stroke. > top/bottom match the I. No dot.
    """
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    s = _scale(draw, factor)

    stroke = min(w, h) * 0.155
    half = stroke / 2
    pad_y = h * 0.09
    top = y0 + pad_y
    bot = y1 - pad_y

    y_upper = top + half
    y_lower = bot - half
    stub = stroke * 0.7
    run = (y_lower - y_upper) / 2
    gap_i = stroke

    content_w = stroke + gap_i + stub + run + half
    left = x0 + (w - content_w) / 2
    i_left = left
    s.rectangle((i_left, top, i_left + stroke, bot), fill=WHITE)

    x_edge = i_left + stroke + gap_i
    p0 = (x_edge, y_upper)
    p1 = (x_edge + stub, y_upper)
    p2 = (x_edge + stub + run, (y_upper + y_lower) / 2)
    p3 = (x_edge + stub, y_lower)
    p4 = (x_edge, y_lower)
    pts = [(int(round(p[0] * factor)), int(round(p[1] * factor))) for p in (p0, p1, p2, p3, p4)]
    width_px = max(5, int(round(stroke * factor)))
    draw.line(pts, fill=WHITE, width=width_px, joint="curve")


def launcher(size: int) -> Image.Image:
    factor = 8
    canvas = Image.new("RGBA", (size * factor, size * factor), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    s = _scale(draw, factor)
    # Leave a hair of transparent padding so the black border stays visible.
    pad = size * 0.02
    radius = size * 0.22
    border = size * 0.09
    s.rounded_rectangle((pad, pad, size - pad, size - pad), radius=radius, fill=BLACK)
    inner = pad + border
    inner_radius = max(4.0, radius - border * 0.92)
    s.rounded_rectangle(
        (inner, inner, size - inner, size - inner),
        radius=inner_radius,
        fill=RED,
    )
    # Keep white marks inside the red field so they never pick up the black frame.
    inset = inner + size * 0.04
    draw_mark(draw, (inset, inset, size - inset, size - inset), factor)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def banner(width: int, height: int) -> Image.Image:
    factor = 4
    canvas = Image.new("RGBA", (width * factor, height * factor), BLACK)
    draw = ImageDraw.Draw(canvas)
    s = _scale(draw, factor)

    mark = min(height * 0.72, width * 0.28)
    mx = width * 0.05
    my = (height - mark) / 2
    icon = launcher(max(64, int(mark * 4))).resize(
        (int(mark * factor), int(mark * factor)),
        Image.Resampling.LANCZOS,
    )
    canvas.alpha_composite(icon, (int(mx * factor), int(my * factor)))

    text_left = mx + mark + width * 0.045
    text_right = width * 0.94
    title_size = max(11, int(height * 0.168))
    title_font = ImageFont.truetype(TITLE_FONT, title_size * factor)
    title = "IPTV Client"
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
    print(f"wrote {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path} {img.size[0]}x{img.size[1]}")


def write_app_assets() -> None:
    for density, size in LAUNCHER.items():
        icon = launcher(size)
        save(icon, RES / f"mipmap-{density}" / "ic_launcher.png")
        save(icon, RES / f"mipmap-{density}" / "ic_launcher_round.png")

    for density, (w, h) in BANNERS.items():
        folder = RES / ("drawable" if density == "" else f"drawable-{density}")
        save(banner(w, h), folder / "tv_banner.png")

    save(launcher(512), ROOT / "src/app/icon.png")
    save(launcher(32), ROOT / "public/favicon-32.png")
    launcher(256).save(
        ROOT / "src/app/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("wrote src/app/favicon.ico")


def write_preview(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    icon = launcher(512)
    save(icon, dest / "icon_preview_nodot_512.png")
    save(launcher(192), dest / "icon_preview_nodot_192.png")
    save(banner(640, 360), dest / "tv_banner_preview_nodot.png")
    for name, bg in (("on_white", (245, 245, 245, 255)), ("on_black", (11, 11, 13, 255))):
        plate = Image.new("RGBA", (560, 560), bg)
        plate.alpha_composite(icon, (24, 24))
        save(plate, dest / f"icon_preview_nodot_{name}.png")

    prev = dest / "icon_preview_fillet_on_white.png"
    if prev.exists():
        ref = Image.open(prev).convert("RGBA")
        compare = Image.new("RGBA", (560 + 40 + ref.width, 560), (245, 245, 245, 255))
        plate = Image.new("RGBA", (560, 560), (245, 245, 245, 255))
        plate.alpha_composite(icon, (24, 24))
        compare.alpha_composite(plate, (0, 0))
        compare.alpha_composite(ref, (560 + 40, 0))
        save(compare, dest / "icon_preview_nodot_vs_prev.png")


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = Path("/opt/cursor/artifacts")
        if not out.exists():
            out = ROOT / "preview-icons"
        write_preview(out)
    else:
        write_app_assets()
