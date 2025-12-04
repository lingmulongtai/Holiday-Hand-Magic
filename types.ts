export enum AppMode {
  SCATTER = 'SCATTER',
  FORM = 'FORM'
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  color?: [number, number, number]; // RGB 0-1
}

export interface ShapeDefinition {
  id: string;
  name: string;
  points: Point3D[];
  color?: string; // Fallback color
  description: string;
}

export type ShapeGenerator = (count: number) => Point3D[];