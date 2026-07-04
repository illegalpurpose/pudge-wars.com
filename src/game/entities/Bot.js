import {
  CANVAS_W,
  RIVER_Y,
  BOT_RADIUS,
  HOOK_IDLE,
  BOT_SPEED,
  BOT_HOOK_COOLDOWN_MIN,
  BOT_HOOK_COOLDOWN_MAX,
  clamp,
  randomInRange,
} from "../constants";

export class Bot {
  constructor() {
    this.respawn();
  }

  respawn() {
    this.x = randomInRange(BOT_RADIUS + 20, CANVAS_W - BOT_RADIUS - 20);
    this.y = randomInRange(BOT_RADIUS + 20, RIVER_Y - BOT_RADIUS - 20);
    this.radius = BOT_RADIUS;
    this.targetX = this.x;
    this.targetY = this.y;
    this.moveTimer = 0;
    this.pauseTimer = randomInRange(40, 100);
    this.hooked = false;
    this.alive = true;
    this.lastAngle = 0;
    this.hook = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      state: HOOK_IDLE,
      startX: 0,
      startY: 0,
      grabbedPlayer: false,
    };
    this.hookCooldown = randomInRange(
      BOT_HOOK_COOLDOWN_MIN,
      BOT_HOOK_COOLDOWN_MAX,
    );
  }

  pickNewTarget() {
    this.targetX = randomInRange(BOT_RADIUS + 20, CANVAS_W - BOT_RADIUS - 20);
    this.targetY = randomInRange(BOT_RADIUS + 20, RIVER_Y - BOT_RADIUS - 20);
    this.moveTimer = randomInRange(80, 200);
    this.pauseTimer = 0;
  }

  update(dt) {
    if (this.hooked || !this.alive) return;
    if (this.hook.state !== HOOK_IDLE) return;

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.pickNewTarget();
      }
      return;
    }

    if (this.moveTimer > 0) {
      this.moveTimer -= dt;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 2) {
        this.x += (dx / d) * BOT_SPEED * dt;
        this.y += (dy / d) * BOT_SPEED * dt;
        this.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;
      }
      if (this.moveTimer <= 0) {
        this.pauseTimer = randomInRange(40, 120);
      }
    }

    this.x = clamp(this.x, BOT_RADIUS, CANVAS_W - BOT_RADIUS);
    this.y = clamp(this.y, BOT_RADIUS, RIVER_Y - BOT_RADIUS);
  }
}
