import type { WoodPart, Part2DProfile, Vector2D, JointConfig } from '../types/cad';
import type { SketchProfile, SketchEdge } from '../types/sketch';
import { generateFingerJointEdge } from './kerfEngine';

/**
 * Converts a user-drawn SketchProfile into a fully extruded 3D WoodPart
 */
export function convertSketchToWoodPart(
  sketch: SketchProfile,
  thickness: number,
  color: string,
  partId: string = 'custom_part_1'
): WoodPart {
  const outerPath: Vector2D[] = [];

  // Build outer boundary profile by walking edges in order
  sketch.edges.forEach((edge) => {
    const startV = sketch.vertices.find((v) => v.id === edge.startVertexId);
    const endV = sketch.vertices.find((v) => v.id === edge.endVertexId);

    if (!startV || !endV) return;

    const startPt = { x: startV.x, y: startV.y };
    const endPt = { x: endV.x, y: endV.y };

    if (edge.joint && edge.joint.enabled) {
      const jointCfg: JointConfig = {
        type: edge.joint.type,
        fingerWidth: edge.joint.fingerWidth,
        fingerCountAuto: true,
        fingerCount: 5,
        chamferLeadIn: 0.5,
        cornerRelief: 'none',
      };

      const fingerEdgePts = generateFingerJointEdge(
        startPt,
        endPt,
        jointCfg,
        edge.joint.isMale,
        thickness
      );

      // Add points (omit last point to avoid double-adding shared vertices)
      fingerEdgePts.slice(0, -1).forEach((pt) => outerPath.push(pt));
    } else {
      outerPath.push(startPt);
    }
  });

  const profile: Part2DProfile = {
    id: sketch.id,
    name: sketch.name,
    outerPath,
    innerHoles: sketch.innerHoles,
  };

  return {
    id: partId,
    name: sketch.name,
    color,
    thickness,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    assemblySlideVector: { x: 0, y: 0, z: 1 },
    profile,
    isInterlocking: sketch.edges.some((e) => e.joint && e.joint.enabled),
  };
}

/**
 * Generates a default initial rectangle sketch profile
 */
export function createDefaultRectangleSketch(width: number = 100, height: number = 80): SketchProfile {
  const halfW = width / 2;
  const halfH = height / 2;

  const v1 = { id: 'v1', x: -halfW, y: -halfH };
  const v2 = { id: 'v2', x: halfW, y: -halfH };
  const v3 = { id: 'v3', x: halfW, y: halfH };
  const v4 = { id: 'v4', x: -halfW, y: halfH };

  const edges: SketchEdge[] = [
    {
      id: 'e1',
      startVertexId: 'v1',
      endVertexId: 'v2',
      joint: { enabled: true, type: 'finger_box', isMale: true, fingerWidth: 12 },
    },
    {
      id: 'e2',
      startVertexId: 'v2',
      endVertexId: 'v3',
      joint: { enabled: false, type: 'finger_box', isMale: false, fingerWidth: 12 },
    },
    {
      id: 'e3',
      startVertexId: 'v3',
      endVertexId: 'v4',
      joint: { enabled: true, type: 'finger_box', isMale: false, fingerWidth: 12 },
    },
    {
      id: 'e4',
      startVertexId: 'v4',
      endVertexId: 'v1',
      joint: { enabled: false, type: 'finger_box', isMale: true, fingerWidth: 12 },
    },
  ];

  return {
    id: 'sketch_rect_1',
    name: 'Custom Sketch Panel',
    vertices: [v1, v2, v3, v4],
    edges,
    innerHoles: [
      // Central slot hole
      [
        { x: -15, y: -10 },
        { x: 15, y: -10 },
        { x: 15, y: 10 },
        { x: -15, y: 10 },
      ],
    ],
  };
}
