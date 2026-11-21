// world.js — the museum grid: parsing a level map, collision, shadow tiles,
// and line of sight (what a guard's vision cone can actually see).
import { TILE, MAP_COLS, MAP_ROWS } from './config.js';

export const TILE_KIND = {
  WALL: '#',
  FLOOR: '.',
  SHADOW: ',',
  STATUE: 'S',
  CRATE: 'C',
  CASE: 'D',
  PLAYER: 'P',
  SAPPHIRE: '*',
  EXIT: 'E',
  LOOT: 'o',
};

// Tiles that stop movement.
const SOLID = new Set(['#', 'S', 'C', 'D']);
// Tiles that stop a guard's line of sight.
const SIGHT_BLOCKING = new Set(['#', 'S', 'C', 'D']);

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function pixelToTile(x, y) {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

export class World {
  constructor(level) {
    this.name = level.name;
    this.briefing = level.briefing;
    // Normalise rows: pad short rows with wall, trim long ones, force a
    // solid border so nothing can ever walk off the map.
    this.grid = level.map.map((row) => {
      const chars = row.split('');
      while (chars.length < MAP_COLS) chars.push('#');
      return chars.slice(0, MAP_COLS);
    });
    while (this.grid.length < MAP_ROWS) {
      this.grid.push(new Array(MAP_COLS).fill('#'));
    }
    this.grid = this.grid.slice(0, MAP_ROWS);
    for (let c = 0; c < MAP_COLS; c++) {
      this.grid[0][c] = '#';
      this.grid[MAP_ROWS - 1][c] = '#';
    }
    for (let r = 0; r < MAP_ROWS; r++) {
      this.grid[r][0] = '#';
      this.grid[r][MAP_COLS - 1] = '#';
    }
    this.playerStart = { x: TILE * 2, y: TILE * 2 };
    this.sapphire = null;
    this.exit = null;
    this.loot = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const ch = this.grid[r][c];
        const centre = tileCenter(c, r);
        if (ch === 'P') {
          this.playerStart = centre;
          this.grid[r][c] = '.';
        } else if (ch === '*') {
          this.sapphire = { ...centre, col: c, row: r, taken: false };
          this.grid[r][c] = '.';
        } else if (ch === 'E') {
          this.exit = { ...centre, col: c, row: r };
          this.grid[r][c] = '.';
        } else if (ch === 'o') {
          this.loot.push({ ...centre, col: c, row: r, taken: false });
          this.grid[r][c] = '.';
        }
      }
    }
    for (const [col, row] of level.loot || []) {
      const centre = tileCenter(col, row);
      this.loot.push({ ...centre, col, row, taken: false });
    }
  }

  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return '#';
    return this.grid[row][col];
  }

  tileAtPixel(x, y) {
    const { col, row } = pixelToTile(x, y);
    return this.tileAt(col, row);
  }

  isSolidAtPixel(x, y) {
    return SOLID.has(this.tileAtPixel(x, y));
  }

  isShadowAtPixel(x, y) {
    return this.tileAtPixel(x, y) === ',';
  }

  // Circle-vs-grid collision: true when a circle of the given radius at
  // (x, y) overlaps any solid tile.
  collides(x, y, radius) {
    const left = Math.floor((x - radius) / TILE);
    const right = Math.floor((x + radius) / TILE);
    const top = Math.floor((y - radius) / TILE);
    const bottom = Math.floor((y + radius) / TILE);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (SOLID.has(this.tileAt(c, r))) return true;
      }
    }
    return false;
  }

  // Move a circle by (dx, dy), sliding along walls: try the full step, then
  // each axis on its own. Returns the new position.
  moveCircle(x, y, dx, dy, radius) {
    if (!this.collides(x + dx, y + dy, radius)) return { x: x + dx, y: y + dy };
    if (!this.collides(x + dx, y, radius)) return { x: x + dx, y };
    if (!this.collides(x, y + dy, radius)) return { x, y: y + dy };
    return { x, y };
  }

  // Line of sight between two points: sample along the segment and fail
  // when a sight-blocking tile is crossed.
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (SIGHT_BLOCKING.has(this.tileAtPixel(x0 + dx * t, y0 + dy * t))) {
        return false;
      }
    }
    return true;
  }

  // How far a vision ray travels before it hits something that blocks sight.
  rayDistance(x, y, angle, maxDist) {
    const step = 6;
    for (let d = step; d <= maxDist; d += step) {
      const px = x + Math.cos(angle) * d;
      const py = y + Math.sin(angle) * d;
      if (SIGHT_BLOCKING.has(this.tileAtPixel(px, py))) return d;
    }
    return maxDist;
  }
}
