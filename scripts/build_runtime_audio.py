"""Build compact browser audio while preserving the WAV masters.

Requires ffmpeg on PATH. The generated MP3 files are deterministic runtime
assets and may be committed alongside the source WAV files.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "assets" / "audio"
OUTPUT = SOURCE / "runtime"


def main() -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is required to build runtime audio")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for stale in OUTPUT.glob("*.mp3"):
        stale.unlink()
    sources = sorted(SOURCE.glob("*.wav"))
    for source in sources:
        target = OUTPUT / f"{source.stem}.m4a"
        subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source),
                "-codec:a",
                "aac",
                "-b:a",
                "96k",
                str(target),
            ],
            check=True,
        )

    before = sum(path.stat().st_size for path in sources)
    after = sum(path.stat().st_size for path in OUTPUT.glob("*.m4a"))
    saving = 100 * (1 - after / before) if before else 0
    print(f"Converted {len(sources)} sounds: {before / 1024:.1f} KiB -> {after / 1024:.1f} KiB ({saving:.1f}% smaller)")


if __name__ == "__main__":
    main()
