export type MaterialType = 'birch_plywood' | 'mdf' | 'acrylic' | 'cherry_wood' | 'walnut';

export interface MaterialConfig {
  id: MaterialType;
  name: string;
  thickness: number; // in mm (e.g., 3.0, 4.0, 6.0)
  color: string;
  density: number; // g/cm3
  defaultKerf: number; // mm
}

export type MachineMode = 'laser_cut' | 'cnc_router';

export type FitMode = 'press_fit' | 'snug_fit' | 'loose_fit';

export type CornerRelief = 'none' | 'dog_bone' | 't_bone';

export interface KerfSettings {
  machineMode: MachineMode;
  laserBeamWidth: number; // in mm (typically 0.1mm - 0.25mm)
  fitMode: FitMode;
  clearanceAllowance: number; // additional offset in mm (+ for loose, - for tight)
  cornerRelief: CornerRelief;
  toolDiameter: number; // CNC bit diameter if CNC mode enabled (e.g., 3.175mm = 1/8")
}

export type JointType = 'finger_box' | 'dovetail' | 'mortise_tenon' | 'interlocking_slot';

export interface JointConfig {
  type: JointType;
  fingerWidth: number; // target tab width in mm
  fingerCountAuto: boolean;
  fingerCount: number;
  chamferLeadIn: number; // mm bevel for easy puzzle assembly
  cornerRelief: CornerRelief;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Part2DProfile {
  id: string;
  name: string;
  outerPath: Vector2D[];
  innerHoles: Vector2D[][];
}

export interface WoodPart {
  id: string;
  name: string;
  color: string;
  thickness: number;
  position: Vector3D;
  rotation: Vector3D; // in radians
  assemblySlideVector: Vector3D; // direction vector for exploded assembly
  profile: Part2DProfile;
  // Dynamic kerf-compensated paths
  compensatedProfile?: Part2DProfile;
  // Computed 3D mesh faces
  isInterlocking?: boolean;
}

export interface NestingSheet {
  width: number; // e.g. 600 mm
  height: number; // e.g. 400 mm
  margin: number; // e.g. 10 mm
  partSpacing: number; // e.g. 5 mm
}

export interface NestedPartPlacement {
  partId: string;
  partName: string;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270 degrees
  width: number;
  height: number;
  profile: Part2DProfile;
}

export type ActiveTab = '3d_cad' | '2d_nesting' | 'assembly_sim';

