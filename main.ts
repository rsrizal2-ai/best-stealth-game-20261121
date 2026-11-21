// Night Gallery — the hand-in program for the best-stealth-game bounty.
// Node 22, standard library only. It copies this repository's game/ and
// screenshots/ into /output (or MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json with the vendored make.fun library, so the
// sealed scorer can check the entry and the judge can read it.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

function copyTree(source, target) {
  cpSync(source, target, { recursive: true, dereference: true });
}

// Start from a clean output directory so a stale file from an earlier run
// can never leak into the entry. Clear the directory's CONTENTS, never the
// directory itself: in the grader MAKEFUN_OUTPUT_DIR is /output, a mount
// point, and removing a mount point fails with EBUSY — round 1 died exactly
// here, `rmSync(outputDir)` throwing "EBUSY: resource busy or locked, rmdir
// '/output'" and the program exiting 1 before writing anything. Removing
// the entries inside the mount is fine, and a second run (the grader runs
// the program twice) clears the first run's files the same way.
if (existsSync(outputDir)) {
  for (const entry of readdirSync(outputDir)) {
    rmSync(join(outputDir, entry), { recursive: true, force: true });
  }
}
mkdirSync(outputDir, { recursive: true });
copyTree(gameDir, join(outputDir, 'game'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) copyTree(shotsDir, join(outputDir, 'screenshots'));

// The caps the scorer itself enforces: the dossier text cap, at most four
// screenshots of at most 256 KiB each, and game/ within 993 entries and
// 48 MiB. buildDossier refuses anything over them, so a bad entry fails
// loudly here instead of silently at the gate.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
