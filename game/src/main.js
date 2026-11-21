// main.js — Night Gallery: boot, the game loop and the state machine.
// States: title, playing, paused, won, lost. The loop updates the world
// only while playing; the renderer draws every frame.
import { LEVELS, CANVAS_WIDTH, CANVAS_HEIGHT, TUNING } from './config.js';
import { World } from './world.js';
import { Guard, GUARD_STATE } from './guards.js';
import { Player } from './player.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { applyShot, shotFromUrl, seedFromUrl } from './shots.js';
import { makeRng } from './random.js';

export class NightGalleryGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.levelIndex = 0;
    this.levelCount = LEVELS.length;
    this.state = 'title';
    this.time = 0;
    this.elapsed = 0;
    this.toasts = [];
    this.rng = makeRng(seedFromUrl());
    this.sound = new SoundEngine();
    this.input = new Input(canvas);
    this.input.onFirstGesture = () => this.sound.ensure();
    this.renderer = new Renderer(canvas);
    this.shotName = shotFromUrl();
    this.frozen = this.shotName !== null; // screenshots stay exactly staged
    this.loadLevel(0);
    if (this.shotName) applyShot(this, this.shotName);
    this.lastFrameAt = performance.now();
    this.raf = null;
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.world = new World(LEVELS[index]);
    this.player = new Player(this.world);
    this.guards = LEVELS[index].guards.map((def) => new Guard(def, this.world));
    this.elapsed = 0;
    this.toasts = [];
  }

  maxSuspicion() {
    return this.guards.reduce((max, g) => Math.max(max, g.suspicion), 0);
  }

  addToast(text, color) {
    this.toasts.push({ text, color, at: this.time });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  start() {
    this.state = 'playing';
    this.sound.ensure();
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
    this.state = 'playing';
  }

  nextLevel() {
    if (this.levelIndex + 1 < this.levelCount) {
      this.loadLevel(this.levelIndex + 1);
      this.state = 'playing';
      this.addToast(`${this.world.name} — ${this.world.briefing}`, '#7fe0a8');
    } else {
      this.loadLevel(0);
      this.state = 'title';
    }
  }

  handleEvents(events) {
    for (const event of events) {
      if (event.type === 'loot') {
        this.sound.lootPickup();
        this.addToast('Loot pocketed.', '#ffd75e');
      } else if (event.type === 'sapphire') {
        this.sound.sapphirePickup();
        this.addToast('The Star Sapphire is yours — reach the EXIT.', '#4de3ff');
      } else if (event.type === 'coinLanded') {
        this.sound.coinPing();
        for (const guard of this.guards) guard.hearNoise(event.x, event.y);
        this.addToast('Clink... a guard heard that.', '#ffb020');
      } else if (event.type === 'spotted') {
        this.sound.spottedSting();
        this.addToast('Spotted! Break line of sight!', '#ff9d2e');
      } else if (event.type === 'alarm') {
        this.sound.alarm();
        this.addToast('ALARM! Run — and break line of sight!', '#ff5b5b');
      } else if (event.type === 'escaped') {
        this.sound.escaped();
        this.addToast('You lost them. Breathe. Keep moving.', '#7fe0a8');
      } else if (event.type === 'playerStep') {
        this.sound.playerStep(event.sneaking);
      } else if (event.type === 'guardStep') {
        const dist = Math.hypot(event.guard.x - this.player.x, event.guard.y - this.player.y);
        this.sound.guardStep(dist);
      }
    }
  }

  update(dt) {
    const events = [];
    this.player.update(dt, this.input, events);
    for (const guard of this.guards) {
      guard.justSpotted = false;
      guard.update(dt, this.player, events);
    }
    this.handleEvents(events);

    // A chasing guard that reaches the thief ends the run.
    for (const guard of this.guards) {
      if (guard.state === GUARD_STATE.CHASE) {
        const dist = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);
        if (dist < TUNING.catchDistance) {
          this.state = 'lost';
          this.sound.loseMelody();
          return;
        }
      }
    }

    // Reaching the exit with the sapphire wins the level.
    if (this.player.onExitTile()) {
      if (this.player.hasSapphire) {
        this.state = 'won';
        this.sound.winMelody();
      } else if (!this.exitWarnedAt || this.time - this.exitWarnedAt > 4) {
        this.exitWarnedAt = this.time;
        this.addToast('The exit is locked to you — take the sapphire first.', '#ffb020');
      }
    }

    // The E key or a click tosses a coin toward the mouse (or ahead).
    if (this.input.consume('KeyE') || this.input.consumeClick()) {
      const target = this.input.mouseSeen
        ? { x: this.input.mouseX, y: this.input.mouseY }
        : {
            x: this.player.x + Math.cos(this.player.facing) * 120,
            y: this.player.y + Math.sin(this.player.facing) * 120,
          };
      if (!this.player.throwCoin(target.x, target.y)) {
        this.addToast('No coins left.', '#ff9d2e');
      }
    }
    if (this.input.consume('KeyM')) {
      const muted = this.sound.toggleMute();
      this.addToast(muted ? 'Sound muted.' : 'Sound on.', '#e8ecf7');
    }
  }

  handleGlobalKeys() {
    if (this.input.consume('Enter')) {
      if (this.state === 'title') this.start();
      else if (this.state === 'won') this.nextLevel();
      else if (this.state === 'lost') this.restartLevel();
    }
    if (this.input.consume('KeyR')) {
      if (this.state !== 'title') this.restartLevel();
    }
    if (this.input.consume('KeyP') || this.input.consume('Escape')) {
      if (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'playing';
    }
    if (this.state === 'title' && this.input.consumeClick()) this.start();
  }

  frame(now) {
    const dt = Math.min((now - this.lastFrameAt) / 1000, 0.05);
    this.lastFrameAt = now;
    this.time += dt;
    this.handleGlobalKeys();
    if (this.state === 'playing' && !this.frozen) {
      this.elapsed += dt;
      this.update(dt);
    }
    this.renderer.draw(this);
  }

  run() {
    const loop = (now) => {
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // A plain snapshot of the live state, for play-testing from the console.
  snapshot() {
    return {
      state: this.state,
      level: this.levelIndex + 1,
      levelName: this.world.name,
      elapsed: Math.round(this.elapsed * 10) / 10,
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        sneaking: this.player.sneaking,
        inShadow: this.player.inShadow,
        coins: this.player.coins,
        lootTaken: this.player.lootTaken,
        hasSapphire: this.player.hasSapphire,
      },
      guards: this.guards.map((g) => ({
        x: Math.round(g.x),
        y: Math.round(g.y),
        state: g.state,
        suspicion: Math.round(g.suspicion),
        facing: Math.round(g.facing * 100) / 100,
      })),
      maxSuspicion: Math.round(this.maxSuspicion()),
      toasts: this.toasts.map((t) => t.text),
    };
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');
  const game = new NightGalleryGame(canvas);
  // A handle for play-testing: window.__nightGallery.snapshot() and friends.
  window.__nightGallery = {
    game,
    snapshot: () => game.snapshot(),
    start: () => game.start(),
    teleportPlayer: (x, y) => {
      game.player.x = x;
      game.player.y = y;
    },
    setGuard: (i, x, y, facing) => {
      const g = game.guards[i];
      g.x = x;
      g.y = y;
      if (facing !== undefined) g.facing = facing;
    },
    loadLevel: (index) => game.loadLevel(index),
    state: () => game.state,
  };
  const announce = () => {
    if (!status) return;
    status.textContent =
      game.state === 'playing'
        ? `Level ${game.levelIndex + 1}, suspicion ${Math.round(game.maxSuspicion())} percent.`
        : `Night Gallery: ${game.state}.`;
  };
  window.setInterval(announce, 1000);
  game.run();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
