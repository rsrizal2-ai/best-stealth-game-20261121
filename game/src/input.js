// input.js — keyboard and mouse state. WASD or arrows to move, Shift to
// sneak, E or a click to toss a distraction coin, R to restart, P or Esc
// to pause, M to mute. Also converts a mouse click into world coordinates
// (the canvas is scaled to fit the window).
import { HUD_HEIGHT } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseSeen = false;
    this.pressed = new Set(); // keys pressed since the last consume
    this.clicked = false;
    this.onFirstGesture = null;
    this.attach();
  }

  attach() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.onFirstGesture?.();
      this.pressed.add(e.code);
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sneak = true;
          break;
        default:
          break;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sneak = false;
          break;
        default:
          break;
      }
    });
    window.addEventListener('blur', () => {
      this.up = this.down = this.left = this.right = this.sneak = false;
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.toWorld(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.mouseSeen = true;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      this.onFirstGesture?.();
      const pos = this.toWorld(e.clientX, e.clientY);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.mouseSeen = true;
      this.clicked = true;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Canvas pixel -> world pixel, accounting for the CSS scaling and the
  // HUD strip at the top of the canvas.
  toWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY - HUD_HEIGHT,
    };
  }

  // True once when a key was pressed since the last check.
  consume(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeClick() {
    if (this.clicked) {
      this.clicked = false;
      return true;
    }
    return false;
  }
}
