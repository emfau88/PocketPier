"""Build optimized WebP files from the generated Pocket Pier PNG masters.

Requires Pillow. The generated files are committed so production builds do not
need Python or Pillow; this script only makes the conversion reproducible.
"""

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "assets" / "generated"
TARGET = ROOT / "src" / "assets" / "runtime"

# Exact output sizes are used only when the current source is substantially
# larger than the biggest in-game presentation at the 2x desktop render tier.
# Full-screen art, texture sheets with coordinate-based frames, and the map are
# kept at their authored dimensions.
ASSETS: dict[str, tuple[int, int] | None] = {
    "menu_ocean_morning_base.png": (1920, 1080),
    "menu_water_shimmer.png": (1920, 1080),
    "menu_gull_up.png": (256, 256),
    "menu_gull_glide.png": (256, 256),
    "menu_gull_down.png": (256, 256),
    "bobber_basic.png": (128, 128),
    "bg_sunny_pier_remaster.png": None,
    "bg_rocky_cove_surface.png": None,
    "fg_rocky_cove_surface.png": None,
    "surface_clouds.png": None,
    "character_angler_chair_perspective.png": (768, 512),
    "hub_cooler.png": (328, 236),
    "hub_tacklebox_closed.png": (328, 236),
    "hub_tacklebox_open.png": (640, 486),
    "ui_upgrade_icons.png": (544, 544),
    "ui_equipment_progression.png": (1024, 1024),
    "ui_fishbook_open.png": (1200, 800),
    "ui_badge_collection.png": (1024, 1024),
    "ui_menu_decorations.png": (768, 768),
    "ui_boat_repair_steps.png": (1200, 400),
    "hub_jobs_notice.png": (320, 400),
    "ui_harbor_notes.png": (512, 512),
    "hub_boat_side_states.png": None,
    "hook_basic.png": (192, 192),
    "fx_water_splash.png": (192, 192),
    "fx_perfect_hook.png": (256, 256),
    "ui_fishing_spots_map.png": None,
    "ui_spot_sunny.png": (256, 256),
    "ui_spot_rocky.png": (256, 256),
    "ui_spot_moonlit.png": (256, 256),
    "bg_underwater_sunny_pier.png": None,
    "fg_underwater_sunny.png": None,
    "fish_minnow_hero.png": (384, 256),
    "fish_sardine_hero.png": (384, 256),
    "fish_stripe_perch.png": (384, 256),
    "fish_bluegill.png": (384, 256),
    "fish_copper_carp.png": (384, 256),
    "fish_glass_trout.png": (384, 256),
    "secret_bottle.png": (256, 256),
    "secret_pearl.png": (256, 256),
    "secret_compass.png": (256, 256),
    "bg_underwater_rocky_cove.png": None,
    "fg_underwater_rocky.png": None,
    "fish_kelp_wrasse.png": (384, 256),
    "fish_tide_mackerel.png": (384, 256),
    "fish_ember_rockfish.png": (384, 256),
    "fish_pebble_goby.png": (384, 256),
    "fish_storm_snapper.png": (384, 256),
    "treasure_barnacle_bell.png": (256, 256),
    "treasure_lost_spyglass.png": (256, 256),
    "treasure_sea_glass_charm.png": (256, 256),
    "bg_underwater_moonlit_trench.png": None,
    "fg_underwater_moonlit.png": None,
    "fish_lantern_fin.png": (384, 256),
    "fish_midnight_eel.png": (384, 256),
    "fish_royal_starfin.png": (384, 256),
    "fish_velvet_lantern.png": (384, 256),
    "fish_crescent_ray.png": (384, 256),
    "treasure_glow_crystal.png": (256, 256),
    "treasure_captain_locket.png": (256, 256),
    "treasure_ancient_idol.png": (256, 256),
}

# Full-screen scenes and the two largest decorative menu surfaces receive a
# separate 4K runtime derivative. Desktop selects these files, while touch
# devices keep using the compact variants above. The authored masters are
# intentionally painterly; high-quality resampling plus a restrained unsharp
# mask prevents browser/GPU scaling from making their paper texture hazy.
HIGH_RES_ASSETS: dict[str, tuple[int, int]] = {
    "menu_ocean_morning_base.png": (3840, 2160),
    "menu_water_shimmer.png": (3840, 2160),
    "bg_sunny_pier_remaster.png": (3840, 2160),
    "bg_rocky_cove_surface.png": (3840, 2160),
    "fg_rocky_cove_surface.png": (3840, 2160),
    "ui_fishbook_open.png": (2400, 1600),
    "ui_fishing_spots_map.png": (3280, 2188),
    "bg_underwater_sunny_pier.png": (3840, 2160),
    "fg_underwater_sunny.png": (3840, 2160),
    "bg_underwater_rocky_cove.png": (3840, 2160),
    "fg_underwater_rocky.png": (3840, 2160),
    "bg_underwater_moonlit_trench.png": (3840, 2160),
    "fg_underwater_moonlit.png": (3840, 2160),
}


def build_rocky_surface_foreground() -> None:
    """Derive a pixel-identical occlusion layer for Rocky Cove.

    The generated scene keeps the pier geometry of Sunny Pier, but its tall
    left cliff now crosses the animated cloud lane. Copying the matching
    pixels from the same master avoids seams and keeps clouds behind both the
    cliff and lantern structure without baking them into the background.
    """
    source_path = SOURCE / "bg_rocky_cove_surface.png"
    target_path = SOURCE / "fg_rocky_cove_surface.png"
    with Image.open(source_path) as source:
        source = source.convert("RGBA")
        width, height = source.size
        mask = Image.new("L", source.size, 0)
        from PIL import ImageDraw

        pixels = source.load()
        draw = ImageDraw.Draw(mask)

        def is_sky(pixel: tuple[int, int, int, int]) -> bool:
            red, green, blue, _ = pixel
            return green > 155 and blue > 150 and abs(green - blue) < 35 and green - red > 25

        scan_bottom = round(height * 0.57)
        elevated_limit = round(height * 0.34)
        run = max(5, round(height / 150))
        for x in range(width):
            skyline = None
            for y in range(scan_bottom - run):
                if all(not is_sky(pixels[x, y + offset]) for offset in range(run)):
                    skyline = y
                    break
            if skyline is not None and skyline < elevated_limit:
                draw.line((x, skyline, x, scan_bottom), fill=255)
        foreground = Image.new("RGBA", source.size, (0, 0, 0, 0))
        foreground.paste(source, (0, 0), mask)
        foreground.save(target_path, "PNG", optimize=True)


def build_asset(name: str, size: tuple[int, int] | None) -> tuple[int, int]:
    source_path = SOURCE / name
    target_path = TARGET / f"{source_path.stem}.webp"
    with Image.open(source_path) as image:
        image.load()
        if size and image.size != size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if has_alpha else "RGB")
        image.save(
            target_path,
            "WEBP",
            quality=88 if has_alpha else 84,
            method=4,
            exact=has_alpha,
        )
    return source_path.stat().st_size, target_path.stat().st_size


def build_high_res_asset(name: str, size: tuple[int, int]) -> int:
    source_path = SOURCE / name
    target_path = TARGET / f"{source_path.stem}_hq.webp"
    with Image.open(source_path) as image:
        image.load()
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")
        image = image.resize(size, Image.Resampling.LANCZOS)
        if has_alpha:
            alpha = image.getchannel("A")
            color = image.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=72, threshold=3))
            image = color.convert("RGBA")
            image.putalpha(alpha)
        else:
            image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=72, threshold=3))
        image.save(target_path, "WEBP", quality=88, method=6, exact=has_alpha)
    return target_path.stat().st_size


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    build_rocky_surface_foreground()
    source_bytes = 0
    target_bytes = 0
    for name, size in ASSETS.items():
        before, after = build_asset(name, size)
        source_bytes += before
        target_bytes += after
        print(f"{name:44} {before / 1024:8.1f} KiB -> {after / 1024:8.1f} KiB")
    high_res_bytes = 0
    for name, size in sorted(HIGH_RES_ASSETS.items()):
        after = build_high_res_asset(name, size)
        high_res_bytes += after
        print(f"{name + ' [4K]':44} {'':>8}     -> {after / 1024:8.1f} KiB")
    saving = 100 * (1 - target_bytes / source_bytes)
    print(
        f"Runtime assets: {source_bytes / 1024 / 1024:.2f} MiB -> "
        f"{target_bytes / 1024 / 1024:.2f} MiB ({saving:.1f}% smaller)"
    )
    print(f"Optional desktop 4K derivatives: {high_res_bytes / 1024 / 1024:.2f} MiB")


if __name__ == "__main__":
    main()
