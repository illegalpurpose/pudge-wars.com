import { useEffect, useRef, useCallback } from "react";
import { GameEngine } from "@/game/GameEngine";

const TARGET_FRAME_MS = 1000 / 60; // 60fps target

export const PudgeWarsGame = () => {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const rafRef = useRef(null);
    const lastTimeRef = useRef(null);

    const gameLoop = useCallback((currentTime) => {
        const engine = engineRef.current;
        const canvas = canvasRef.current;
        if (!engine || !canvas) return;

        // Calculate normalized delta time (1.0 = one frame at 60fps)
        if (lastTimeRef.current === null) {
            lastTimeRef.current = currentTime;
        }
        const elapsed = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;
        // Normalize: dt=1.0 at 60fps, dt=2.0 at 30fps, dt=0.5 at 120fps
        const dt = Math.min(elapsed / TARGET_FRAME_MS, 3); // cap at 3 to avoid huge jumps

        const ctx = canvas.getContext("2d");
        engine.update(dt);
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
                (e.clientY - rect.top) * scaleY,
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
                (e.clientY - rect.top) * scaleY,
            );
        };

        // Keyboard
        const handleKeyDown = (e) => {
            if (
                e.key === "q" ||
                e.key === "Q" ||
                e.key === "й" ||
                e.key === "Й"
            ) {
                engine.onHook();
            }
            if (
                e.key === "w" ||
                e.key === "W" ||
                e.key === "ц" ||
                e.key === "Ц"
            ) {
                engine.onBlink();
            }
            if (
                e.key === "r" ||
                e.key === "R" ||
                e.key === "к" ||
                e.key === "К"
            ) {
                if (engine.isGameOver()) {
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
                <div
                    id="yandex_rtb_R-A-18862906-2"
                    style={{
                        position: "relative",
                        backgroundColor: "black",
                        width: "100%",
                        minWidth: "160px",
                        maxWidth: "300px",
                        height: "100vh",
                    }}
                ></div>
                <canvas
                    ref={canvasRef}
                    className="game-canvas"
                    data-testid="game-canvas"
                    style={{ maxWidth: "100vw", maxHeight: "100vh" }}
                />
                <div
                    id="yandex_rtb_R-A-18862906-3"
                    style={{
                        position: "relative",
                        backgroundColor: "black",
                        width: "100%",
                        minWidth: "160px",
                        maxWidth: "300px",
                        height: "100vh",
                    }}
                ></div>
            </div>
        </div>
    );
};
