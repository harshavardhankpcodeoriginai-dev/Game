import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@/types/game";
import { Engine } from "@/game/engine";
import { render } from "@/game/render";
import { LEVELS, WORLD_H, WORLD_W } from "@/game/constants";
import { useGameLoop } from "@/hooks/useGameLoop";
import { loadBool, loadNumber, save } from "@/utils/storage";
import { playSound, type SoundKind } from "@/utils/sound";

export function BallDropGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [next, setNext] = useState(0);
  const [sound, setSound] = useState(true);
  const [newBest, setNewBest] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const bestRef = useRef(0);
  const aimingRef = useRef(false);
  const keys = useRef({ left: false, right: false });

  const sfx = (k: SoundKind) => soundRef.current && playSound(k);

  const engineRef = useRef<Engine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new Engine({
      onScore: (s) => {
        setScore(s);
        if (s > bestRef.current) {
          if (bestRef.current > 0 && !newBestRef.current) sfx("best");
          if (bestRef.current > 0) { newBestRef.current = true; setNewBest(true); }
          bestRef.current = s;
          setBest(s);
          save("bestScore", s);
        }
      },
      onNext: setNext,
      onGameOver: () => setState("gameover"),
      onSound: (k) => sfx(k),
    });
  }
  const newBestRef = useRef(false);

  useEffect(() => {
    const b = loadNumber("bestScore");
    bestRef.current = b;
    setBest(b);
    setSound(loadBool("soundEnabled", true));
  }, []);

  // Canvas crisp sizing.
  useEffect(() => {
    const c = canvasRef.current!;
    const fit = () => {
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useGameLoop((dt, t) => {
    const e = engineRef.current!;
    const c = canvasRef.current;
    if (!c) return;
    if (stateRef.current === "playing") {
      const k = keys.current;
      if (k.left || k.right) e.setAim(e.aimX + (k.right ? 1 : -1) * 380 * Math.min(dt, 0.05));
      e.update(dt);
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(c.width / WORLD_W, 0, 0, c.height / WORLD_H, 0, 0);
    render(ctx, e, aimingRef.current || stateRef.current === "playing", t);
  });

  const start = useCallback(() => {
    engineRef.current!.reset();
    newBestRef.current = false;
    setNewBest(false);
    setState("playing");
  }, []);

  const togglePause = useCallback(() => {
    setState((s) => (s === "playing" ? "paused" : s === "paused" ? "playing" : s));
  }, []);

  const toggleSound = () => {
    setSound((v) => { save("soundEnabled", !v); return !v; });
  };

  // Keyboard
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (k === "p" || k === "escape") return togglePause();
      if (stateRef.current !== "playing") return;
      if (k === "arrowleft" || k === "a") keys.current.left = true;
      else if (k === "arrowright" || k === "d") keys.current.right = true;
      else if (k === " ") { ev.preventDefault(); engineRef.current!.drop(); }
    };
    const up = (ev: KeyboardEvent) => {
      const k = ev.key.toLowerCase();
      if (k === "arrowleft" || k === "a") keys.current.left = false;
      if (k === "arrowright" || k === "d") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [togglePause]);

  const toWorldX = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * WORLD_W;
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (stateRef.current !== "playing") return;
    engineRef.current!.setAim(toWorldX(ev.clientX));
  };
  const onPointerDown = (ev: React.PointerEvent) => {
    if (stateRef.current !== "playing") return;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    aimingRef.current = true;
    engineRef.current!.setAim(toWorldX(ev.clientX));
  };
  const onPointerUp = (ev: React.PointerEvent) => {
    if (stateRef.current !== "playing" || !aimingRef.current) return;
    aimingRef.current = false;
    engineRef.current!.setAim(toWorldX(ev.clientX));
    engineRef.current!.drop();
  };

  return (
    <div className="game-shell">
      <header className="game-hud">
        <div className="hud-stat"><span>Score</span><strong>{score}</strong></div>
        <div className="hud-stat"><span>Best</span><strong>{best}</strong></div>
        <button
          className="game-btn game-btn-icon"
          onClick={togglePause}
          disabled={state !== "playing" && state !== "paused"}
          aria-label="Pause"
        >
          {state === "paused" ? "▶" : "❚❚"}
        </button>
      </header>

      <div className="game-board">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (aimingRef.current = false)}
        />
        {newBest && state === "playing" && <div className="new-best-badge">NEW BEST!</div>}

        {state === "menu" && (
          <div className="game-overlay">
            <h1 className="game-title">BALL DROP<br />MERGE</h1>
            <p className="game-tagline">Drop • Merge • Grow</p>
            <button className="game-btn game-btn-primary" onClick={start}>PLAY</button>
            <button className="game-btn" onClick={() => setState("howto")}>HOW TO PLAY</button>
            <button className="game-btn" onClick={toggleSound}>Sound {sound ? "ON" : "OFF"}</button>
          </div>
        )}

        {state === "howto" && (
          <div className="game-overlay">
            <h2 className="game-subtitle">How to play</h2>
            <ul className="howto-list">
              <li>Move to aim — mouse, drag, or ← → / A D</li>
              <li>Click, release or Space to drop</li>
              <li>Two equal balls merge into a bigger one</li>
              <li>Don't let balls rest in the red zone for 2s</li>
              <li>P to pause</li>
            </ul>
            <button className="game-btn game-btn-primary" onClick={() => setState("menu")}>BACK</button>
          </div>
        )}

        {state === "paused" && (
          <div className="game-overlay">
            <h2 className="game-subtitle">Paused</h2>
            <button className="game-btn game-btn-primary" onClick={togglePause}>RESUME</button>
            <button className="game-btn" onClick={start}>RESTART</button>
            <button className="game-btn" onClick={toggleSound}>Sound {sound ? "ON" : "OFF"}</button>
          </div>
        )}

        {state === "gameover" && (
          <div className="game-overlay">
            <h2 className="game-subtitle">GAME OVER</h2>
            {newBest && <p className="new-best-text">NEW BEST!</p>}
            <p className="final-score">Score <strong>{score}</strong></p>
            <p className="final-best">Best {best}</p>
            <button className="game-btn game-btn-primary" onClick={start}>PLAY AGAIN</button>
            <button className="game-btn" onClick={() => setState("menu")}>MENU</button>
          </div>
        )}
      </div>

      <footer className="game-footer">
        <span>Next</span>
        <span
          className="next-ball"
          style={{
            background: LEVELS[next]!.color,
            borderColor: LEVELS[next]!.stroke,
            width: 18 + next * 6,
            height: 18 + next * 6,
          }}
        >
          {next + 1}
        </span>
      </footer>
    </div>
  );
}
