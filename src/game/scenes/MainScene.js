import * as Phaser from "phaser";
import { GameState } from "../GameState";
import {
  CANVAS_W,
  CANVAS_H,
  RIVER_Y,
  RIVER_H,
  SPRITE_SIZE_PLAYER,
  SPRITE_SIZE_BOT,
  HOOK_SPRITE_SIZE,
  HOOK_IDLE,
  BOT_COUNT,
  COLORS,
} from "../constants";

const TARGET_FRAME_MS = 1000 / 60;
const CHAIN_LINK_SIZE = 18;
const CHAIN_STEP = CHAIN_LINK_SIZE * 0.75;
const MAX_CHAIN_LINKS = Math.ceil(500 / CHAIN_STEP) + 1;

export class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  preload() {
    this.load.image("pudge", "/pudge_sprite.png");
    this.load.image("hook", "/hook_sprite.png");
    this.load.image("chain", "/chain_link.png");
  }

  _generateGrassTexture(key, base, dark, mid, light, shadow) {
    const SIZE = 32;
    const tex = this.textures.createCanvas(key, SIZE, SIZE);
    const g = tex.getContext();

    g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    g.fillRect(0, 0, SIZE, SIZE);

    const rand = (x, y, seed) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43758.5453) * 43758.5453;
      return n - Math.floor(n);
    };

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

    for (let i = 0; i < 18; i++) {
      const bx = Math.floor(rand(i, 0, 7) * SIZE);
      const by = Math.floor(rand(0, i, 13) * SIZE);
      const h = 1 + Math.floor(rand(i, i, 3) * 3);
      const shade = rand(i, i, 99) < 0.5 ? light : mid;
      g.fillStyle = `rgb(${shade[0]},${shade[1]},${shade[2]})`;
      g.fillRect(bx, by, 1, h);
    }

    for (let i = 0; i < 8; i++) {
      const cx = Math.floor(rand(i, 5, 21) * (SIZE - 2));
      const cy = Math.floor(rand(5, i, 37) * (SIZE - 2));
      g.fillStyle = `rgb(${light[0]},${light[1]},${light[2]})`;
      g.fillRect(cx, cy, 2, 1);
      g.fillStyle = `rgb(${mid[0]},${mid[1]},${mid[2]})`;
      g.fillRect(cx, cy + 1, 1, 1);
    }

    for (let i = 0; i < 6; i++) {
      const hx = Math.floor(rand(i, 9, 53) * SIZE);
      const hy = Math.floor(rand(9, i, 71) * SIZE);
      g.fillStyle = `rgba(${light[0] + 30},${light[1] + 30},${light[2] + 20},0.6)`;
      g.fillRect(hx, hy, 1, 1);
    }

    tex.refresh();
  }

  _createChainPool(tint) {
    const pool = [];
    for (let i = 0; i < MAX_CHAIN_LINKS; i++) {
      const link = this.add.image(0, 0, "chain").setVisible(false);
      link.setDisplaySize(CHAIN_LINK_SIZE, CHAIN_LINK_SIZE);
      if (tint) link.setTint(tint);
      pool.push(link);
    }
    return pool;
  }

  _drawChain(pool, fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) {
      pool.forEach((l) => l.setVisible(false));
      return;
    }
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const count = Math.min(Math.floor(len / CHAIN_STEP), pool.length - 1);
    for (let i = 0; i < pool.length; i++) {
      if (i > count) {
        pool[i].setVisible(false);
        continue;
      }
      const t = (i * CHAIN_STEP) / len;
      pool[i].setVisible(true);
      pool[i].setPosition(fromX + dx * t, fromY + dy * t);
      pool[i].setRotation(angle);
    }
  }

  create() {
    this.emitter = this.registry.get("emitter");
    this.state = new GameState();

    this._generateGrassTexture(
      "grassTop",
      [45, 90, 30],
      [35, 75, 22],
      [55, 110, 38],
      [65, 130, 45],
      [40, 80, 28],
    );
    this._generateGrassTexture(
      "grassBot",
      [58, 122, 40],
      [48, 105, 32],
      [68, 140, 48],
      [80, 160, 55],
      [52, 110, 36],
    );

    this._buildGround();
    this._buildRiver();

    this.clickFx = this.add.graphics();
    this.blinkFx = this.add.graphics();
    this.invisFx = this.add.graphics();

    this.chainPool = this._createChainPool();
    this.botChainPool = this._createChainPool(0xff6644);

    this.hookSprite = this.add.image(0, 0, "hook").setVisible(false);
    this.hookSprite.setDisplaySize(HOOK_SPRITE_SIZE, HOOK_SPRITE_SIZE);

    this.botHookSprite = this.add.image(0, 0, "hook").setVisible(false);
    this.botHookSprite.setDisplaySize(HOOK_SPRITE_SIZE, HOOK_SPRITE_SIZE);
    this.botHookSprite.setTint(0xff6644);

    this.playerGlow = this.add.circle(0, 0, 38, COLORS.playerGlow, 0.25);
    this.playerSprite = this.add.image(0, 0, "pudge");
    this.playerSprite.setDisplaySize(SPRITE_SIZE_PLAYER, SPRITE_SIZE_PLAYER);

    this.botSprites = [];
    this.botGlows = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      const glow = this.add.circle(0, 0, 34, COLORS.botGlow, 0.25);
      const spr = this.add.image(0, 0, "pudge");
      spr.setDisplaySize(SPRITE_SIZE_BOT, SPRITE_SIZE_BOT);
      spr.setTint(0xff5533);
      this.botGlows.push(glow);
      this.botSprites.push(spr);
    }

    this.input.mouse?.disableContextMenu();

    this.input.on("pointermove", (pointer) => {
      this.state.onMouseMove(pointer.x, pointer.y);
    });

    this.input.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown()) {
        this.state.onRightClick(pointer.x, pointer.y);
      }
    });

    const keys = this.input.keyboard.addKeys({
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });
    keys.q.on("down", () => this.state.onHook());
    keys.w.on("down", () => this.state.onBlink());
    keys.e.on("down", () => this.state.onInvisible());
    keys.r.on("down", () => {
      if (this.state.gameOver) this.state.onRestart();
    });

    this.emitter?.emit("hud", this.state.getHudSnapshot());
  }

  _buildGround() {
    const top = this.add.tileSprite(0, 0, CANVAS_W, RIVER_Y, "grassTop");
    top.setOrigin(0, 0);

    const bottom = this.add.tileSprite(
      0,
      RIVER_Y + RIVER_H,
      CANVAS_W,
      CANVAS_H - RIVER_Y - RIVER_H,
      "grassBot",
    );
    bottom.setOrigin(0, 0);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x000000, 0.06);
    for (let x = 0; x < CANVAS_W; x += 32) {
      grid.lineBetween(x, 0, x, CANVAS_H);
    }
    for (let y = 0; y < CANVAS_H; y += 32) {
      grid.lineBetween(0, y, CANVAS_W, y);
    }
  }

  _buildRiver() {
    this.riverRect = this.add.rectangle(
      0,
      RIVER_Y,
      CANVAS_W,
      RIVER_H,
      COLORS.river,
    );
    this.riverRect.setOrigin(0, 0);

    this.rippleGfx = this.add.graphics();

    const border = this.add.graphics();
    border.lineStyle(2, 0x64a0dc, 0.3);
    border.lineBetween(0, RIVER_Y, CANVAS_W, RIVER_Y);
    border.lineBetween(0, RIVER_Y + RIVER_H, CANVAS_W, RIVER_Y + RIVER_H);
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / TARGET_FRAME_MS, 3);
    const prevGameOver = this.state.gameOver;
    this.state.update(dt);

    this._drawRipples(time);
    this._syncPlayer();
    this._syncBots();
    this._syncHook();
    this._syncBotHooks();
    this._drawClickEffects();
    this._drawBlinkEffect();

    this.emitter?.emit("hud", this.state.getHudSnapshot());
    if (this.state.gameOver && !prevGameOver) {
      this.emitter?.emit("gameover", this.state.getHudSnapshot());
    }
  }

  _drawRipples(time) {
    this.rippleGfx.clear();
    this.rippleGfx.fillStyle(COLORS.riverLight, 0.15);
    const t = time * 0.001;
    for (let i = 0; i < 6; i++) {
      const rippleX = ((t * 30 + i * 180) % (CANVAS_W + 100)) - 50;
      const rippleY = RIVER_Y + 20 + Math.sin(t + i) * 15;
      this.rippleGfx.fillEllipse(rippleX, rippleY, 120, 8);
    }
  }

  _syncPlayer() {
    const p = this.state.player;
    const visible = !this.state.invisible;
    this.playerSprite.setVisible(visible);
    this.playerGlow.setVisible(visible);

    this.invisFx.clear();
    if (!visible) {
      const t = performance.now() * 0.003;
      this.invisFx.fillStyle(0x4a9eff, 0.5);
      for (let i = 0; i < 6; i++) {
        const angle = t + (i * Math.PI * 2) / 6;
        const r = 12 + Math.sin(t * 2 + i) * 5;
        this.invisFx.fillCircle(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r, 2);
      }
      this.invisFx.fillStyle(0x4a9eff, 0.25);
      this.invisFx.fillCircle(p.x, p.y, p.radius);
      return;
    }

    this.playerSprite.setPosition(p.x, p.y);
    this.playerSprite.setRotation(p.lastAngle);
    this.playerGlow.setPosition(p.x, p.y);
  }

  _syncBots() {
    this.state.bots.forEach((bot, i) => {
      const spr = this.botSprites[i];
      const glow = this.botGlows[i];
      spr.setVisible(bot.alive);
      glow.setVisible(bot.alive);
      if (!bot.alive) return;
      spr.setPosition(bot.x, bot.y);
      spr.setRotation(bot.lastAngle);
      glow.setPosition(bot.x, bot.y);
    });
  }

  _syncHook() {
    const h = this.state.hook;
    if (h.state === HOOK_IDLE) {
      this.hookSprite.setVisible(false);
      this.chainPool.forEach((l) => l.setVisible(false));
      return;
    }
    const p = this.state.player;
    this.hookSprite.setVisible(true);
    this.hookSprite.setPosition(h.x, h.y);
    this.hookSprite.setRotation(Math.atan2(h.y - p.y, h.x - p.x) + Math.PI / 2);

    this._drawChain(this.chainPool, p.x, p.y, h.x, h.y);
  }

  _syncBotHooks() {
    let anyVisible = false;
    for (const bot of this.state.bots) {
      if (!bot.alive) continue;
      const h = bot.hook;
      if (h.state === HOOK_IDLE) continue;
      anyVisible = true;
      this._drawChain(this.botChainPool, bot.x, bot.y, h.x, h.y);
      this.botHookSprite.setVisible(true);
      this.botHookSprite.setPosition(h.x, h.y);
      this.botHookSprite.setRotation(
        Math.atan2(h.y - bot.y, h.x - bot.x) + Math.PI / 2,
      );
    }
    if (!anyVisible) {
      this.botHookSprite.setVisible(false);
      this.botChainPool.forEach((l) => l.setVisible(false));
    }
  }

  _drawClickEffects() {
    this.clickFx.clear();
    for (const e of this.state.clickEffects) {
      const progress = 1 - e.timer / e.maxTimer;
      const alpha = 1 - progress;
      const outerR = 6 + progress * 14;
      this.clickFx.lineStyle(2, 0x00ffcc, alpha * 0.7);
      this.clickFx.strokeCircle(e.x, e.y, outerR);
      const innerR = 3 * (1 - progress);
      if (innerR > 0.5) {
        this.clickFx.fillStyle(0x00ffcc, alpha * 0.9);
        this.clickFx.fillCircle(e.x, e.y, innerR);
      }
    }
  }

  _drawBlinkEffect() {
    this.blinkFx.clear();
    const e = this.state.blinkEffect;
    if (!e) return;
    const alpha = e.timer / 20;
    this.blinkFx.fillStyle(0x00ffcc, alpha * 0.5);
    this.blinkFx.fillCircle(e.fromX, e.fromY, 33);
    this.blinkFx.lineStyle(4, 0x00ffcc, alpha * 0.3);
    this.blinkFx.lineBetween(e.fromX, e.fromY, e.toX, e.toY);
  }
}
