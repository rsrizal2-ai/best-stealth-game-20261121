# Night Gallery

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rsrizal2-ai/best-stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rsrizal2-ai/best-stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-blue)](https://nodejs.org/)

A top-down stealth game built for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759). You are a thief in a museum after dark. Lift the Star Sapphire from its case, dodge the guards' vision cones, hide in the shadows, and slip out the exit unseen.

## How to play

Serve the `game/` folder with any static server and open `index.html` in a desktop browser, for example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080. The game runs fully offline: no network requests, no libraries, just canvas and WebAudio.

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift | Sneak — slower, quieter, harder to spot |
| E or click | Toss a coin to distract a guard (3 per level) |
| P or Esc | Pause |
| R | Restart the level |
| M | Mute |
| Enter | Start / continue |

## The heist

- **Vision cones** — a guard who can see you grows suspicious. The meter in the HUD shows the highest suspicion among the guards. At 55 a guard walks over to look; at 100 the alarm sounds and the guard chases you.
- **Cover and shadow** — statues, crates and display cases block a guard's line of sight. Dark shadow tiles hide you: suspicion falls faster while you stand in them, and a sneaking thief in shadow is barely visible at all.
- **Patrols to learn** — every guard walks a fixed route with pauses. Watch, wait, then move.
- **Distractions** — toss a coin and nearby guards leave their route to investigate the noise.
- **Footsteps** — guard steps are synthesized audio, louder when a guard is close, so you can hear a patrol coming around a corner.
- **Loot** — small gems are scattered through the wings for a careful thief. The Star Sapphire is the prize; the exit only opens for you once you carry it.
- **Three wings** — The Marble Hall, The Sculpture Wing, and The Sapphire Vault, each harder than the last. Caught by a guard, and the run ends.

## Layout

- `game/index.html` — the page: a canvas and the module entry point.
- `game/src/main.js` — boot, game loop and state machine (title, playing, paused, won, lost).
- `game/src/config.js` — tuning and the three levels (maps, patrols, loot).
- `game/src/world.js` — the museum grid: collision, shadow tiles, line of sight.
- `game/src/guards.js` — patrol AI, vision cones and the suspicion system.
- `game/src/player.js` — the thief: movement, sneaking, coin throws, pickups.
- `game/src/render.js` — all canvas drawing: floor, cover, cones, HUD, screens.
- `game/src/audio.js` — every sound synthesized with WebAudio; no audio files.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — deterministic scenes for the screenshots (`?shot=start|play|end`).
- `game/src/random.js` — a seeded RNG.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — three renders of the game's own code in a browser.

## License

MIT — see [LICENSE](LICENSE).
