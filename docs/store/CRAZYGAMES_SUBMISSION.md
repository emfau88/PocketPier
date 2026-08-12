# Pocket Pier - CrazyGames submission package

Status: prepared 2026-08-12. Portal upload and device-lab checks remain manual because they require the CrazyGames developer account and physical Safari/Android devices.

## Store copy

### Short description

Cast from a cozy harbor, guide your hook through three lively underwater worlds, collect charming fish and treasures, and repair your little boat to reach deeper waters.

### Full description

Pocket Pier is a cozy fishing adventure built for quick browser sessions and satisfying long-term discovery. Start at Sunny Pier, learn an optional Perfect Cast, then steer the hook underwater to meet playful fish and uncover lost treasures. Complete Harbor Jobs, claim badges, improve your tackle, and repair the harbor boat to unlock Rocky Cove and the mysterious Moonlit Trench. Every area has its own fish, hazards, movement patterns, mastery goals, and secrets—and every completed area stays available to revisit.

### Feature list

- Three replayable fishing locations with distinct underwater mechanics
- 16 unique fish species and 9 discoverable treasures
- 15 Harbor Jobs, 13 claimable badges, 15 player levels, and four upgrade paths
- Boat repair and location-mastery progression
- Fishbook, records, treasure collection, and unlockable bobber styles
- Mouse, keyboard, and mobile touch controls
- Persistent local or CrazyGames cloud progress

## Controls

### Desktop

- Start/cast: click or Space
- Steer underwater: hold and move the mouse, WASD, or arrow keys
- Reel in: E, Space, or the Reel In button
- Harbor menus: click the labeled interactive objects

### Mobile

- Start/cast: tap
- Steer underwater: hold and drag the floating joystick
- Reel in: tap Reel In
- Harbor menus: tap the labeled interactive objects

The green cast window is an optional reward bonus; missing it never prevents a cast.

## Cover files

- `pocket-pier-cover-1920x1080.jpg` - landscape 16:9
- `pocket-pier-cover-800x1200.jpg` - portrait 2:3
- `pocket-pier-cover-800x800.jpg` - square 1:1

The source illustrations are stored in `masters/`. Rebuild exact-size covers with `python scripts/build_store_covers.py`. Store artwork is intentionally outside `src/` and does not increase the game's download.

## Preview video shot list

CrazyGames requires silent landscape and portrait previews, 15-20 seconds maximum, beginning with the matching static cover. Record from the real build—do not synthesize or speed up footage.

1. 0-2 s: matching static cover.
2. 2-5 s: Sunny Pier cast and underwater transition.
3. 5-9 s: steer into and catch a colorful fish.
4. 9-12 s: treasure discovery or rare-fish catch card.
5. 12-16 s: quick Rocky Cove and Moonlit Trench cuts.
6. 16-19 s: trip rewards flying into XP/coins or a badge claim.

Deliver one 1920x1080 16:9 video and one 1080x1620 2:3 video, without cursor, black bars, promotional text, logos, or sound. A final recording is intentionally not committed because it must show current, genuine gameplay and be checked after portal encoding.

## Compliance and metadata

- Audience: general 13+; target PEGI 3/7 content and compatible with the portal's PEGI-12 ceiling.
- No violence, gambling, chat, user-generated content, external login, purchases, external advertisements, app-store links, or personal-data collection by the game.
- Progress data contains only game state. On CrazyGames it uses the SDK Data module; elsewhere it falls back to browser local storage.
- Supported orientation: landscape.
- Supported inputs: mouse, keyboard, and touch.
- Recommended categories: Fishing, Casual, Adventure.
- Recommended tags: Cozy, Collecting, Upgrades, Mobile, Single-player.
- Language: English UI and store copy. No locale-sensitive player text is currently required.

## Portal checklist

- [ ] Create/update the game entry in the CrazyGames Developer Portal.
- [ ] Select HTML5 and landscape orientation.
- [ ] Enable the SDK Data Module for progress save.
- [ ] Upload the contents of `dist/` with `index.html` at the archive root.
- [ ] Upload all three covers and both silent preview videos.
- [ ] Paste description, feature list, and controls from this document.
- [ ] Test new guest, returning guest, and signed-in cloud-save paths in Preview.
- [ ] Test ad-unavailable fallback during Basic Launch; there must be no dead buttons or freeze.
- [ ] Test 16:9 desktop, small landscape mobile, CrazyGames Android/iOS app safe areas, and devicePixelRatio 1.
- [ ] Confirm all text is readable, every modal closes, gameplay resumes, and no asset request fails.
- [ ] When audio work resumes, add platform mute and ad mute/unmute handling before Full Launch monetization.
- [ ] Submit Basic Launch only after the two real-device checks and Preview pass.
