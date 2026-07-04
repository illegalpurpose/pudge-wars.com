import * as Phaser from "phaser";
import { MainScene } from "./scenes/MainScene";
import { CANVAS_W, CANVAS_H } from "./constants";

export function createGame(parent, emitter) {
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    width: CANVAS_W,
    height: CANVAS_H,
    parent,
    backgroundColor: "#050505",
    scene: [MainScene],
    fps: { target: 60 },
  });
  game.registry.set("emitter", emitter);
  return game;
}
