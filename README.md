# Pocket Pier

A cozy browser fishing game built with Phaser and TypeScript. Cast from the harbor, guide the hook through distinct underwater areas, discover fish and treasures, complete Harbor Jobs, upgrade the tackle box, and repair the boat to unlock new fishing spots.

## Play now

**[Play Pocket Pier on GitHub Pages](https://emfau88.github.io/PocketPier/)**

The game runs directly in a modern desktop or mobile browser. Mobile play is designed for landscape orientation.

## Highlights

- Three replayable fishing areas with 16 fish species and 12 treasures
- Area-specific fish, treasures, movement patterns, currents, obstacles, and visibility rules
- Three-dive fishing trips with coins, XP, level rewards, records, and discovery progress
- 15 Harbor Jobs, 13 claimable badges, 15 player levels, equipment upgrades, and staged boat repairs
- Fishbook, treasure collection, unlockable bobber styles, and local/CrazyGames cloud saves
- Optional Perfect Cast timing bonus with clear reward feedback
- Mobile-first underwater controls with a floating analog joystick
- Color-coded remaining-line meter, basket capacity, catch progress, and Reel In control
- Responsive Full-HD rendering, device safe areas, touch controls, keyboard controls, and reduced-motion support
- Optimized runtime artwork, staged loading, and a CrazyGames HTML5 v3 integration with safe local fallback

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Cast | Click or press Space | Tap; green timing grants a bonus |
| Steer underwater | Hold and move the mouse, WASD, or arrow keys | Hold and drag the floating joystick |
| Catch a fish | Keep the hook inside the catch ring | Keep the hook inside the catch ring |
| Reel in | E, Space, or the Reel In button | Reel In button |
| Open harbor menus | Click the interactive harbor objects | Tap the interactive harbor objects |

The first mobile dive displays a short one-time steering guide. A colored bar shows the remaining line at a glance; the meter value remains available for precision.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL, normally `http://127.0.0.1:5174/` or `http://localhost:5173/`.

### Verification

```bash
npm test
npm run build
```

`npm test` runs the gameplay, progression, save-migration, responsive-layout, and touch-control regression suite. `npm run build` performs the TypeScript check and creates the production bundle in `dist/`.

The current release suite contains 37 deterministic tests. The built game is about 3.9 MB across 67 files and remains well inside the CrazyGames mobile download limits.

## Project structure

```text
src/core/       save data, rendering, audio, assets, and portal integration
src/gameplay/   fish, locations, quests, balance, and input rules
src/scenes/     menu, harbor, underwater gameplay, loading, and trip summary
src/assets/     generated source artwork and optimized runtime assets
tests/          deterministic regression tests
docs/           release roadmap and QA documentation
```

## Deployment

Every push to `master` runs the GitHub Actions Pages workflow. It installs dependencies, builds the production bundle, and deploys `dist/` to:

https://emfau88.github.io/PocketPier/

## Roadmap

The implementation history, completed milestones, and remaining portal-readiness work are tracked in [docs/RELEASE_ROADMAP.md](docs/RELEASE_ROADMAP.md).

CrazyGames descriptions, controls, covers, preview-video shot list, compliance notes, and the final portal checklist are collected in [docs/store/CRAZYGAMES_SUBMISSION.md](docs/store/CRAZYGAMES_SUBMISSION.md).
