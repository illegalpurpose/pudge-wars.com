"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { createGame } from "@/game/createGame";
import { CANVAS_W, CANVAS_H } from "@/game/constants";
import { Hud } from "./Hud";
import { BannerAd } from "./BannerAd";
import styles from "./GameCanvas.module.css";

export function GameCanvas() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const outerRef = useRef(null);
  const [hud, setHud] = useState(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const emitter = new Phaser.Events.EventEmitter();
    emitter.on("hud", setHud);

    const game = createGame(containerRef.current, emitter);
    gameRef.current = game;

    return () => {
      emitter.removeAllListeners();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const PADDING = 24;

    const updateScale = () => {
      const availW = window.innerWidth - PADDING * 2;
      const availH = window.innerHeight - PADDING * 2;
      const next = Math.min(availW / CANVAS_W, availH / CANVAS_H, 1);
      setScale(next > 0 ? next : 1);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className={styles.page}>
      <BannerAd className={styles.bannerLeft} />

      <div
        className={styles.wrapper}
        data-testid="game-page"
        style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
      >
        <div
          ref={outerRef}
          className={styles.stage}
          data-testid="game-canvas"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
          }}
        >
          <div ref={containerRef} />
          <Hud hud={hud} />
        </div>
      </div>

      <BannerAd className={styles.bannerRight} />
    </div>
  );
}
