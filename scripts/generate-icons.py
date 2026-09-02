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
    # 24px black ring on the 192 launcher; other densities scale with size.
    border = size * (30 / 192)
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

    mark = min(height * 0.72, width * 0.28)
    mx = width * 0.05
    my = (height - mark) / 2
    icon = launcher(max(64, int(mark * 4))).resize(
        (int(mark * factor), int(mark * factor)),
        Image.Resampling.LANCZOS,
    )
    canvas.alpha_composite(icon, (int(mx * factor), int(my * factor)))
    canvas = canvas.resize((width, height), Image.Resampling.LANCZOS)

    # Pin glyph ink to the 640x360 lockup; other densities scale with the canvas.
    title_size = max(11, int(height * 0.168))
    title_font = ImageFont.truetype(TITLE_FONT, title_size)
    live_size = max(8, int(title_size * 0.55))
    live_font = ImageFont.truetype(LIVE_FONT, live_size)
    sx = width / 640
    sy = height / 360
    _blit_text(canvas, "IPTV Client", title_font, WHITE, (240 * sx, 130 * sy))
    _blit_text(canvas, "LIVE", live_font, AMBER, (240 * sx, 195 * sy))
    return canvas


def _visible_origin(img: Image.Image, fill: tuple[int, int, int, int]) -> tuple[int, int] | None:
    """Top-left of visible ink after compositing onto black, matching banner measurements."""
    bg = Image.new("RGBA", img.size, (0, 0, 0, 255))
    bg.alpha_composite(img)
    px = bg.load()
    w, h = img.size
    minx, miny = w, h
    white = fill[1] > 200
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if white:
                ok = a > 180 and r > 230 and g > 230 and b > 230
            else:
                ok = a > 180 and r > 180 and 80 < g < 200 and b < 80
            if ok:
                minx = min(minx, x)
                miny = min(miny, y)
                found = True
    if not found:
        return None
    return minx, miny


def _blit_text(
    canvas: Image.Image,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    origin: tuple[float, float],
) -> None:
    """Paste `text` so visible ink top-left sits at `origin`."""
    bbox = font.getbbox(text)
    pad = 16
    layer = Image.new(
        "RGBA",
        (max(1, bbox[2] - bbox[0] + pad * 2), max(1, bbox[3] - bbox[1] + pad * 2)),
        (0, 0, 0, 0),
    )
    ImageDraw.Draw(layer).text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=fill)
    ink = layer.getbbox()
    if ink is None:
        return
    cropped = layer.crop(ink)
    vis = _visible_origin(cropped, fill)
    if vis is None:
        dest = (int(round(origin[0])), int(round(origin[1])))
    else:
        dest = (int(round(origin[0] - vis[0])), int(round(origin[1] - vis[1])))
    canvas.alpha_composite(cropped, dest=dest)


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
    save(icon, dest / "icon_border30_512.png")
    save(launcher(192), dest / "launcher_192_border30.png")
    save(banner(640, 360), dest / "tv_banner_border30.png")
    for name, bg in (("on_white", (245, 245, 245, 255)), ("on_black", (11, 11, 13, 255))):
        plate = Image.new("RGBA", (560, 560), bg)
        plate.alpha_composite(icon, (24, 24))
        save(plate, dest / f"icon_border30_{name}.png")


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = Path("/opt/cursor/artifacts")
        if not out.exists():
            out = ROOT / "preview-icons"
        write_preview(out)
    else:
        write_app_assets()
