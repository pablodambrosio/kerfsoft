import type { Vector2D, CornerRelief } from '../types/cad';

/**
 * Inserts CNC Dog-bone or T-bone corner relief overcuts into concave polygon vertices.
 * Allows square wood tabs to seat flush into CNC-milled slots.
 */
export function applyCornerReliefs(
  polygon: Vector2D[],
  cornerRelief: CornerRelief,
  toolDiameter: number
): Vector2D[] {
  if (cornerRelief === 'none' || toolDiameter <= 0 || polygon.length < 3) {
    return polygon.map((v) => ({ ...v }));
  }

  const radius = toolDiameter / 2;
  const result: Vector2D[] = [];
  const n = polygon.length;

  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n];
    const curr = polygon[i];
    const next = polygon[(i + 1) % n];

    // Edge vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    // Cross product Z component to check if vertex is an internal concave corner
    const crossZ = v1.x * v2.y - v1.y * v2.x;

    // Concave internal corner check (cross product > 0 for CCW polygon)
    if (crossZ > 1.0) {
      const len1 = Math.hypot(v1.x, v1.y) || 1;
      const len2 = Math.hypot(v2.x, v2.y) || 1;

      const u1 = { x: v1.x / len1, y: v1.y / len1 };
      const u2 = { x: v2.x / len2, y: v2.y / len2 };

      if (cornerRelief === 'dog_bone') {
        // Dog-bone: Extend drill bit circle 45 degrees along corner bisector
        const bisector = { x: u2.x - u1.x, y: u2.y - u1.y };
        const bLen = Math.hypot(bisector.x, bisector.y) || 1;
        const normBisector = { x: bisector.x / bLen, y: bisector.y / bLen };

        // Distance along bisector to bit center
        const centerDist = radius * 1.414; // r * sqrt(2)
        const holeCenter = {
          x: curr.x + normBisector.x * centerDist,
          y: curr.y + normBisector.y * centerDist,
        };

        // Create 8-point circular arc approximation for dog-bone hole
        result.push({ x: curr.x - u1.x * (radius * 0.2), y: curr.y - u1.y * (radius * 0.2) });
        result.push(holeCenter);
        result.push({ x: curr.x + u2.x * (radius * 0.2), y: curr.y + u2.y * (radius * 0.2) });
      } else if (cornerRelief === 't_bone') {
        // T-bone: Extend cut along one edge by tool diameter
        const tBoneEnd = {
          x: curr.x - u1.x * radius * 1.5,
          y: curr.y - u1.y * radius * 1.5,
        };
        result.push(curr);
        result.push(tBoneEnd);
        result.push(curr);
      } else {
        result.push(curr);
      }
    } else {
      result.push(curr);
    }
  }

  return result;
}
