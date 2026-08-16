# Pocket Pier sound effects

Selected from the locally supplied `400 Sounds Pack`. The project owner confirmed that the pack may be used for all purposes.

| Project file | Original pack file | In-game use |
| --- | --- | --- |
| `ui_select.wav` | `UI/select_2.wav` | Primary buttons and tab selection |
| `ui_cancel.wav` | `UI/cancel.wav` | Close, cancel and failed actions |
| `ui_pop.wav` | `UI/pop_2.wav` | Reel and confirmation prompts |
| `book_open.wav` | `Items/book_open.wav` | Fishbook opening |
| `book_close.wav` | `Items/book_close.wav` | Fishbook and jobs closing |
| `jobs_open.wav` | `Items/page_turn.wav` | Harbor jobs and badge pages |
| `gear_equip.wav` | `Items/item_equip.wav` | Tackle box and upgrades |
| `coins.wav` | `Items/coins_gather_quick.wav` | Dive and trip rewards |
| `boat_knock.wav` | `Other/subtle_knock.wav` | Boat inspection and repair |
| `cast_twang.wav` | `Other/elastic_twang.wav` | Casting |
| `water_splash.wav` | `Environment/water_splashing.wav` | Bobber water impact |
| `bite_plop.wav` | `Environment/ice_in_water.wav` | Hook entering a fish capture zone |
| `catch_chime.wav` | `Musical Effects/steel_drums_chime_quick.wav` | Fish caught |
| `treasure_mystery.wav` | `Musical Effects/steel_drums_mystery.wav` | Treasure found |
| `claim_chime.wav` | `Musical Effects/steel_drums_chime_positive.wav` | Job and badge claims |
| `level_up.wav` | `Musical Effects/steel_drums_level_complete.wav` | Level up |

All event-SFX masters are stereo PCM WAV at 44.1 kHz. Synthetic Web Audio
tones remain as runtime fallbacks when a sample cannot play.

## Music and ambience

The ambient layer deliberately stays quieter than the event sounds. Music is
loaded after the main menu is already visible so the first mobile loading screen
does not wait for the long track.

| Runtime file | Supplied source | In-game use | License supplied with asset |
| --- | --- | --- | --- |
| `music_sunset_plains.m4a` | `Sunset Plains` — Yoiyami | Very quiet menu and harbor music | CC0 |
| `ambient_harbor_waves.m4a` | `18363__jasinski__alkaibeach` wave sample | Looping harbor water bed | CC0 |
| `seagull_1.m4a` … `seagull_4.m4a` | `Solo Seagull Sound Effects` | Random calls synchronized with visible gulls | CC0 |
| `ambient_underwater_sunny.m4a` | `loop_bubbles_02.ogg` — rubberduck | Sunny Pier underwater bed | CC0 |
| `ambient_underwater_rocky.m4a` | `loop_water_02.ogg` — rubberduck | Rocky Cove current bed | CC0 |
| `ambient_underwater_moonlit.m4a` | `loop_water_03.ogg` — rubberduck | Low-pass Moonlit Trench bed | CC0 |
| `bubble_1.m4a` … `bubble_3.m4a` | `Bubble Sound Effects` — BMacZero | Occasional underwater details | CC0 |
| `reel.m4a` | `reel.wav`, `Fisheefects` — Memoraphile | Reel-in movement | Use permitted with or without attribution |

The project owner supplied these source files and confirmed their use is
permitted. Runtime copies use AAC at 64–80 kbit/s; the original 60.4 MiB music
WAV becomes a 3.2 MiB browser asset. Only the selected sounds are shipped.
