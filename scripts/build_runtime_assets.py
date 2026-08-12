"""Build optimized WebP files from the generated Pocket Pier PNG masters.

Requires Pillow. The generated files are committed so production builds do not
need Python or Pillow; this script only makes the conversion reproducible.
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "assets" / "generated"
TARGET = ROOT / "src" / "assets" / "runtime"

# Exact output sizes are used only when the current source is substantially
# larger than the biggest in-game presentation at the 2x desktop render tier.
# Full-screen art, texture sheets with coordinate-based frames, and the map are
# kept at their authored dimensions.
ASSETS: dict[str, tuple[int, int] | None] = {
    "menu_ocean_morning_base.png": None,
    "menu_water_shimmer.png": None,
    "menu_gull_up.png": (256, 256),
    "menu_gull_glide.png": (256, 256),
    "menu_gull_down.png": (256, 256),
    "bobber_basic.png": (128, 128),
    "bg_sunny_pier_remaster.png": None,
    "surface_clouds.png": None,
    "character_angler_chair_perspective.png": (768, 512),
    "hub_cooler.png": (328, 236),
    "hub_tacklebox_closed.png": (328, 236),
    "hub_tacklebox_open.png": (640, 486),
    "ui_upgrade_icons.png": (544, 544),
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


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    source_bytes = 0
    target_bytes = 0
    for name, size in ASSETS.items():
        before, after = build_asset(name, size)
        source_bytes += before
        target_bytes += after
        print(f"{name:44} {before / 1024:8.1f} KiB -> {after / 1024:8.1f} KiB")
    saving = 100 * (1 - target_bytes / source_bytes)
    print(
        f"Runtime assets: {source_bytes / 1024 / 1024:.2f} MiB -> "
        f"{target_bytes / 1024 / 1024:.2f} MiB ({saving:.1f}% smaller)"
    )


if __name__ == "__main__":
    main()
