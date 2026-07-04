export const CANVAS_W = 1000;
export const CANVAS_H = 700;

export const RIVER_Y = CANVAS_H / 2 - 50;
export const RIVER_H = 100;

export const PLAYER_RADIUS = 28;
export const BOT_RADIUS = 26;
export const SPRITE_SIZE_PLAYER = 64;
export const SPRITE_SIZE_BOT = 56;

export const HOOK_RADIUS = 16;
export const HOOK_SPRITE_SIZE = 72;
export const HOOK_SPEED = 12;
export const HOOK_RETURN_SPEED = 14;
export const HOOK_MAX_DIST = 500;
export const PLAYER_SPEED = 3.5;
export const BOT_SPEED = 1.2;
export const BOT_HOOK_SPEED = 10;
export const BOT_HOOK_RETURN_SPEED = 12;
export const BOT_HOOK_COOLDOWN_MIN = 150;
export const BOT_HOOK_COOLDOWN_MAX = 350;

export const BOT_COUNT = 4;

export const BLINK_COOLDOWN_FRAMES = 30;
export const INVISIBLE_DURATION_FRAMES = 90;
export const INVISIBLE_COOLDOWN_FRAMES = 600;

export const HOOK_IDLE = "idle";
export const HOOK_FLYING = "flying";
export const HOOK_RETURNING = "returning";
export const HOOK_DRAGGING = "dragging";

export const COLORS = {
  playerGlow: 0x00ffcc,
  botGlow: 0xff0033,
  hookChain: 0xffffff,
  botHookChain: 0xff6644,
  river: 0x1a3a5c,
  riverLight: 0x254d73,
  grassTop: 0x2d5a1e,
  grassBot: 0x3a7a28,
};

export function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}
