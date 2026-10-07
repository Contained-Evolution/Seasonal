export type Point = readonly [number, number];

export type Shape =
  | { type: 'polygon'; points: readonly Point[] }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number };

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface StencilDefinition {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  shapes: readonly Shape[];
  attribution: string;
  minimumBridgeMm: number;
}

export interface SeasonPackManifest {
  id: string;
  title: string;
  version: string;
  palette: readonly [string, string, string];
  stencils: readonly StencilDefinition[];
}

export interface ValidationResult {
  valid: boolean;
  islandCount: number;
  weakBridgeCount: number;
  message: string;
}

export interface TransferPoint {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  sequence: number;
  row: number;
  column: number;
}

export interface TransferPlan {
  paper: 'Letter' | 'A4';
  widthMm: number;
  heightMm: number;
  gridPitchMm: number;
  points: readonly TransferPoint[];
}

export interface PumpkinProfile {
  id: string;
  label: string;
  scale: readonly [number, number, number];
  ridges: number;
}
