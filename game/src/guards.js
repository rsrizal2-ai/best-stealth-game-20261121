// guards.js — guard patrol AI, vision cones and the suspicion system.
// A guard walks its waypoints, watches a cone in front of it, grows
// suspicious when it can see the thief, investigates a glimpse, and chases
// on a full alarm. A thrown coin pulls nearby guards to the noise.
import { TUNING, TILE } from './config.js';
import { tileCenter } from './world.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  PAUSE: 'pause',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
};

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def, world) {
    this.world = world;
    this.waypoints = def.waypoints.map(([c, r]) => tileCenter(c, r));
    this.pauseDuration = def.pause ?? TUNING.guardWaypointPause;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.waypointIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.pauseLeft = 0;
    this.suspicion = 0;
    this.lastSeen = null; // {x, y} of the thief's last spotted position
    this.investigateTarget = null;
    this.investigateLeft = 0;
    this.outOfSightFor = 0;
    this.stepPhase = 0;
    this.justSpotted = false; // set for one frame when suspicion crosses 60
    this.id = Guard.nextId++;
    this.detour = 0; // seconds left of a perpendicular detour around cover
    this.detourDir = 1;
  }

  // Can this guard see the thief right now? Returns a visibility factor
  // from 0 (cannot see) to about 1.2 (close, running, in the light).
  visibilityOf(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > TUNING.guardVisionRange) return 0;
    const angleToPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angleToPlayer, this.facing)) > TUNING.guardVisionHalfAngle) return 0;
    if (!this.world.hasLineOfSight(this.x, this.y, player.x, player.y)) return 0;
    let factor = 1 - (dist / TUNING.guardVisionRange) * 0.4;
    if (player.sneaking) factor *= 0.5;
    if (player.inShadow) factor *= 0.4;
    if (player.movingFast) factor *= 1.2;
    return factor;
  }

  hearNoise(x, y) {
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist > TUNING.coinHearingRadius) return;
    if (this.state === GUARD_STATE.CHASE) return;
    this.investigateTarget = { x, y };
    this.investigateLeft = TUNING.guardInvestigateSeconds;
    if (this.state !== GUARD_STATE.INVESTIGATE) {
      this.state = GUARD_STATE.INVESTIGATE;
    }
    if (this.suspicion < 40) this.suspicion = 40;
  }

  update(dt, player, events) {
    const seen = this.visibilityOf(player);
    const wasSuspicion = this.suspicion;
    if (seen > 0) {
      this.suspicion += TUNING.suspicionGainPerSecond * seen * dt;
      this.lastSeen = { x: player.x, y: player.y };
      this.outOfSightFor = 0;
      if (wasSuspicion < 60 && this.suspicion >= 60) {
        this.justSpotted = true;
        events.push({ type: 'spotted', guard: this });
      }
    } else {
      const decay = player.inShadow
        ? TUNING.suspicionShadowDecayPerSecond
        : TUNING.suspicionDecayPerSecond;
      this.suspicion -= decay * dt;
      this.outOfSightFor += dt;
    }
    if (this.suspicion < 0) this.suspicion = 0;
    if (this.suspicion > 100) this.suspicion = 100;

    if (this.suspicion >= TUNING.suspicionAlarmAt && this.state !== GUARD_STATE.CHASE) {
      this.state = GUARD_STATE.CHASE;
      this.outOfSightFor = 0;
      events.push({ type: 'alarm', guard: this });
    }

    if (this.state === GUARD_STATE.CHASE) {
      if (this.outOfSightFor > TUNING.chaseGiveUpSeconds) {
        this.state = GUARD_STATE.PATROL;
        this.suspicion = 45;
        this.lastSeen = null;
        events.push({ type: 'escaped', guard: this });
      } else if (this.lastSeen) {
        this.moveToward(this.lastSeen.x, this.lastSeen.y, TUNING.guardChaseSpeed, dt);
      }
    } else if (this.state === GUARD_STATE.INVESTIGATE) {
      this.investigateLeft -= dt;
      if (this.investigateTarget) {
        const arrived = this.moveToward(
          this.investigateTarget.x,
          this.investigateTarget.y,
          TUNING.guardInvestigateSpeed,
          dt,
        );
        if (arrived || this.investigateLeft <= 0) {
          this.state = GUARD_STATE.PATROL;
          this.investigateTarget = null;
          // Resume from the nearest waypoint so the patrol stays sane.
          this.waypointIndex = this.nearestWaypointIndex();
        }
      }
    } else if (this.state === GUARD_STATE.PAUSE) {
      this.pauseLeft -= dt;
      if (this.pauseLeft <= 0) this.state = GUARD_STATE.PATROL;
    } else {
      const target = this.waypoints[this.waypointIndex];
      const arrived = this.moveToward(target.x, target.y, TUNING.guardPatrolSpeed, dt);
      if (arrived) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
        this.state = GUARD_STATE.PAUSE;
        this.pauseLeft = this.pauseDuration;
      }
    }

    // Footstep ticks while walking, for the audio engine to hear.
    if (this.state !== GUARD_STATE.PAUSE) {
      const speed =
        this.state === GUARD_STATE.CHASE
          ? TUNING.guardChaseSpeed
          : this.state === GUARD_STATE.INVESTIGATE
            ? TUNING.guardInvestigateSpeed
            : TUNING.guardPatrolSpeed;
      this.stepPhase += (dt * speed) / 26;
      if (this.stepPhase >= 1) {
        this.stepPhase -= 1;
        events.push({ type: 'guardStep', guard: this });
      }
    }
  }

  nearestWaypointIndex() {
    let best = 0;
    let bestDist = Infinity;
    this.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - this.x, w.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  // Walk toward a point, sliding around cover. Returns true when arrived.
  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(speed * dt, dist);
    const nx = (dx / dist) * step;
    const ny = (dy / dist) * step;
    const before = { x: this.x, y: this.y };
    const moved = this.world.moveCircle(this.x, this.y, nx, ny, 13);
    this.x = moved.x;
    this.y = moved.y;
    const actuallyMoved = Math.hypot(this.x - before.x, this.y - before.y);
    if (actuallyMoved > 0.5) {
      this.facing = Math.atan2(this.y - before.y, this.x - before.x);
      this.detour = 0;
      return dist - actuallyMoved < 4;
    }
    // Blocked by cover: sidestep perpendicular for a short while.
    if (this.detour <= 0) {
      this.detour = 0.5;
      this.detourDir = Math.random() < 0.5 ? 1 : -1;
    }
    this.detour -= dt;
    const px = -Math.sin(this.facing) * this.detourDir * speed * dt;
    const py = Math.cos(this.facing) * this.detourDir * speed * dt;
    const sidestep = this.world.moveCircle(this.x, this.y, px, py, 13);
    this.x = sidestep.x;
    this.y = sidestep.y;
    return false;
  }

  // Cone colour and sweep for the renderer.
  coneColor() {
    if (this.state === GUARD_STATE.CHASE) return 'rgba(255, 64, 64, 0.30)';
    if (this.suspicion >= TUNING.suspicionInvestigateAt) return 'rgba(255, 176, 32, 0.26)';
    return 'rgba(255, 232, 130, 0.20)';
  }
}
Guard.nextId = 1;
