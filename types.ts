
import { ReactNode } from 'react';

export type ToolMode = 'select' | 'probe' | 'measure' | 'pipette' | 'stamp';

export interface GridPoint {
  v: number;   // Velocity Magnitude
  t: number;   // Temperature
  edt: number; // Effective Draft Temperature
  turbulence: number; // Turbulence intensity (0 to ~2.0+)
}

export interface Spec {
  f0: number;
  A: number; // Neck diameter
  B: number; // Face diameter
  C: number; // Flange height (usually 16)
  D: number; // Body/Neck height (E)
  bodyHeight?: number; // Total height (E + 16)
  neckDiameter?: number; // Same as A
  min: number;
  max: number;
}

export interface ModePoint {
  vol: number;
  pa: number;
  db: number;
  throw: number;
}

export interface DiffuserMode {
  id: string;
  name: string;
  subtitle: string;
  b_text: string;
  flowType: string;
  performanceFlowType?: string;
  icon: ReactNode;
}

export interface DiffuserModel {
  id: string;
  series: string;
  name: string;
  modes: DiffuserMode[];
}

export interface SimulationParams {
  diameter: number | string;
  volume: number;
  temperature: number;
  roomTemp: number;
  modelId: string;
  modeIdx: number;
  roomHeight: number;
  roomWidth: number;
  roomLength: number;
  diffuserHeight: number;
  isCeilingMounted: boolean;
  workZoneHeight: number;
}

export interface PerformanceResult {
  v0: number;
  pressure: number;
  noise: number;
  throwDist: number;
  spec: Spec;
  error?: string | null;
  workzoneVelocity: number;
  coverageRadius: number;
  Ar?: number; // Archimedes number for buoyancy
}

export interface PlacedDiffuser {
  id: string;
  index: number;
  x: number; // meters from left
  y: number; // meters from top
  modelId: string;
  flowType: string;
  modeIdx?: number;
  diameter: number | string;
  volume: number;
  temperature: number; // Supply temperature
  performance: PerformanceResult;
  particleLimit?: number;
  bodyHeight?: number; // in meters
  neckDiameter?: number; // in meters
}

export interface SliceState {
  isActive: boolean;
  axis: 'x' | 'y'; // x = сечение вдоль оси Y (смотрит по X), y = сечение вдоль оси X (смотрит по Y)
  position: number; // Координата оси сечения в метрах
  depth: number; // Глубина видимости в метрах (толщина среза)
  direction: 1 | -1; // 1 = смотрит вправо/вниз, -1 = смотрит влево/вверх
}

export interface Probe {
  id: string;
  x: number; // Position X (meters)
  y: number; // Position Y (meters)
  z: number; // Position Z (height in meters)
}

export interface ProbeData {
  v: number;    // Velocity m/s
  t: number;    // Temperature C
  angle: number; // Flow direction in radians
  dr: number;   // Draft Rating %
}

export interface WikiContentBlock {
  type: 'text' | 'custom_formula' | 'variable_list';
  content?: string;
  render?: () => ReactNode;
  items?: { symbol: ReactNode; definition: string }[];
}

export interface WikiItem {
  id: string;
  category: string;
  title: string;
  content_blocks: WikiContentBlock[];
}

export interface NormItem {
  code: string;
  title: string;
  status: string;
  desc: string;
}

export interface SymbolItem {
  id: string;
  category: string;
  title: string;
  desc: string;
  draw: () => ReactNode;
}

export type EngineeringData = Record<string, Record<string, Record<string | number, ModePoint[]>>>;
export type SpecMap = Record<string | number, Spec>;
