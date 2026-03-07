// Pudge Wars - Game Engine
// All game logic: player, bots, hook, river, scoring

const CANVAS_W = 1000;
const CANVAS_H = 700;

const RIVER_Y = CANVAS_H / 2 - 50;
const RIVER_H = 100;

const PLAYER_RADIUS = 28;
const BOT_RADIUS = 26;
const SPRITE_SIZE_PLAYER = 64;
const SPRITE_SIZE_BOT = 56;
const PUDGE_SPRITE_URL = "/pudge_sprite.png";
const HOOK_SPRITE_URL = "/hook_sprite.png";
const HOOK_SPRITE_SIZE = 72;
const HOOK_RADIUS = 16;
const HOOK_SPEED = 12;
const HOOK_RETURN_SPEED = 14;
const HOOK_MAX_DIST = 500;
const PLAYER_SPEED = 3.5;
const BOT_SPEED = 1.2;
const BOT_HOOK_SPEED = 10;
const BOT_HOOK_RETURN_SPEED = 12;
const BOT_HOOK_COOLDOWN_MIN = 150;
const BOT_HOOK_COOLDOWN_MAX = 350;
const COL_BOT_HOOK = "#FF6644";
const COL_BOT_HOOK_CHAIN = "rgba(255,100,68,0.6)";

const BOT_COUNT = 4;

// Colors
const COL_GRASS_TOP = "#2d5a1e";
const COL_GRASS_BOT = "#3a7a28";
const COL_RIVER = "#1a3a5c";
const COL_RIVER_LIGHT = "#254d73";
const COL_PLAYER = "#00FFCC";
const COL_PLAYER_GLOW = "rgba(0,255,204,0.25)";
const COL_BOT = "#FF0033";
const COL_BOT_GLOW = "rgba(255,0,51,0.25)";
const COL_HOOK = "#FFFFFF";
const COL_HOOK_CHAIN = "rgba(255,255,255,0.6)";

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

class Bot {
  constructor() {
    this.respawn();
  }

  respawn() {
    // Bots spawn in the top area above the river
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
    // Bot hook state
    this.hook = {
      x: 0, y: 0,
      vx: 0, vy: 0,
      state: HOOK_IDLE,
      startX: 0, startY: 0,
      grabbedPlayer: false,
    };
    this.hookCooldown = randomInRange(BOT_HOOK_COOLDOWN_MIN, BOT_HOOK_COOLDOWN_MAX);
  }

  pickNewTarget() {
    this.targetX = randomInRange(BOT_RADIUS + 20, CANVAS_W - BOT_RADIUS - 20);
    this.targetY = randomInRange(BOT_RADIUS + 20, RIVER_Y - BOT_RADIUS - 20);
    this.moveTimer = randomInRange(80, 200);
    this.pauseTimer = 0;
  }

  update(dt) {
    if (this.hooked || !this.alive) return;
    // Block movement while bot hook is active
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

    // Clamp to top area
    this.x = clamp(this.x, BOT_RADIUS, CANVAS_W - BOT_RADIUS);
    this.y = clamp(this.y, BOT_RADIUS, RIVER_Y - BOT_RADIUS);
  }
}

// Hook states
const HOOK_IDLE = 0;
const HOOK_FLYING = 1;
const HOOK_RETURNING = 2;
const HOOK_DRAGGING = 3;

export class GameEngine {
  constructor() {
    // Generate pixel grass tile patterns
    this.grassPatternTop = null;
    this.grassPatternBot = null;
    this._generateGrassPatterns();

    // Load sprite
    this.spriteLoaded = false;
    this.sprite = new Image();
    this.sprite.crossOrigin = "anonymous";
    this.sprite.onload = () => { this.spriteLoaded = true; };
    this.sprite.src = PUDGE_SPRITE_URL;

    // Create red-tinted sprite for bots (off-screen canvas)
    this.botSprite = null;
    this.sprite.onload = () => {
      this.spriteLoaded = true;
      // Create red-tinted version using hue-rotate + saturate
      const offCanvas = document.createElement("canvas");
      offCanvas.width = this.sprite.width;
      offCanvas.height = this.sprite.height;
      const offCtx = offCanvas.getContext("2d");
      // Apply red shift via filter
      offCtx.filter = "hue-rotate(-30deg) saturate(2.5) brightness(0.85)";
      offCtx.drawImage(this.sprite, 0, 0);
      offCtx.filter = "none";
      this.botSprite = offCanvas;
    };

    // Load hook sprite
    this.hookSpriteLoaded = false;
    this.hookSprite = new Image();
    this.hookSprite.onload = () => { this.hookSpriteLoaded = true; };
    this.hookSprite.src = HOOK_SPRITE_URL;

    // Load ability icons
    this.iconHook = new Image();
    this.iconHookLoaded = false;
    this.iconHook.onload = () => { this.iconHookLoaded = true; };
    this.iconHook.src = "/icon_hook.png";

    this.iconBlink = new Image();
    this.iconBlinkLoaded = false;
    this.iconBlink.onload = () => { this.iconBlinkLoaded = true; };
    this.iconBlink.src = "/icon_blink.png";

    this.iconInvis = new Image();
    this.iconInvisLoaded = false;
    this.iconInvis.onload = () => { this.iconInvisLoaded = true; };
    this.iconInvis.src = "/icon_invis.png";

    // Load chain link sprite
    this.chainSprite = new Image();
    this.chainSpriteLoaded = false;
    this.chainSprite.onload = () => { this.chainSpriteLoaded = true; };
    this.chainSprite.src = "/chain_link.png";

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

  // --- Input handlers ---
  onMouseMove(canvasX, canvasY) {
    this.mouseX = canvasX;
    this.mouseY = canvasY;
  }

  onRightClick(canvasX, canvasY) {
    if (this.gameOver) return;
    if (this.invisible) return;
    if (this.hook.state !== HOOK_IDLE) return;
    if (this.playerBeingDragged) return;
    // Set player move target (bottom half only, can't cross river)
    const minY = RIVER_Y + RIVER_H + this.player.radius;
    const tx = clamp(canvasX, this.player.radius, CANVAS_W - this.player.radius);
    const ty = clamp(canvasY, minY, CANVAS_H - this.player.radius);
    this.player.targetX = tx;
    this.player.targetY = ty;

    // Spawn click animation at target location
    this.clickEffects.push({
      x: tx,
      y: ty,
      timer: 20,      // total lifetime in frames (at 60fps)
      maxTimer: 20,
    });
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
    // Face toward hook direction
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

    // Calculate blink destination (capped at maxDist)
    const blinkDist = Math.min(d, maxDist);
    let newX = p.x + (dx / d) * blinkDist;
    let newY = p.y + (dy / d) * blinkDist;

    // Clamp to player area (below river, within canvas)
    const minY = RIVER_Y + RIVER_H + p.radius;
    newX = clamp(newX, p.radius, CANVAS_W - p.radius);
    newY = clamp(newY, minY, CANVAS_H - p.radius);

    // Save old position for effect
    const oldX = p.x;
    const oldY = p.y;

    // Teleport
    p.x = newX;
    p.y = newY;
    p.targetX = newX;
    p.targetY = newY;
    p.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;

    // Cooldown (frames) — blocks hook usage
    this.blinkCooldown = 30;

    // Visual effect
    this.blinkEffect = { fromX: oldX, fromY: oldY, toX: newX, toY: newY, timer: 20 };
  }

  onInvisible() {
    if (this.gameOver) return;
    if (this.playerBeingDragged) return;
    if (this.invisibleCooldown > 0) return;
    if (this.invisible) return;

    this.invisible = true;
    this.invisibleTimer = 90; // ~1.5 sec at 60fps
    this.invisibleCooldown = 600; // ~10 sec cooldown at 60fps
  }

  // --- Update ---
  update(dt) {
    if (this.gameOver) return;

    if (this.blinkCooldown > 0) this.blinkCooldown -= dt;
    if (this.blinkEffect) {
      this.blinkEffect.timer -= dt;
      if (this.blinkEffect.timer <= 0) this.blinkEffect = null;
    }

    // Invisibility timers
    if (this.invisibleCooldown > 0) this.invisibleCooldown -= dt;
    if (this.invisible) {
      this.invisibleTimer -= dt;
      if (this.invisibleTimer <= 0) {
        this.invisible = false;
        this.invisibleTimer = 0;
      }
    }

    // Safety: fix orphaned hooked bots (hooked but nobody is dragging them)
    const draggedBot = this.hook.state === HOOK_DRAGGING ? this.hook.grabbedBot : null;
    for (const bot of this.bots) {
      if (bot.hooked && bot !== draggedBot) {
        bot.hooked = false;
      }
    }

    this.updatePlayer(dt);
    this.updateHook(dt);
    this.updateBots(dt);
    this.updateClickEffects(dt);
  }

  updateClickEffects(dt) {
    for (let i = this.clickEffects.length - 1; i >= 0; i--) {
      this.clickEffects[i].timer -= dt;
      if (this.clickEffects[i].timer <= 0) {
        this.clickEffects.splice(i, 1);
      }
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    // Block movement while phased out or hook is active
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
    // Enforce bounds (below river)
    const minY = RIVER_Y + RIVER_H + p.radius;
    p.x = clamp(p.x, p.radius, CANVAS_W - p.radius);
    p.y = clamp(p.y, minY, CANVAS_H - p.radius);
  }

  updateHook(dt) {
    const h = this.hook;

    if (h.state === HOOK_FLYING) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      // Check max distance
      const d = dist(h, { x: h.startX, y: h.startY });
      if (d >= HOOK_MAX_DIST) {
        h.state = HOOK_RETURNING;
      }

      // Check if out of canvas
      if (h.x < 0 || h.x > CANVAS_W || h.y < 0 || h.y > CANVAS_H) {
        h.state = HOOK_RETURNING;
      }

      // Check collision with bots
      for (const bot of this.bots) {
        if (!bot.alive || bot.hooked) continue;
        if (dist(h, bot) < HOOK_RADIUS + bot.radius) {
          bot.hooked = true;
          // Reset bot's own hook
          bot.hook.state = HOOK_IDLE;
          bot.hook.grabbedPlayer = false;
          // If player was being dragged by another bot, cancel that drag
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
      // Move hook back to player
      const dx = this.player.x - h.x;
      const dy = this.player.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 10) {
        // Bot captured!
        bot.alive = false;
        bot.hooked = false;
        h.grabbedBot = null;
        h.state = HOOK_IDLE;
        this.score++;
        // Respawn bot — game continues infinitely
        bot.respawn();
        bot.alive = true;
      } else {
        h.x += (dx / d) * HOOK_RETURN_SPEED * dt;
        h.y += (dy / d) * HOOK_RETURN_SPEED * dt;
        // Drag bot along
        bot.x = h.x;
        bot.y = h.y;
      }
    }
  }

  updateBots(dt) {
    // Check if any bot already has an active hook
    const anyBotHooking = this.bots.some(b => b.alive && b.hook.state !== HOOK_IDLE);

    for (const bot of this.bots) {
      bot.update(dt);
      if (bot.alive && !bot.hooked) {
        if (this.playerBeingDragged && bot.hook.state === HOOK_IDLE) continue;
        // Only allow this bot to fire if no other bot is hooking
        if (anyBotHooking && bot.hook.state === HOOK_IDLE) continue;
        this.updateBotHook(bot, dt);
      }
    }
  }

  updateBotHook(bot, dt) {
    const h = bot.hook;

    // Cooldown & fire logic
    if (h.state === HOOK_IDLE) {
      if (this.playerBeingDragged) return;
      bot.hookCooldown -= dt;
      if (bot.hookCooldown <= 0) {
        // Fire hook toward player
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
          // Face toward player when hooking
          bot.lastAngle = Math.atan2(dy, dx) - Math.PI / 2;
        }
        bot.hookCooldown = randomInRange(BOT_HOOK_COOLDOWN_MIN, BOT_HOOK_COOLDOWN_MAX);
      }
      return;
    }

    if (h.state === HOOK_FLYING) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;

      // Max distance
      const d = dist(h, { x: h.startX, y: h.startY });
      if (d >= HOOK_MAX_DIST) {
        h.state = HOOK_RETURNING;
      }
      // Out of canvas
      if (h.x < 0 || h.x > CANVAS_W || h.y < 0 || h.y > CANVAS_H) {
        h.state = HOOK_RETURNING;
      }
      // Hit player? (not if player is invisible)
      if (!this.invisible && dist(h, this.player) < HOOK_RADIUS + this.player.radius) {
        h.grabbedPlayer = true;
        h.state = HOOK_DRAGGING;
        this.playerBeingDragged = true;
        // Release any bot the player was dragging
        if (this.hook.grabbedBot) {
          this.hook.grabbedBot.hooked = false;
        }
        // Reset player's own hook
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
      // Drag player toward bot
      const dx = bot.x - h.x;
      const dy = bot.y - h.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 15) {
        // Player caught by bot — GAME OVER!
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
        // Drag player along
        this.player.x = h.x;
        this.player.y = h.y;
      }
    }
  }

  // --- Rendering ---
  render(ctx) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.drawGround(ctx);
    this.drawRiver(ctx);
    this.drawClickEffects(ctx);
    this.drawBotHooks(ctx);
    this.drawBots(ctx);
    this.drawHook(ctx);
    this.drawPlayer(ctx);
    this.drawBlinkEffect(ctx);
    this.drawHUD(ctx);

    if (this.victory) {
      this.drawVictory(ctx);
    }
    if (this.defeat) {
      this.drawDefeat(ctx);
    }
  }

  drawClickEffects(ctx) {
    for (const e of this.clickEffects) {
      const progress = 1 - (e.timer / e.maxTimer); // 0 -> 1
      const alpha = 1 - progress; // fade out

      // Expanding outer ring
      const outerR = 6 + progress * 14;
      ctx.beginPath();
      ctx.arc(e.x, e.y, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,255,204,${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner shrinking dot
      const innerR = 3 * (1 - progress);
      if (innerR > 0.5) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, innerR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,204,${alpha * 0.9})`;
        ctx.fill();
      }

      // Small cross lines
      const crossSize = 5 + progress * 3;
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = COL_PLAYER;
      ctx.lineWidth = 1;
      // horizontal
      ctx.beginPath();
      ctx.moveTo(e.x - crossSize, e.y);
      ctx.lineTo(e.x - crossSize + 3, e.y);
      ctx.moveTo(e.x + crossSize - 3, e.y);
      ctx.lineTo(e.x + crossSize, e.y);
      // vertical
      ctx.moveTo(e.x, e.y - crossSize);
      ctx.lineTo(e.x, e.y - crossSize + 3);
      ctx.moveTo(e.x, e.y + crossSize - 3);
      ctx.lineTo(e.x, e.y + crossSize);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawChain(ctx, fromX, fromY, toX, toY, tint) {
    if (!this.chainSpriteLoaded) {
      // Fallback: dashed line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = tint || COL_HOOK_CHAIN;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    const dx = toX - fromX;
    const dy = toY - fromY;
    const chainLen = Math.sqrt(dx * dx + dy * dy);
    if (chainLen < 2) return;

    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const linkSize = 18; // size of each chain link on screen
    const step = linkSize * 0.75; // overlap links slightly
    const count = Math.floor(chainLen / step);

    ctx.save();
    if (tint) {
      ctx.globalAlpha = 0.85;
    }
    for (let i = 0; i <= count; i++) {
      const t = (i * step) / chainLen;
      if (t > 1) break;
      const cx = fromX + dx * t;
      const cy = fromY + dy * t;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.drawImage(this.chainSprite, -linkSize / 2, -linkSize / 2, linkSize, linkSize);
      ctx.restore();
    }
    ctx.restore();
  }

  drawBotHooks(ctx) {
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const h = bot.hook;
      if (h.state === HOOK_IDLE) continue;

      // Chain from bot to hook (sprite-based)
      this.drawChain(ctx, bot.x, bot.y, h.x, h.y, COL_BOT_HOOK_CHAIN);

      // Hook head sprite
      this.drawHookSprite(ctx, h.x, h.y, bot.x, bot.y);

      // Glow
      ctx.beginPath();
      ctx.arc(h.x, h.y, HOOK_RADIUS + 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,100,68,0.2)";
      ctx.fill();
    }
  }

  _generateGrassPatterns() {
    this.grassPatternTop = this._createGrassTile(
      [45, 90, 30],   // base RGB (dark green)
      [35, 75, 22],   // dark shade
      [55, 110, 38],  // mid shade
      [65, 130, 45],  // light blade
      [40, 80, 28]    // shadow
    );
    this.grassPatternBot = this._createGrassTile(
      [58, 122, 40],  // base RGB (lighter green)
      [48, 105, 32],  // dark shade
      [68, 140, 48],  // mid shade
      [80, 160, 55],  // light blade
      [52, 110, 36]   // shadow
    );
  }

  _createGrassTile(base, dark, mid, light, shadow) {
    const SIZE = 32;
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;
    const g = c.getContext("2d");

    // Fill base color
    g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    g.fillRect(0, 0, SIZE, SIZE);

    // Seeded random for consistent pattern
    const rand = (x, y, seed) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
      return n - Math.floor(n);
    };

    // Scatter darker earth/shadow pixels
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const r = rand(x, y, 1);
        if (r < 0.12) {
          g.fillStyle = `rgb(${dark[0]},${dark[1]},${dark[2]})`;
          g.fillRect(x, y, 1, 1);
        } else if (r < 0.22) {
          g.fillStyle = `rgb(${shadow[0]},${shadow[1]},${shadow[2]})`;
          g.fillRect(x, y, 1, 1);
        } else if (r < 0.35) {
          g.fillStyle = `rgb(${mid[0]},${mid[1]},${mid[2]})`;
          g.fillRect(x, y, 1, 1);
        }
      }
    }

    // Draw grass blade tufts (small 1-3px tall vertical lines)
    for (let i = 0; i < 18; i++) {
      const bx = Math.floor(rand(i, 0, 7) * SIZE);
      const by = Math.floor(rand(0, i, 13) * SIZE);
      const h = 1 + Math.floor(rand(i, i, 3) * 3); // blade height 1-3px
      const shade = rand(i, i, 99) < 0.5 ? light : mid;
      g.fillStyle = `rgb(${shade[0]},${shade[1]},${shade[2]})`;
      g.fillRect(bx, by, 1, h);
    }

    // Draw small grass clumps (2x2 or 2x1 clusters)
    for (let i = 0; i < 8; i++) {
      const cx = Math.floor(rand(i, 5, 21) * (SIZE - 2));
      const cy = Math.floor(rand(5, i, 37) * (SIZE - 2));
      g.fillStyle = `rgb(${light[0]},${light[1]},${light[2]})`;
      g.fillRect(cx, cy, 2, 1);
      g.fillStyle = `rgb(${mid[0]},${mid[1]},${mid[2]})`;
      g.fillRect(cx, cy + 1, 1, 1);
    }

    // Add tiny highlight dots
    for (let i = 0; i < 6; i++) {
      const hx = Math.floor(rand(i, 9, 53) * SIZE);
      const hy = Math.floor(rand(9, i, 71) * SIZE);
      g.fillStyle = `rgba(${light[0] + 30},${light[1] + 30},${light[2] + 20},0.6)`;
      g.fillRect(hx, hy, 1, 1);
    }

    return c;
  }

  drawGround(ctx) {
    // Top grass (bot area) — pixel tile pattern
    if (this.grassPatternTop) {
      const pat = ctx.createPattern(this.grassPatternTop, "repeat");
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, CANVAS_W, RIVER_Y);
    } else {
      ctx.fillStyle = COL_GRASS_TOP;
      ctx.fillRect(0, 0, CANVAS_W, RIVER_Y);
    }

    // Bottom grass (player area) — pixel tile pattern
    if (this.grassPatternBot) {
      const pat = ctx.createPattern(this.grassPatternBot, "repeat");
      ctx.fillStyle = pat;
      ctx.fillRect(0, RIVER_Y + RIVER_H, CANVAS_W, CANVAS_H - RIVER_Y - RIVER_H);
    } else {
      ctx.fillStyle = COL_GRASS_BOT;
      ctx.fillRect(0, RIVER_Y + RIVER_H, CANVAS_W, CANVAS_H - RIVER_Y - RIVER_H);
    }

    // Subtle grid overlay for Dota-style ground feel
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }
  }

  drawRiver(ctx) {
    // Main river body
    ctx.fillStyle = COL_RIVER;
    ctx.fillRect(0, RIVER_Y, CANVAS_W, RIVER_H);

    // Light ripple effect
    ctx.fillStyle = COL_RIVER_LIGHT;
    const time = Date.now() * 0.001;
    for (let i = 0; i < 6; i++) {
      const rippleX = ((time * 30 + i * 180) % (CANVAS_W + 100)) - 50;
      const rippleY = RIVER_Y + 20 + Math.sin(time + i) * 15;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.ellipse(rippleX, rippleY, 60, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // River borders
    ctx.strokeStyle = "rgba(100,160,220,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, RIVER_Y);
    ctx.lineTo(CANVAS_W, RIVER_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, RIVER_Y + RIVER_H);
    ctx.lineTo(CANVAS_W, RIVER_Y + RIVER_H);
    ctx.stroke();
  }

  drawSprite(ctx, img, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  drawPlayer(ctx) {
    const p = this.player;

    // Phased out: player removed from world, show only ethereal marker
    if (this.invisible) {
      const pulse = 0.3 + Math.sin(Date.now() * 0.01) * 0.15;
      // Swirling particles at player position
      ctx.save();
      const time = Date.now() * 0.003;
      for (let i = 0; i < 6; i++) {
        const angle = time + (i * Math.PI * 2) / 6;
        const r = 12 + Math.sin(time * 2 + i) * 5;
        const px = p.x + Math.cos(angle) * r;
        const py = p.y + Math.sin(angle) * r;
        ctx.globalAlpha = pulse * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#4A9EFF";
        ctx.fill();
      }
      // Center glow
      ctx.globalAlpha = pulse * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(74,158,255,0.3)";
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }

    // Glow under sprite
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = COL_PLAYER_GLOW;
    ctx.fill();

    if (this.spriteLoaded) {
      this.drawSprite(ctx, this.sprite, p.x, p.y, SPRITE_SIZE_PLAYER, p.lastAngle);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = COL_PLAYER;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawBots(ctx) {
    for (const bot of this.bots) {
      if (!bot.alive) continue;

      // Red glow under sprite
      ctx.beginPath();
      ctx.arc(bot.x, bot.y, bot.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = COL_BOT_GLOW;
      ctx.fill();

      if (this.spriteLoaded && this.botSprite) {
        this.drawSprite(ctx, this.botSprite, bot.x, bot.y, SPRITE_SIZE_BOT, bot.lastAngle);
      } else {
        // Fallback circle
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.fillStyle = COL_BOT;
        ctx.fill();
      }
    }
  }

  drawHookSprite(ctx, x, y, fromX, fromY) {
    if (this.hookSpriteLoaded) {
      ctx.save();
      ctx.translate(x, y);
      // Rotate hook to face direction of travel
      const angle = Math.atan2(y - fromY, x - fromX) + Math.PI / 2;
      ctx.rotate(angle);
      ctx.drawImage(this.hookSprite, -HOOK_SPRITE_SIZE / 2, -HOOK_SPRITE_SIZE / 2, HOOK_SPRITE_SIZE, HOOK_SPRITE_SIZE);
      ctx.restore();
    } else {
      // Fallback circle
      ctx.beginPath();
      ctx.arc(x, y, HOOK_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COL_HOOK;
      ctx.fill();
    }
  }

  drawHook(ctx) {
    const h = this.hook;
    if (h.state === HOOK_IDLE) return;

    // Chain from player to hook (sprite-based)
    this.drawChain(ctx, this.player.x, this.player.y, h.x, h.y);

    // Hook head sprite
    this.drawHookSprite(ctx, h.x, h.y, this.player.x, this.player.y);
  }

  drawBlinkEffect(ctx) {
    if (!this.blinkEffect) return;
    const e = this.blinkEffect;
    const alpha = e.timer / 20;

    // Ghost at old position
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(e.fromX, e.fromY, PLAYER_RADIUS + 5, 0, Math.PI * 2);
    ctx.fillStyle = COL_PLAYER;
    ctx.fill();

    // Trail line
    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.moveTo(e.fromX, e.fromY);
    ctx.lineTo(e.toX, e.toY);
    ctx.strokeStyle = COL_PLAYER;
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
  }


  drawHUD(ctx) {
    // Score in top-left
    ctx.font = "bold 22px 'Rajdhani', sans-serif";
    ctx.fillStyle = COL_PLAYER;
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 20, 34);

    // Record next to score
    ctx.font = "bold 18px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Record: ${this.record}`, 170, 34);

    // Ability bar — bottom-left
    const barX = 16;
    const barY = CANVAS_H - 86;
    const boxSize = 68;
    const gap = 10;

    // Q — Hook
    const hookReady = this.hook.state === HOOK_IDLE && this.blinkCooldown <= 0 && !this.playerBeingDragged;
    this.drawAbilityBox(ctx, barX, barY, boxSize, "Q", hookReady, COL_PLAYER, this.iconHookLoaded ? this.iconHook : null);

    // W — Blink
    const blinkReady = this.blinkCooldown <= 0 && this.hook.state === HOOK_IDLE && !this.playerBeingDragged;
    this.drawAbilityBox(ctx, barX + boxSize + gap, barY, boxSize, "W", blinkReady, "#9B59FF", this.iconBlinkLoaded ? this.iconBlink : null);

    // E — Invisibility
    const invisReady = this.invisibleCooldown <= 0 && !this.invisible && !this.playerBeingDragged;
    this.drawAbilityBox(ctx, barX + (boxSize + gap) * 2, barY, boxSize, "E", invisReady, "#4A9EFF", this.iconInvisLoaded ? this.iconInvis : null, this.invisible ? this.invisibleTimer / 90 : null, this.invisibleCooldown > 0 ? this.invisibleCooldown / 600 : null);
  }

  drawAbilityBox(ctx, x, y, size, key, ready, color, icon, activeRatio, cooldownRatio) {
    // Background
    ctx.fillStyle = ready ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.5)";
    ctx.strokeStyle = ready ? color : "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();
    ctx.stroke();

    // Cooldown sweep overlay (clock-like wipe)
    if (cooldownRatio && cooldownRatio > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 6);
      ctx.clip();
      // Fill from bottom up based on remaining cooldown
      const fillH = size * cooldownRatio;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, y, size, size - (size - fillH));
      ctx.restore();
    } else if (!ready && !activeRatio) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 6);
      ctx.fill();
    }

    // Active glow border when ability is active
    if (activeRatio && activeRatio > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Active timer bar at bottom
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, y + size - 5, (size - 4) * activeRatio, 3);
    }

    // Icon
    if (icon) {
      ctx.save();
      ctx.globalAlpha = ready || activeRatio ? 1 : 0.35;
      const pad = 4;
      const iconSize = size - pad * 2;
      ctx.drawImage(icon, x + pad, y + pad, iconSize, iconSize);
      ctx.restore();
    }

    // Key letter — small badge top-left
    ctx.font = "bold 16px 'Rajdhani', sans-serif";
    ctx.fillStyle = ready || activeRatio ? color : "#555";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(key, x + 4, y + 2);
    ctx.textBaseline = "alphabetic";
  }

  drawVictory(ctx) {
    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Victory text
    ctx.font = "bold 60px 'Rajdhani', sans-serif";
    ctx.fillStyle = COL_PLAYER;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,255,204,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillText("VICTORY!", CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.shadowBlur = 0;

    // Restart prompt
    ctx.font = "500 24px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("Press R to Restart", CANVAS_W / 2, CANVAS_H / 2 + 30);
  }

  drawDefeat(ctx) {
    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Game Over text
    ctx.font = "bold 60px 'Rajdhani', sans-serif";
    ctx.fillStyle = COL_BOT;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(255,0,51,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 50);
    ctx.shadowBlur = 0;

    // Score display
    ctx.font = "bold 36px 'Rajdhani', sans-serif";
    ctx.fillStyle = COL_PLAYER;
    ctx.shadowColor = "rgba(0,255,204,0.4)";
    ctx.shadowBlur = 15;
    ctx.fillText(`Hooks landed: ${this.score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
    ctx.shadowBlur = 0;

    // Restart prompt
    ctx.font = "500 24px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("Press R to Restart", CANVAS_W / 2, CANVAS_H / 2 + 60);
  }

  getCanvasWidth() { return CANVAS_W; }
  getCanvasHeight() { return CANVAS_H; }
  getScore() { return this.score; }
  isVictory() { return this.victory; }
  isDefeat() { return this.defeat; }
  isGameOver() { return this.gameOver; }
}
