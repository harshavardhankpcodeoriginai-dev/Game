export type GameState = "menu" | "playing" | "paused" | "gameover" | "howto";

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  level: number;
  age: number;
  dead?: boolean;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export interface LevelDef {
  r: number;
  color: string;
  stroke: string;
  points: number;
}

export interface EngineEvents {
  onScore: (score: number) => void;
  onNext: (level: number) => void;
  onGameOver: () => void;
  onSound: (kind: "drop" | "bounce" | "merge" | "gameover") => void;
}
