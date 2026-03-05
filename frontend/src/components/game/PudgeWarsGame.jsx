import { useEffect, useRef, useCallback } from "react";
import { GameEngine } from "@/game/GameEngine";

export const PudgeWarsGame = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const rafRef = useRef(null);

  const gameLoop = useCallback(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const ctx = canvas.getContext("2d");
    engine.update();
    engine.render(ctx);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = engine.getCanvasWidth();
    canvas.height = engine.getCanvasHeight();

    // Mouse move
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      engine.onMouseMove(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
      );
    };

    // Right click - move
    const handleContextMenu = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      engine.onRightClick(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
      );
    };

    // Keyboard
    const handleKeyDown = (e) => {
      if (e.key === "q" || e.key === "Q" || e.key === "й" || e.key === "Й") {
        engine.onHook();
      }
      if (e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") {
        if (engine.isVictory()) {
          engine.onRestart();
        }
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    // Start game loop
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [gameLoop]);

  return (
    <div className="game-page" data-testid="game-page">
      <div className="game-wrapper" data-testid="game-wrapper">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          data-testid="game-canvas"
          style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        />
      </div>
    </div>
  );
};
