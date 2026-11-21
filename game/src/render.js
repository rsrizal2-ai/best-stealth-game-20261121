// render.js — all canvas drawing: the museum floor, walls, cover, shadow
// zones, vision cones, the thief, the guards, the HUD and the screens.
// Nothing here loads anything: every shape is drawn from code.
import {
  TILE,
  MAP_COLS,
  MAP_ROWS,
  HUD_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TUNING,
} from './config.js';
import { GUARD_STATE } from './guards.js';

// A stable hash of a tile coordinate, for floor variation that never changes.
function tileHash(col, row) {
  let h = (col * 374761393 + row * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function conePolygon(world, guard) {
  const points = [];
  const steps = 26;
  const half = TUNING.guardVisionHalfAngle;
  for (let i = 0; i <= steps; i++) {
    const angle = guard.facing - half + (2 * half * i) / steps;
    const dist = world.rayDistance(guard.x, guard.y, angle, TUNING.guardVisionRange);
    points.push({
      x: guard.x + Math.cos(angle) * dist,
      y: guard.y + Math.sin(angle) * dist,
    });
  }
  return points;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawHud(game);
    ctx.save();
    ctx.translate(0, HUD_HEIGHT);
    this.drawFloor(game.world);
    this.drawShadowZones(game.world);
    this.drawExit(game.world);
    this.drawLoot(game.world);
    this.drawSapphire(game.world, game.time);
    this.drawCover(game.world);
    this.drawWalls(game.world);
    this.drawCoin(game.player);
    for (const guard of game.guards) this.drawGuardCone(game.world, guard);
    for (const guard of game.guards) this.drawGuard(guard, game.time);
    this.drawPlayer(game.player, game.time);
    this.drawDarkness(game.player);
    this.drawToasts(game);
    ctx.restore();
    if (game.state === 'title') this.drawTitle(game);
    if (game.state === 'paused') this.drawPaused(game);
    if (game.state === 'won') this.drawWon(game);
    if (game.state === 'lost') this.drawLost(game);
  }

  drawFloor(world) {
    const ctx = this.ctx;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const ch = world.tileAt(c, r);
        const x = c * TILE;
        const y = r * TILE;
        const shade = tileHash(c, r);
        if (ch === '#') continue; // walls are drawn later, on top
        if (ch === ',') {
          ctx.fillStyle = '#1b2138';
        } else if ((c + r) % 2 === 0) {
          ctx.fillStyle = shade > 0.5 ? '#2a2f45' : '#272c42';
        } else {
          ctx.fillStyle = shade > 0.5 ? '#232839' : '#202538';
        }
        ctx.fillRect(x, y, TILE, TILE);
        // Faint marble veining on some tiles.
        if (shade > 0.82) {
          ctx.strokeStyle = 'rgba(180, 190, 220, 0.08)';
          ctx.beginPath();
          ctx.moveTo(x + 4, y + TILE - 6);
          ctx.lineTo(x + TILE - 8, y + 5);
          ctx.stroke();
        }
      }
    }
  }

  drawShadowZones(world) {
    const ctx = this.ctx;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (world.tileAt(c, r) !== ',') continue;
        const x = c * TILE;
        const y = r * TILE;
        ctx.fillStyle = 'rgba(6, 8, 20, 0.45)';
        ctx.fillRect(x, y, TILE, TILE);
        // Dotted edge where a shadow tile meets the light.
        ctx.fillStyle = 'rgba(140, 160, 220, 0.25)';
        if (world.tileAt(c, r - 1) !== ',') ctx.fillRect(x, y, TILE, 2);
        if (world.tileAt(c, r + 1) !== ',') ctx.fillRect(x, y + TILE - 2, TILE, 2);
        if (world.tileAt(c - 1, r) !== ',') ctx.fillRect(x, y, 2, TILE);
        if (world.tileAt(c + 1, r) !== ',') ctx.fillRect(x + TILE - 2, y, 2, TILE);
      }
    }
  }

  drawWalls(world) {
    const ctx = this.ctx;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (world.tileAt(c, r) !== '#') continue;
        const x = c * TILE;
        const y = r * TILE;
        ctx.fillStyle = '#3a4157';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4a526e';
        ctx.fillRect(x, y, TILE, 4);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.55)';
        ctx.fillRect(x, y + TILE - 3, TILE, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x, y + 4, TILE, 2);
      }
    }
  }

  drawCover(world) {
    const ctx = this.ctx;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const ch = world.tileAt(c, r);
        const x = c * TILE;
        const y = r * TILE;
        if (ch === 'S') {
          // Statue: a pedestal and a marble bust.
          ctx.fillStyle = '#565e78';
          ctx.fillRect(x + 4, y + 18, TILE - 8, TILE - 22);
          ctx.fillStyle = '#8b93ad';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + 13, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#a9b0c6';
          ctx.beginPath();
          ctx.arc(x + TILE / 2 - 2, y + 11, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'C') {
          // Crate: wooden box with planks and nails.
          ctx.fillStyle = '#6b4a26';
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = '#4a2f14';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + TILE - 3, y + TILE - 3);
          ctx.moveTo(x + TILE - 3, y + 3);
          ctx.lineTo(x + 3, y + TILE - 3);
          ctx.stroke();
        } else if (ch === 'D') {
          // Display case: glass cabinet with a golden relic inside.
          ctx.fillStyle = '#2c3550';
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = 'rgba(170, 210, 255, 0.35)';
          ctx.fillRect(x + 7, y + 7, TILE - 14, TILE - 14);
          ctx.fillStyle = '#d4af37';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(x + 8, y + TILE - 8);
          ctx.lineTo(x + TILE - 12, y + 8);
          ctx.stroke();
        }
      }
    }
  }

  drawSapphire(world, time) {
    const ctx = this.ctx;
    const s = world.sapphire;
    if (!s || s.taken) return;
    const pulse = 0.7 + 0.3 * Math.sin(time * 3);
    ctx.save();
    ctx.shadowColor = '#33d6ff';
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = '#4de3ff';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 12);
    ctx.lineTo(s.x + 9, s.y);
    ctx.lineTo(s.x, s.y + 12);
    ctx.lineTo(s.x - 9, s.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(s.x - 3, s.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLoot(world) {
    const ctx = this.ctx;
    for (const gem of world.loot) {
      if (gem.taken) continue;
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - 6);
      ctx.lineTo(gem.x + 5, gem.y);
      ctx.lineTo(gem.x, gem.y + 6);
      ctx.lineTo(gem.x - 5, gem.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawExit(world) {
    const ctx = this.ctx;
    const e = world.exit;
    if (!e) return;
    ctx.fillStyle = '#0d5c2e';
    ctx.fillRect(e.x - 16, e.y - 16, 32, 32);
    ctx.fillStyle = '#17a24b';
    ctx.fillRect(e.x - 13, e.y - 13, 26, 26);
    ctx.fillStyle = '#d8ffe6';
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x, e.y + 1);
  }

  drawCoin(player) {
    const ctx = this.ctx;
    const pos = player.coinPosition();
    if (!pos) return;
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawGuardCone(world, guard) {
    const ctx = this.ctx;
    const points = conePolygon(world, guard);
    ctx.fillStyle = guard.coneColor();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }

  drawGuard(guard, time) {
    const ctx = this.ctx;
    const alerted = guard.state === GUARD_STATE.CHASE;
    const wary = guard.suspicion >= TUNING.suspicionInvestigateAt;
    // Body: a navy uniform with a gold trim ring.
    ctx.fillStyle = alerted ? '#8c1f28' : '#1f2a52';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alerted ? '#ff5b5b' : '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick and helmet dot.
    ctx.strokeStyle = '#e8ecf7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 17, guard.y + Math.sin(guard.facing) * 17);
    ctx.stroke();
    ctx.fillStyle = '#c9d2ea';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion arc above the guard.
    if (guard.suspicion > 2) {
      ctx.strokeStyle = guard.suspicion >= 55 ? '#ff5b5b' : '#ffb020';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 18, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.suspicion) / 100);
      ctx.stroke();
    }
    // "!" when chasing, "?" when investigating, bobbing gently.
    if (alerted || guard.state === GUARD_STATE.INVESTIGATE || wary) {
      const bob = Math.sin(time * 5) * 2;
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = alerted ? '#ff5b5b' : '#ffcf4d';
      ctx.fillText(alerted ? '!' : '?', guard.x, guard.y - 20 + bob);
    }
  }

  drawPlayer(player, time) {
    const ctx = this.ctx;
    const bob = player.moving ? Math.sin(time * 10) * 1.5 : 0;
    // Cloak: a dark teal hooded figure, brighter when it moves fast.
    ctx.fillStyle = player.sneaking ? '#0f4c4c' : '#146666';
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7fe0d4';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood point and eyes in the facing direction.
    const fx = Math.cos(player.facing);
    const fy = Math.sin(player.facing);
    ctx.fillStyle = '#0a2e2e';
    ctx.beginPath();
    ctx.arc(player.x + fx * 7, player.y + fy * 7 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eafffb';
    ctx.beginPath();
    ctx.arc(player.x + fx * 9 - fy * 3, player.y + fy * 9 + fx * 3 + bob, 1.6, 0, Math.PI * 2);
    ctx.arc(player.x + fx * 9 + fy * 3, player.y + fy * 9 - fx * 3 + bob, 1.6, 0, Math.PI * 2);
    ctx.fill();
    // A faint ring when the thief stands in shadow: the game saying "hidden".
    if (player.inShadow) {
      ctx.strokeStyle = 'rgba(127, 224, 212, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(player.x, player.y + bob, player.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Night falls away from the thief: the lit circle around the player.
  drawDarkness(player) {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      player.x,
      player.y,
      90,
      player.x,
      player.y,
      430,
    );
    grad.addColorStop(0, 'rgba(4, 6, 18, 0)');
    grad.addColorStop(1, 'rgba(4, 6, 18, 0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, MAP_ROWS * TILE);
  }

  drawToasts(game) {
    const ctx = this.ctx;
    const now = game.time;
    const fresh = game.toasts.filter((t) => now - t.at < 2.6);
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    fresh.forEach((toast, i) => {
      const y = MAP_ROWS * TILE - 16 - i * 22;
      ctx.fillStyle = 'rgba(4, 6, 18, 0.7)';
      const w = ctx.measureText(toast.text).width + 20;
      ctx.fillRect(CANVAS_WIDTH / 2 - w / 2, y - 16, w, 22);
      ctx.fillStyle = toast.color || '#ffe9a8';
      ctx.fillText(toast.text, CANVAS_WIDTH / 2, y);
    });
  }

  drawHud(game) {
    const ctx = this.ctx;
    ctx.fillStyle = '#10131f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, HUD_HEIGHT - 2, CANVAS_WIDTH, 2);
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8ecf7';
    ctx.fillText(`Night Gallery — Level ${game.levelIndex + 1}: ${game.world.name}`, 12, 13);
    // Objective, under the title.
    ctx.font = '12px Georgia, serif';
    ctx.fillStyle = game.player.hasSapphire ? '#7fe0a8' : '#ffd75e';
    const objective = game.player.hasSapphire
      ? 'Sapphire taken — reach the EXIT'
      : 'Steal the Star Sapphire';
    ctx.fillText(objective, 12, 29);
    // Suspicion meter, centre-right.
    const meterX = 560;
    const meterW = 170;
    ctx.fillStyle = '#e8ecf7';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.fillText('SUSPICION', meterX - 78, HUD_HEIGHT / 2);
    ctx.fillStyle = '#222842';
    ctx.fillRect(meterX, 12, meterW, 16);
    const suspicion = game.maxSuspicion();
    const hue = suspicion >= 100 ? '#ff4040' : suspicion >= 55 ? '#ff9d2e' : '#ffd75e';
    ctx.fillStyle = hue;
    ctx.fillRect(meterX, 12, (meterW * suspicion) / 100, 16);
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(meterX, 12, meterW, 16);
    // Loot, coins, timer on the right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8ecf7';
    ctx.font = '13px Georgia, serif';
    const mins = Math.floor(game.elapsed / 60);
    const secs = Math.floor(game.elapsed % 60);
    const clock = `${mins}:${secs.toString().padStart(2, '0')}`;
    ctx.fillText(
      `Loot ${game.player.lootTaken}  Coins ${game.player.coins}  ${clock}`,
      CANVAS_WIDTH - 12,
      HUD_HEIGHT / 2,
    );
    ctx.textAlign = 'left';
  }

  overlayPanel(title, lines, accent) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 6, 18, 0.78)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#10131f';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    const w = 620;
    const h = 120 + lines.length * 26;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(title, CANVAS_WIDTH / 2, y + 52);
    ctx.fillStyle = '#e8ecf7';
    ctx.font = '16px Georgia, serif';
    lines.forEach((line, i) => ctx.fillText(line, CANVAS_WIDTH / 2, y + 92 + i * 26));
  }

  drawTitle(game) {
    this.overlayPanel('NIGHT GALLERY', [
      'A thief. A museum after dark. One Star Sapphire.',
      game.world.briefing,
      'WASD or arrows to move — Shift to sneak — E or click to toss a coin',
      'Stay out of the yellow cones. Hide in the dark. Reach the EXIT unseen.',
      'Press Enter or click to begin',
    ], '#d4af37');
  }

  drawPaused(game) {
    this.overlayPanel('PAUSED', [
      'The guards wait. Take a breath.',
      'Press P or Esc to keep sneaking — R to restart the level',
    ], '#7fb2ff');
  }

  drawWon(game) {
    const mins = Math.floor(game.elapsed / 60);
    const secs = Math.floor(game.elapsed % 60);
    const lines = [
      `You slipped out with the Star Sapphire in ${mins}:${secs.toString().padStart(2, '0')}.`,
      `Loot gathered: ${game.player.lootTaken} gems. Coins thrown: ${game.player.coinsThrown}.`,
    ];
    if (game.levelIndex + 1 < game.levelCount) {
      lines.push('Press Enter for the next wing — the guards get sharper.');
    } else {
      lines.push('Every wing cleared. The gallery will never know you were there.');
      lines.push('Press Enter to play again from the Marble Hall.');
    }
    this.overlayPanel('CLEAN GETAWAY', lines, '#7fe0a8');
  }

  drawLost(game) {
    this.overlayPanel('CAUGHT', [
      'A guard laid hands on you under the gallery lights.',
      'The sapphire stays in its case. This time.',
      'Press R or Enter to try the level again',
    ], '#ff5b5b');
  }
}
