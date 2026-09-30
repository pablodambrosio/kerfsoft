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


