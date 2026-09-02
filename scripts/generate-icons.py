#!/usr/bin/env python3
"""Generate IPTV Client launcher / banner / favicon art.

Red rounded square, thick black frame, white I stem, and a uniform-width
white > with short horizontal terminals. White marks have no outline.
"""

from __future__ import annotations

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


def draw_mark(canvas: Image.Image, box: tuple[float, float, float, float], factor: int) -> None:
    """White I + short-bar > with curved joins. No dot under >.

    I stays taller than >; tops stay aligned. The I+> group is placed by
    its bounding box so left/right and top/bottom pads in the red field match.
    """
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    s = _scale(draw, factor)

    stroke = min(w, h) * 0.155
    half = stroke / 2
    pad_y = h * 0.09
    top = y0 + pad_y
    bot = y1 - pad_y
    overlap = stroke * 0.072

    y_upper = top + half
    bar_bot = bot - stroke + overlap
    y_lower = bar_bot - half
    stub = stroke * 0.7
    run = (y_lower - y_upper) / 2
    gap_i = stroke * 0.55

    content_w = stroke + gap_i + stub + run + half
    i_left = x0 + (w - content_w) / 2
    x_edge = i_left + stroke + gap_i
    p0 = (x_edge, y_upper)
    p1 = (x_edge + stub, y_upper)
    p2 = (x_edge + stub + run, (y_upper + y_lower) / 2)
    p3 = (x_edge + stub, y_lower)
    p4 = (x_edge, y_lower)

    s.rectangle((i_left, top, i_left + stroke, bot), fill=WHITE)
    pts = [
        (int(round(p[0] * factor)), int(round(p[1] * factor)))
        for p in (p0, p1, p2, p3, p4)
    ]
    width_px = max(5, int(round(stroke * factor)))
    draw.line(pts, fill=WHITE, width=width_px, joint="curve")

    ink = overlay.getbbox()
    if ink is None:
        return
    ix0, iy0, ix1, iy1 = ink
    box_cx = (x0 + x1) / 2 * factor
    box_cy = (y0 + y1) / 2 * factor
    ink_cx = (ix0 + ix1) / 2
    ink_cy = (iy0 + iy1) / 2
    dx = int(round(box_cx - ink_cx))
    dy = int(round(box_cy - ink_cy))
    if dx or dy:
        shifted = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        shifted.paste(overlay, (dx, dy), overlay)
        overlay = shifted
    canvas.alpha_composite(overlay)


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
    draw_mark(canvas, (inset, inset, size - inset, size - inset), factor)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def banner(width: int, height: int) -> Image.Image:
    factor = 4
    canvas = Image.new("RGBA", (width * factor, height * factor), BLACK)
    draw = ImageDraw.Draw(canvas)

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
    title_box = title_font.getbbox(title)
    live_box = live_font.getbbox("LIVE")
    title_h = title_box[3] - title_box[1]
    live_h = live_box[3] - live_box[1]
    gap = height * 0.055 * factor
    block = title_h + gap + live_h
    # Center the title + LIVE block with the icon; a hair below canvas
    # center matches the lockup (LIVE hangs under IPTV).
    ty = (height * factor - block) / 2 + height * 0.024 * factor
    draw.text((tx - title_box[0], ty - title_box[1]), title, font=title_font, fill=WHITE)
    draw.text(
        (tx - live_box[0], ty + title_h + gap - live_box[1]),
        "LIVE",
        font=live_font,
        fill=AMBER,
    )
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
    save(icon, dest / "icon_v14_512.png")
    save(launcher(192), dest / "icon_v14_192.png")
    save(banner(640, 360), dest / "tv_banner_v14.png")
    for name, bg in (("on_white", (245, 245, 245, 255)), ("on_black", (11, 11, 13, 255))):
        plate = Image.new("RGBA", (560, 560), bg)
        plate.alpha_composite(icon, (24, 24))
        save(plate, dest / f"icon_v14_{name}.png")


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = Path("/opt/cursor/artifacts")
        if not out.exists():
            out = ROOT / "preview-icons"
        write_preview(out)
    else:
        write_app_assets()
