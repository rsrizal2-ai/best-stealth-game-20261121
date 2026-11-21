// player.js — the thief: movement, sneaking, the coin distraction, loot
// and the sapphire. Knows nothing about rendering or guards.
import { TUNING } from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = this.world.playerStart.x;
    this.y = this.world.playerStart.y;
    this.radius = 12;
    this.facing = 0; // radians, the direction the thief looks
    this.sneaking = false;
    this.moving = false;
    this.movingFast = false;
    this.inShadow = false;
    this.coins = TUNING.coinCount;
    this.coinsThrown = 0;
    this.lootTaken = 0;
    this.hasSapphire = false;
    this.stepPhase = 0;
    this.throwAnim = null; // {fromX, fromY, toX, toY, t} while a coin flies
  }

  update(dt, input, events) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.sneaking = !!input.sneak;
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.facing = Math.atan2(my, mx);
      const speed = this.sneaking ? TUNING.playerSneakSpeed : TUNING.playerWalkSpeed;
      this.movingFast = !this.sneaking;
      const moved = this.world.moveCircle(
        this.x,
        this.y,
        mx * speed * dt,
        my * speed * dt,
        this.radius,
      );
      this.x = moved.x;
      this.y = moved.y;
      this.stepPhase += (dt * speed) / 30;
      if (this.stepPhase >= 1) {
        this.stepPhase -= 1;
        events.push({ type: 'playerStep', sneaking: this.sneaking });
      }
    } else {
      this.movingFast = false;
    }
    this.inShadow = this.world.isShadowAtPixel(this.x, this.y);

    // Pick up loot gems and the Star Sapphire by walking over them.
    for (const gem of this.world.loot) {
      if (!gem.taken && Math.hypot(gem.x - this.x, gem.y - this.y) < 22) {
        gem.taken = true;
        this.lootTaken++;
        events.push({ type: 'loot', x: gem.x, y: gem.y });
      }
    }
    const sapphire = this.world.sapphire;
    if (sapphire && !sapphire.taken && Math.hypot(sapphire.x - this.x, sapphire.y - this.y) < 24) {
      sapphire.taken = true;
      this.hasSapphire = true;
      events.push({ type: 'sapphire', x: sapphire.x, y: sapphire.y });
    }

    if (this.throwAnim) {
      this.throwAnim.t += dt / 0.45;
      if (this.throwAnim.t >= 1) {
        const landing = { x: this.throwAnim.toX, y: this.throwAnim.toY };
        this.throwAnim = null;
        events.push({ type: 'coinLanded', ...landing });
      }
    }
  }

  // Toss a coin toward a point (mouse click or the E key). Returns false
  // when no coins are left.
  throwCoin(toX, toY) {
    if (this.coins <= 0 || this.throwAnim) return false;
    const dx = toX - this.x;
    const dy = toY - this.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, TUNING.coinThrowRange);
    const ux = dist > 0 ? dx / dist : Math.cos(this.facing);
    const uy = dist > 0 ? dy / dist : Math.sin(this.facing);
    this.coins--;
    this.coinsThrown++;
    this.throwAnim = {
      fromX: this.x,
      fromY: this.y,
      toX: this.x + ux * clamped,
      toY: this.y + uy * clamped,
      t: 0,
    };
    return true;
  }

  coinPosition() {
    if (!this.throwAnim) return null;
    const t = this.throwAnim.t;
    const arc = Math.sin(t * Math.PI) * 26; // the coin arcs through the air
    return {
      x: this.throwAnim.fromX + (this.throwAnim.toX - this.throwAnim.fromX) * t,
      y: this.throwAnim.fromY + (this.throwAnim.toY - this.throwAnim.fromY) * t - arc,
    };
  }

  // The thief wins by standing on the exit tile while carrying the sapphire.
  onExitTile() {
    const exit = this.world.exit;
    if (!exit) return false;
    return Math.hypot(exit.x - this.x, exit.y - this.y) < 26;
  }
}
