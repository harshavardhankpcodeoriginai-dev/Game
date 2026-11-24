import type { LevelDef } from "@/types/game";

export const WORLD_W = 420;
export const WORLD_H = 700;
export const SPAWN_Y = 56;
export const DANGER_Y = 120;
export const GAME_OVER_SECONDS = 2;
export const GRAVITY = 1500;
export const RESTITUTION = 0.15;
export const WALL_FRICTION = 0.98;
export const DROP_COOLDOWN = 0.45;

export const LEVELS: LevelDef[] = [
  { r: 16, color: "#ff6b8b", stroke: "#c43d5d", points: 10 },
  { r: 22, color: "#ffa94d", stroke: "#cc7417", points: 25 },
  { r: 29, color: "#ffd43b", stroke: "#c9a200", points: 50 },
  { r: 37, color: "#69db7c", stroke: "#2f9e44", points: 100 },
  { r: 46, color: "#38d9a9", stroke: "#0c9a72", points: 200 },
  { r: 56, color: "#4dabf7", stroke: "#1971c2", points: 400 },
  { r: 67, color: "#9775fa", stroke: "#6741d9", points: 800 },
  { r: 80, color: "#f783ac", stroke: "#c2255c", points: 1600 },
];
