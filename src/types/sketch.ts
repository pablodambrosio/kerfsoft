import type { JointType, Vector2D } from './cad';

export interface SketchVertex {
  id: string;
  x: number;
  y: number;
}

export interface EdgeJointSettings {
  enabled: boolean;
  type: JointType;
  isMale: boolean;
  fingerWidth: number;
}

export interface SketchEdge {
  id: string;
  startVertexId: string;
  endVertexId: string;
  joint: EdgeJointSettings;
}

export interface SketchProfile {
  id: string;
  name: string;
  vertices: SketchVertex[];
  edges: SketchEdge[];
  innerHoles: Vector2D[][];
}

export type SketchTool = 'select' | 'rectangle' | 'polygon' | 'slot' | 'joint_painter';
