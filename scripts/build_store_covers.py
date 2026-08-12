"""Build exact-size CrazyGames cover images from the ImageGen masters.

The generated illustrations stay outside the runtime asset graph. This script
only normalizes their dimensions and adds the game's title with deterministic,
crisp typography.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "docs" / "store"
FONT = Path("C:/Windows/Fonts/trebucbd.ttf")


def cover_image(source: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(source).convert("RGB")
    source_ratio = image.width / image.height
    target_ratio = size[0] / size[1]
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        image = image.crop((left, 0, left + width, image.height))
    elif source_ratio < target_ratio:
        height = round(image.width / target_ratio)
        # Bias portrait/landscape crops toward the top so the title area remains.
        top = max(0, round((image.height - height) * 0.34))
        image = image.crop((0, top, image.width, top + height))
    return image.resize(size, Image.Resampling.LANCZOS)


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start: int) -> ImageFont.FreeTypeFont:
    size = start
    while size > 24:
        font = ImageFont.truetype(str(FONT), size)
        if draw.textbbox((0, 0), text, font=font, stroke_width=max(2, size // 24))[2] <= max_width:
            return font
        size -= 2
    return ImageFont.truetype(str(FONT), size)


def add_title(image: Image.Image, mode: str) -> None:
    draw = ImageDraw.Draw(image)
    if mode == "landscape":
        lines = [("POCKET PIER", 0.50, 0.055, 118)]
    elif mode == "portrait":
        lines = [("POCKET", 0.56, 0.035, 116), ("PIER", 0.62, 0.118, 142)]
    else:
        lines = [("POCKET", 0.58, 0.035, 92), ("PIER", 0.62, 0.125, 112)]

    for index, (text, x_ratio, y_ratio, start_size) in enumerate(lines):
        font = fit_font(draw, text, round(image.width * 0.75), start_size)
        stroke = max(3, font.size // 18)
        bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke)
        x = round(image.width * x_ratio - (bbox[2] - bbox[0]) / 2)
        y = round(image.height * y_ratio)
        shadow = max(3, font.size // 18)
        fill = "#FFF0C4" if index == 0 else "#FF7849"
        draw.text(
            (x + shadow, y + shadow),
            text,
            font=font,
            fill="#163B4A",
            stroke_width=stroke,
            stroke_fill="#163B4A",
        )
        draw.text(
            (x, y),
            text,
            font=font,
            fill=fill,
            stroke_width=stroke,
            stroke_fill="#1A5566",
        )


def build(source_name: str, output_name: str, size: tuple[int, int], mode: str) -> None:
    image = cover_image(STORE / "masters" / source_name, size)
    add_title(image, mode)
    image.save(STORE / output_name, format="JPEG", quality=92, optimize=True, progressive=True)


def main() -> None:
    STORE.mkdir(parents=True, exist_ok=True)
    build("pocket-pier-cover-landscape-master.webp", "pocket-pier-cover-1920x1080.jpg", (1920, 1080), "landscape")
    build("pocket-pier-cover-portrait-master.webp", "pocket-pier-cover-800x1200.jpg", (800, 1200), "portrait")
    build("pocket-pier-cover-square-master.webp", "pocket-pier-cover-800x800.jpg", (800, 800), "square")


if __name__ == "__main__":
    main()
