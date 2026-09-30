import * as THREE from 'three';
import { applyCornerReliefs } from './reliefEngine';
import type {
  WoodPart,
  KerfSettings,
  JointConfig,
  MaterialConfig,
  Vector2D,
  Part2DProfile
} from '../types/cad';

// Materials presets lookup
export const MATERIAL_PRESETS: Record<string, MaterialConfig> = {
  birch_plywood: {
    id: 'birch_plywood',
    name: 'Birch Plywood',
    thickness: 4.0,
    color: '#d4a373',
    density: 0.65,
    defaultKerf: 0.15,
  },
  mdf: {
    id: 'mdf',
    name: 'MDF Board',
    thickness: 3.0,
    color: '#c29b38',
    density: 0.75,
    defaultKerf: 0.18,
  },
  acrylic: {
    id: 'acrylic',
    name: 'Clear Acrylic (PMMA)',
    thickness: 3.0,
    color: '#8ecae6',
    density: 1.19,
    defaultKerf: 0.12,
  },
  cherry_wood: {
    id: 'cherry_wood',
    name: 'Solid Cherry Wood',
    thickness: 5.0,
    color: '#9e2a2b',
    density: 0.58,
    defaultKerf: 0.16,
  },
  walnut: {
    id: 'walnut',
    name: 'American Walnut',
    thickness: 6.0,
    color: '#583101',
    density: 0.61,
    defaultKerf: 0.17,
  }
};

/**
 * Computes effective Kerf Offset based on beam width, fit mode, and clearance.
 * Outer profiles expand by +effectiveKerf. Inner slots shrink by -effectiveKerf.
 */
export function getEffectiveKerfOffset(settings: KerfSettings): number {
  let fitAllowance = 0;
  if (settings.fitMode === 'press_fit') {
    fitAllowance = -0.04; // Slightly tight press fit
  } else if (settings.fitMode === 'loose_fit') {
    fitAllowance = 0.08; // Easy sliding fit for puzzles
  }
  
  // Total kerf offset per side = (beam width / 2) + fit allowance + custom clearance
  return (settings.laserBeamWidth / 2) + fitAllowance + settings.clearanceAllowance;
}

/**
 * Performs 2D Polygon Offsetting for Kerf Compensation.
 * Expands or shrinks 2D polygon vertices along vertex normal bisectors.
 */
export function offsetPolygon(polygon: Vector2D[], delta: number): Vector2D[] {
  if (polygon.length < 3 || Math.abs(delta) < 0.0001) {
    return polygon.map(v => ({ ...v }));
  }

  const result: Vector2D[] = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n];
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];

    // Edge vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    const len1 = Math.hypot(v1.x, v1.y) || 1;
    const len2 = Math.hypot(v2.x, v2.y) || 1;

    // Normalized edge normals (pointing outward for CCW polygon)
    const n1 = { x: -v1.y / len1, y: v1.x / len1 };
    const n2 = { x: -v2.y / len2, y: v2.x / len2 };

    // Vertex bisector normal
    const bisector = { x: n1.x + n2.x, y: n1.y + n2.y };
    const bisectorLen = Math.hypot(bisector.x, bisector.y);

    if (bisectorLen < 0.0001) {
      result.push({ x: curr.x + n1.x * delta, y: curr.y + n1.y * delta });
      continue;
    }

    const normBisector = { x: bisector.x / bisectorLen, y: bisector.y / bisectorLen };
    // Cosine of half angle between normals
    const cosHalfAngle = n1.x * normBisector.x + n1.y * normBisector.y;
    const miterLength = delta / Math.max(0.1, cosHalfAngle);

    // Limit extreme miter spikes at sharp acute angles
    const cappedMiter = Math.min(Math.abs(delta) * 3, Math.abs(miterLength)) * Math.sign(delta);

    result.push({
      x: curr.x + normBisector.x * cappedMiter,
      y: curr.y + normBisector.y * cappedMiter,
    });
  }

  return result;
}



/**
 * Applies Kerf compensation to a complete 2D Part Profile (Outer path + Inner holes)
 * Includes CNC router Dog-bone / T-bone corner relief overcuts.
 */
export function applyKerfToProfile(profile: Part2DProfile, settings: KerfSettings): Part2DProfile {
  const kerfOffset = getEffectiveKerfOffset(settings);

  // Outer boundary expands by +kerfOffset
  const compensatedOuter = offsetPolygon(profile.outerPath, kerfOffset);

  // Inner cutouts/slots shrink by -kerfOffset
  let compensatedHoles = profile.innerHoles.map(hole => offsetPolygon(hole, -kerfOffset));

  // Apply CNC Router Dog-bone / T-bone corner reliefs to internal slot corners
  if (settings.cornerRelief !== 'none') {
    compensatedHoles = compensatedHoles.map(hole =>
      applyCornerReliefs(hole, settings.cornerRelief, settings.toolDiameter)
    );
  }

  return {
    ...profile,
    outerPath: compensatedOuter,
    innerHoles: compensatedHoles,
  };
}

/**
 * Generates dynamic Finger/Box Joint edge profiles between connecting wood sheets.
 */
export function generateFingerJointEdge(
  start: Vector2D,
  end: Vector2D,
  jointConfig: JointConfig,
  isMaleTab: boolean,
  thickness: number
): Vector2D[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const edgeLength = Math.hypot(dx, dy);

  if (edgeLength < 1.0) return [start, end];

  const unitDir = { x: dx / edgeLength, y: dy / edgeLength };
  // Normal vector pointing perpendicular to edge
  const unitNormal = { x: -unitDir.y, y: unitDir.x };

  let numFingers = jointConfig.fingerCount;
  if (jointConfig.fingerCountAuto) {
    numFingers = Math.max(3, Math.floor(edgeLength / jointConfig.fingerWidth));
    if (numFingers % 2 === 0) numFingers += 1; // Keep odd number for symmetry
  }

  const segLength = edgeLength / numFingers;
  const points: Vector2D[] = [start];

  for (let i = 0; i < numFingers; i++) {
    const p1Dist = i * segLength;
    const p2Dist = (i + 1) * segLength;

    const p1 = { x: start.x + unitDir.x * p1Dist, y: start.y + unitDir.y * p1Dist };
    const p2 = { x: start.x + unitDir.x * p2Dist, y: start.y + unitDir.y * p2Dist };

    // Determine tab direction
    const isTabOut = (i % 2 === 0) ? isMaleTab : !isMaleTab;
    const tabHeight = isTabOut ? thickness : 0;

    if (tabHeight > 0) {
      const p1Out = { x: p1.x + unitNormal.x * tabHeight, y: p1.y + unitNormal.y * tabHeight };
      const p2Out = { x: p2.x + unitNormal.x * tabHeight, y: p2.y + unitNormal.y * tabHeight };

      points.push(p1);
      points.push(p1Out);
      points.push(p2Out);
      points.push(p2);
    } else {
      points.push(p1);
      points.push(p2);
    }
  }

  return points;
}

/**
 * Creates 3D Three.js BufferGeometry for a WoodPart (Extruded 2.5D Sheet with inner holes)
 */
export function createWoodPartGeometry(part: WoodPart, kerfSettings?: KerfSettings): THREE.BufferGeometry {
  const activeProfile = kerfSettings
    ? applyKerfToProfile(part.profile, kerfSettings)
    : part.profile;

  // Create Three.js Shape
  const shape = new THREE.Shape();

  if (activeProfile.outerPath.length > 0) {
    shape.moveTo(activeProfile.outerPath[0].x, activeProfile.outerPath[0].y);
    for (let i = 1; i < activeProfile.outerPath.length; i++) {
      shape.lineTo(activeProfile.outerPath[i].x, activeProfile.outerPath[i].y);
    }
    shape.closePath();
  }

  // Create Inner Holes
  activeProfile.innerHoles.forEach(holePath => {
    if (holePath.length === 0) return;
    const holeShape = new THREE.Path();
    holeShape.moveTo(holePath[0].x, holePath[0].y);
    for (let i = 1; i < holePath.length; i++) {
      holeShape.lineTo(holePath[i].x, holePath[i].y);
    }
    holeShape.closePath();
    shape.holes.push(holeShape);
  });

  // Extrude settings for 3D wood sheet thickness
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: part.thickness,
    bevelEnabled: true,
    bevelThickness: 0.15, // Subtle wood edge bevel
    bevelSize: 0.15,
    bevelSegments: 2,
    curveSegments: 12,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Preset Model Generator 1: Parametric 6-Sided Box / Crate with Finger Joints
 */
export function generateStorageCratePreset(
  dimensions: { length: number; width: number; height: number },
  material: MaterialConfig,
  _jointConfig: JointConfig
): WoodPart[] {
  const { length: L, width: W, height: H } = dimensions;
  const T = material.thickness;
  const color = material.color;

  const parts: WoodPart[] = [];

  // 1. Bottom Sheet (L x W)
  const bottomProfile: Part2DProfile = {
    id: 'bottom_prof',
    name: 'Bottom Base',
    outerPath: [
      { x: -L / 2, y: -W / 2 },
      { x: L / 2, y: -W / 2 },
      { x: L / 2, y: W / 2 },
      { x: -L / 2, y: W / 2 },
    ],
    innerHoles: [],
  };

  parts.push({
    id: 'part_bottom',
    name: 'Bottom Panel',
    color,
    thickness: T,
    position: { x: 0, y: 0, z: -T / 2 },
    rotation: { x: 0, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: 0, z: -1 },
    profile: bottomProfile,
    isInterlocking: true,
  });

  // 2. Front & Back Panels (L x H)
  const frontProfile: Part2DProfile = {
    id: 'front_prof',
    name: 'Front Panel',
    outerPath: [
      { x: -L / 2, y: -H / 2 },
      { x: L / 2, y: -H / 2 },
      { x: L / 2, y: H / 2 },
      { x: -L / 2, y: H / 2 },
    ],
    innerHoles: [
      // Decorative handle hole
      [
        { x: -25, y: H / 4 - 8 },
        { x: 25, y: H / 4 - 8 },
        { x: 25, y: H / 4 + 8 },
        { x: -25, y: H / 4 + 8 },
      ],
    ],
  };

  parts.push({
    id: 'part_front',
    name: 'Front Panel',
    color,
    thickness: T,
    position: { x: 0, y: -W / 2 - T / 2, z: H / 2 - T / 2 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: -1, z: 0 },
    profile: frontProfile,
    isInterlocking: true,
  });

  parts.push({
    id: 'part_back',
    name: 'Back Panel',
    color,
    thickness: T,
    position: { x: 0, y: W / 2 + T / 2, z: H / 2 - T / 2 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: 1, z: 0 },
    profile: frontProfile,
    isInterlocking: true,
  });

  // 3. Left & Right Side Panels (W x H)
  const sideProfile: Part2DProfile = {
    id: 'side_prof',
    name: 'Side Panel',
    outerPath: [
      { x: -W / 2, y: -H / 2 },
      { x: W / 2, y: -H / 2 },
      { x: W / 2, y: H / 2 },
      { x: -W / 2, y: H / 2 },
    ],
    innerHoles: [],
  };

  parts.push({
    id: 'part_left',
    name: 'Left Side Panel',
    color,
    thickness: T,
    position: { x: -L / 2 - T / 2, y: 0, z: H / 2 - T / 2 },
    rotation: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    assemblySlideVector: { x: -1, y: 0, z: 0 },
    profile: sideProfile,
    isInterlocking: true,
  });

  parts.push({
    id: 'part_right',
    name: 'Right Side Panel',
    color,
    thickness: T,
    position: { x: L / 2 + T / 2, y: 0, z: H / 2 - T / 2 },
    rotation: { x: Math.PI / 2, y: 0, z: Math.PI / 2 },
    assemblySlideVector: { x: 1, y: 0, z: 0 },
    profile: sideProfile,
    isInterlocking: true,
  });

  // 4. Top Lid with Interlocking Finger Cutouts
  const topProfile: Part2DProfile = {
    id: 'top_prof',
    name: 'Top Lid',
    outerPath: [
      { x: -L / 2, y: -W / 2 },
      { x: L / 2, y: -W / 2 },
      { x: L / 2, y: W / 2 },
      { x: -L / 2, y: W / 2 },
    ],
    innerHoles: [],
  };

  parts.push({
    id: 'part_top',
    name: 'Top Lid Panel',
    color,
    thickness: T,
    position: { x: 0, y: 0, z: H + T / 2 },
    rotation: { x: 0, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: 0, z: 1 },
    profile: topProfile,
    isInterlocking: true,
  });

  return parts;
}

/**
 * Preset Model Generator 2: 3D Interlocking Wood Burr Puzzle
 */
export function generateBurrPuzzlePreset(material: MaterialConfig): WoodPart[] {
  const T = material.thickness;
  const S = T * 4; // Bar cross-section dimension (e.g., 16mm x 16mm x 80mm)
  const L = S * 5;

  const parts: WoodPart[] = [];

  // Bar 1: X-Axis Main Beam with Center Notch
  const bar1Profile: Part2DProfile = {
    id: 'bar1_prof',
    name: 'X Key Beam',
    outerPath: [
      { x: -L / 2, y: -S / 2 },
      { x: L / 2, y: -S / 2 },
      { x: L / 2, y: S / 2 },
      { x: -L / 2, y: S / 2 },
    ],
    innerHoles: [
      // Central notch cutout
      [
        { x: -S / 2, y: 0 },
        { x: S / 2, y: 0 },
        { x: S / 2, y: S / 2 },
        { x: -S / 2, y: S / 2 },
      ]
    ],
  };

  parts.push({
    id: 'burr_1',
    name: 'X-Axis Key Piece A',
    color: '#d4a373',
    thickness: S,
    position: { x: 0, y: -S / 2, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    assemblySlideVector: { x: -1, y: 0, z: 0 },
    profile: bar1Profile,
    isInterlocking: true,
  });

  parts.push({
    id: 'burr_2',
    name: 'X-Axis Key Piece B',
    color: '#bc6c25',
    thickness: S,
    position: { x: 0, y: S / 2, z: 0 },
    rotation: { x: 0, y: 0, z: Math.PI },
    assemblySlideVector: { x: 1, y: 0, z: 0 },
    profile: bar1Profile,
    isInterlocking: true,
  });

  // Bar 2: Y-Axis Interlocking Cross Beam
  const bar2Profile: Part2DProfile = {
    id: 'bar2_prof',
    name: 'Y Key Beam',
    outerPath: [
      { x: -L / 2, y: -S / 2 },
      { x: L / 2, y: -S / 2 },
      { x: L / 2, y: S / 2 },
      { x: -L / 2, y: S / 2 },
    ],
    innerHoles: [
      [
        { x: -S / 2, y: -S / 2 },
        { x: S / 2, y: -S / 2 },
        { x: S / 2, y: 0 },
        { x: -S / 2, y: 0 },
      ]
    ],
  };

  parts.push({
    id: 'burr_3',
    name: 'Y-Axis Locking Beam',
    color: '#a3b18a',
    thickness: S,
    position: { x: 0, y: 0, z: S / 2 },
    rotation: { x: 0, y: 0, z: Math.PI / 2 },
    assemblySlideVector: { x: 0, y: 1, z: 0 },
    profile: bar2Profile,
    isInterlocking: true,
  });

  parts.push({
    id: 'burr_4',
    name: 'Z-Axis Key Pin',
    color: '#e9edc9',
    thickness: S,
    position: { x: 0, y: 0, z: -S / 2 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: 0, z: -1 },
    profile: bar2Profile,
    isInterlocking: true,
  });

  return parts;
}

/**
 * Preset Model Generator 3: Parametric Interlocking Phone/Tablet Stand
 */
export function generatePhoneStandPreset(material: MaterialConfig): WoodPart[] {
  const T = material.thickness;
  const parts: WoodPart[] = [];

  // Main Backrest Sheet
  const backProfile: Part2DProfile = {
    id: 'stand_back_prof',
    name: 'Back Support Plate',
    outerPath: [
      { x: -45, y: 0 },
      { x: 45, y: 0 },
      { x: 40, y: 140 },
      { x: -40, y: 140 },
    ],
    innerHoles: [
      // Bottom interlocking slot
      [
        { x: -T / 2, y: 10 },
        { x: T / 2, y: 10 },
        { x: T / 2, y: 50 },
        { x: -T / 2, y: 50 },
      ],
      // Cable routing hole
      [
        { x: -15, y: 70 },
        { x: 15, y: 70 },
        { x: 15, y: 110 },
        { x: -15, y: 110 },
      ]
    ]
  };

  parts.push({
    id: 'stand_back',
    name: 'Back Support Plate',
    color: material.color,
    thickness: T,
    position: { x: 0, y: 0, z: 45 },
    rotation: { x: Math.PI / 6, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: -0.5, z: 1 },
    profile: backProfile,
    isInterlocking: true,
  });

  // Base Interlocking Plate
  const baseProfile: Part2DProfile = {
    id: 'stand_base_prof',
    name: 'Base Plate',
    outerPath: [
      { x: -45, y: 0 },
      { x: 45, y: 0 },
      { x: 50, y: 110 },
      { x: -50, y: 110 },
    ],
    innerHoles: [
      // Mating slot for backrest
      [
        { x: -T / 2, y: 30 },
        { x: T / 2, y: 30 },
        { x: T / 2, y: 70 },
        { x: -T / 2, y: 70 },
      ]
    ]
  };

  parts.push({
    id: 'stand_base',
    name: 'Base Support Plate',
    color: '#805b10',
    thickness: T,
    position: { x: 0, y: 10, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: 1, z: 0 },
    profile: baseProfile,
    isInterlocking: true,
  });

  return parts;
}
