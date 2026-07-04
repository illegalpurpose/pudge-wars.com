import { Bot } from "./entities/Bot";
import {
  CANVAS_W,
  CANVAS_H,
  RIVER_Y,
  RIVER_H,
  PLAYER_RADIUS,
  HOOK_RADIUS,
  HOOK_SPEED,
  HOOK_RETURN_SPEED,
  HOOK_MAX_DIST,
  PLAYER_SPEED,
  BOT_HOOK_SPEED,
  BOT_HOOK_RETURN_SPEED,
  BOT_HOOK_COOLDOWN_MIN,
  BOT_HOOK_COOLDOWN_MAX,
  BOT_COUNT,
  BLINK_COOLDOWN_FRAMES,
  INVISIBLE_DURATION_FRAMES,
  INVISIBLE_COOLDOWN_FRAMES,
  HOOK_IDLE,
  HOOK_FLYING,
  HOOK_RETURNING,
  HOOK_DRAGGING,
  dist,
  clamp,
  randomInRange,
} from "./constants";

/**
 * Pure game-logic/state container — no rendering, no DOM/canvas access.
 * MainScene reads this each frame to sync Phaser GameObjects.
 */
export class GameState {
  constructor() {
    this.record = 0;
    this.reset();
  }

  reset() {
    this.player = {
      x: CANVAS_W / 2,
      y: CANVAS_H - 80,
      radius: PLAYER_RADIUS,
      targetX: CANVAS_W / 2,
      targetY: CANVAS_H - 80,
      lastAngle: Math.PI,
    };

    this.hook = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      state: HOOK_IDLE,
      startX: 0,
      startY: 0,
      grabbedBot: null,
    };

    this.bots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      this.bots.push(new Bot());
    }

    this.score = 0;
    this.victory = false;
    this.defeat = false;
    this.gameOver = false;
    this.mouseX = CANVAS_W / 2;
    this.mouseY = 0;
    this.playerBeingDragged = false;
    this.blinkCooldown = 0;
    this.blinkEffect = null;
    this.clickEffects = [];
    this.invisible = false;
    this.invisibleTimer = 0;
    this.invisibleCooldown = 0;
  }

  onMouseMove(x, y) {
    this.mouseX = x;
    this.mouseY = y;
  }

  onRightClick(x, y) {
    if (this.gameOver) return;
    if (this.invisible) return;
    if (this.hook.state !== HOOK_IDLE) return;
    if (this.playerBeingDragged) return;

    const minY = RIVER_Y + RIVER_H + this.player.radius;
    const tx = clamp(x, this.player.radius, CANVAS_W - this.player.radius);
    const ty = clamp(y, minY, CANVAS_H - this.player.radius);
    this.player.targetX = tx;
    this.player.targetY = ty;

    this.clickEffects.push({ x: tx, y: ty, timer: 20, maxTimer: 20 });
  }

  onHook() {
    if (this.gameOver) return;
    if (this.invisible) return;
    if (this.hook.state !== HOOK_IDLE) return;
    if (this.playerBeingDragged) return;
    if (this.blinkCooldown > 0) return;

    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return;

    this.hook.state = HOOK_FLYING;
    this.hook.x = this.player.x;
    this.hook.y = this.player.y;
    this.hook.startX = this.player.x;
    this.hook.startY = this.player.y;
    this.hook.vx = (dx / d) * HOOK_SPEED;
    this.hook.vy = (dy / d) * HOOK_SPEED;
    this.hook.grabbedBot = null;
    this.player.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;
  }

  onRestart() {
    this.reset();
  }

  onBlink() {
    if (this.gameOver) return;
    if (this.invisible) return;
    if (this.hook.state !== HOOK_IDLE) return;
    if (this.playerBeingDragged) return;
    if (this.blinkCooldown > 0) return;

    const p = this.player;
    const maxDist = HOOK_MAX_DIST / 2;
    const dx = this.mouseX - p.x;
    const dy = this.mouseY - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 5) return;

    const blinkDist = Math.min(d, maxDist);
    let newX = p.x + (dx / d) * blinkDist;
    let newY = p.y + (dy / d) * blinkDist;

    const minY = RIVER_Y + RIVER_H + p.radius;
    newX = clamp(newX, p.radius, CANVAS_W - p.radius);
    newY = clamp(newY, minY, CANVAS_H - p.radius);

    const oldX = p.x;
    const oldY = p.y;

    p.x = newX;
    p.y = newY;
    p.targetX = newX;
    p.targetY = newY;
    p.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;

    this.blinkCooldown = BLINK_COOLDOWN_FRAMES;
    this.blinkEffect = { fromX: oldX, fromY: oldY, toX: newX, toY: newY, timer: 20 };
  }

  onInvisible() {
    if (this.gameOver) return;
    if (this.playerBeingDragged) return;
    if (this.invisibleCooldown > 0) return;
    if (this.invisible) return;

    this.invisible = true;
    this.invisibleTimer = INVISIBLE_DURATION_FRAMES;
    this.invisibleCooldown = INVISIBLE_COOLDOWN_FRAMES;
  }

  update(dt) {
    if (this.gameOver) return;

    if (this.blinkCooldown > 0) this.blinkCooldown -= dt;
    if (this.blinkEffect) {
      this.blinkEffect.timer -= dt;
      if (this.blinkEffect.timer <= 0) this.blinkEffect = null;
    }

    if (this.invisibleCooldown > 0) this.invisibleCooldown -= dt;
    if (this.invisible) {
      this.invisibleTimer -= dt;
      if (this.invisibleTimer <= 0) {
        this.invisible = false;
        this.invisibleTimer = 0;
      }
    }

    const draggedBot = this.hook.state === HOOK_DRAGGING ? this.hook.grabbedBot : null;
    for (const bot of this.bots) {
      if (bot.hooked && bot !== draggedBot) {
        bot.hooked = false;
      }
    }

    this._updatePlayer(dt);
    this._updateHook(dt);
    this._updateBots(dt);
    this._updateClickEffects(dt);
  }

  _updateClickEffects(dt) {
    for (let i = this.clickEffects.length - 1; i >= 0; i--) {
      this.clickEffects[i].timer -= dt;
      if (this.clickEffects[i].timer <= 0) {
        this.clickEffects.splice(i, 1);
      }
    }
  }

  _updatePlayer(dt) {
    const p = this.player;
    if (this.invisible) return;
    if (this.hook.state !== HOOK_IDLE) return;
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 2) {
      p.x += (dx / d) * PLAYER_SPEED * dt;
      p.y += (dy / d) * PLAYER_SPEED * dt;
      p.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;
    }
    const minY = RIVER_Y + RIVER_H + p.radius;
    p.x = clamp(p.x, p.radius, CANVAS_W - p.radius);
    p.y = clamp(p.y, minY, CANVAS_H - p.radius);
  }

  _updateHook(dt) {
    const h = this.hook;

    if (h.state === HOOK_FLYING) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      const d = dist(h, { x: h.startX, y: h.startY });
      if (d >= HOOK_MAX_DIST) {
        h.state = HOOK_RETURNING;
      }

      if (h.x < 0 || h.x > CANVAS_W || h.y < 0 || h.y > CANVAS_H) {
        h.state = HOOK_RETURNING;
      }

      for (const bot of this.bots) {
        if (!bot.alive || bot.hooked) continue;
        if (dist(h, bot) < HOOK_RADIUS + bot.radius) {
          bot.hooked = true;
          bot.hook.state = HOOK_IDLE;
          bot.hook.grabbedPlayer = false;
          if (this.playerBeingDragged) {
            for (const b of this.bots) {
              if (b.hook.grabbedPlayer) {
                b.hook.grabbedPlayer = false;
                b.hook.state = HOOK_IDLE;
              }
            }
            this.playerBeingDragged = false;
          }
          h.grabbedBot = bot;
          h.state = HOOK_DRAGGING;
          break;
        }
      }
    }

    if (h.state === HOOK_RETURNING) {
      const dx = this.player.x - h.x;
      const dy = this.player.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 10) {
        h.state = HOOK_IDLE;
      } else {
        h.x += (dx / d) * HOOK_RETURN_SPEED * dt;
        h.y += (dy / d) * HOOK_RETURN_SPEED * dt;
      }
    }

    if (h.state === HOOK_DRAGGING) {
      const bot = h.grabbedBot;
      const dx = this.player.x - h.x;
      const dy = this.player.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 10) {
        bot.alive = false;
        bot.hooked = false;
        h.grabbedBot = null;
        h.state = HOOK_IDLE;
        this.score++;
        bot.respawn();
        bot.alive = true;
      } else {
        h.x += (dx / d) * HOOK_RETURN_SPEED * dt;
        h.y += (dy / d) * HOOK_RETURN_SPEED * dt;
        bot.x = h.x;
        bot.y = h.y;
      }
    }
  }

  _updateBots(dt) {
    const anyBotHooking = this.bots.some(
      (b) => b.alive && b.hook.state !== HOOK_IDLE,
    );

    for (const bot of this.bots) {
      bot.update(dt);
      if (bot.alive && !bot.hooked) {
        if (this.playerBeingDragged && bot.hook.state === HOOK_IDLE) continue;
        if (anyBotHooking && bot.hook.state === HOOK_IDLE) continue;
        this._updateBotHook(bot, dt);
      }
    }
  }

  _updateBotHook(bot, dt) {
    const h = bot.hook;

    if (h.state === HOOK_IDLE) {
      if (this.playerBeingDragged) return;
      bot.hookCooldown -= dt;
      if (bot.hookCooldown <= 0) {
        const dx = this.player.x - bot.x;
        const dy = this.player.y - bot.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) {
          h.state = HOOK_FLYING;
          h.x = bot.x;
          h.y = bot.y;
          h.startX = bot.x;
          h.startY = bot.y;
          h.vx = (dx / d) * BOT_HOOK_SPEED;
          h.vy = (dy / d) * BOT_HOOK_SPEED;
          h.grabbedPlayer = false;
          bot.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;
        }
        bot.hookCooldown = randomInRange(
          BOT_HOOK_COOLDOWN_MIN,
          BOT_HOOK_COOLDOWN_MAX,
        );
      }
      return;
    }

    if (h.state === HOOK_FLYING) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      const d = dist(h, { x: h.startX, y: h.startY });
      if (d >= HOOK_MAX_DIST) {
        h.state = HOOK_RETURNING;
      }
      if (h.x < 0 || h.x > CANVAS_W || h.y < 0 || h.y > CANVAS_H) {
        h.state = HOOK_RETURNING;
      }
      if (!this.invisible && dist(h, this.player) < HOOK_RADIUS + this.player.radius) {
        h.grabbedPlayer = true;
        h.state = HOOK_DRAGGING;
        this.playerBeingDragged = true;
        if (this.hook.grabbedBot) {
          this.hook.grabbedBot.hooked = false;
        }
        this.hook.state = HOOK_IDLE;
        this.hook.grabbedBot = null;
      }
    }

    if (h.state === HOOK_RETURNING) {
      const dx = bot.x - h.x;
      const dy = bot.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 10) {
        h.state = HOOK_IDLE;
      } else {
        h.x += (dx / d) * BOT_HOOK_RETURN_SPEED * dt;
        h.y += (dy / d) * BOT_HOOK_RETURN_SPEED * dt;
      }
    }

    if (h.state === HOOK_DRAGGING) {
      const dx = bot.x - h.x;
      const dy = bot.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 15) {
        this.defeat = true;
        this.gameOver = true;
        if (this.score > this.record) {
          this.record = this.score;
        }
        h.grabbedPlayer = false;
        h.state = HOOK_IDLE;
        this.playerBeingDragged = false;
      } else {
        h.x += (dx / d) * BOT_HOOK_RETURN_SPEED * dt;
        h.y += (dy / d) * BOT_HOOK_RETURN_SPEED * dt;
        this.player.x = h.x;
        this.player.y = h.y;
      }
    }
  }

  getHudSnapshot() {
    return {
      score: this.score,
      record: this.record,
      gameOver: this.gameOver,
      defeat: this.defeat,
      victory: this.victory,
      hookReady:
        this.hook.state === HOOK_IDLE &&
        this.blinkCooldown <= 0 &&
        !this.playerBeingDragged,
      blinkReady:
        this.blinkCooldown <= 0 &&
        this.hook.state === HOOK_IDLE &&
        !this.playerBeingDragged,
      invisReady:
        this.invisibleCooldown <= 0 &&
        !this.invisible &&
        !this.playerBeingDragged,
      invisible: this.invisible,
      invisibleActiveRatio: this.invisible
        ? this.invisibleTimer / INVISIBLE_DURATION_FRAMES
        : 0,
      invisibleCooldownRatio:
        this.invisibleCooldown > 0
          ? this.invisibleCooldown / INVISIBLE_COOLDOWN_FRAMES
          : 0,
    };
  }
}
