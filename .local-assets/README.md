# Local source assets

Store large, unused source packs in `.local-assets/audio-unused/`.

This directory is intentionally excluded from Git except for this note:

- Vite deletes and recreates `dist/` on every production build, so source files
  must never be stored there.
- Only optimized files referenced by the game belong in
  `src/assets/audio/runtime/` and are committed to GitHub.
- Original packs kept for later auditions belong in
  `.local-assets/audio-unused/`; they survive builds without inflating the
  repository or the deployed game.
