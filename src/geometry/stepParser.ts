import type { WoodPart, Vector2D, Vector3D, Part2DProfile } from '../types/cad';

/**
 * Parses ISO-10303-21 STEP (.step / .stp) file text content into WoodPart objects.
 */
export function parseSTEPFile(stepText: string, defaultThickness: number = 4.0, defaultColor: string = '#d4a373'): WoodPart[] {
  const pointsMap = new Map<number, Vector3D>();
  const parts: WoodPart[] = [];

  // 1. Extract all CARTESIAN_POINT entities
  // Example: #10=CARTESIAN_POINT('',(10.0, 20.0, 0.0));
  const pointRegex = /#(\d+)\s*=\s*CARTESIAN_POINT\s*\([^,]*,\s*\(\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*,\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(?:,\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?))?\s*\)\s*\)/gi;

  let match: RegExpExecArray | null;
  while ((match = pointRegex.exec(stepText)) !== null) {
    const id = parseInt(match[1], 10);
    const x = parseFloat(match[2]);
    const y = parseFloat(match[3]);
    const z = match[4] ? parseFloat(match[4]) : 0;
    pointsMap.set(id, { x, y, z });
  }

  // 2. Extract EDGE_LOOP entities to form closed 2D/3D faces
  // Example: #50=EDGE_LOOP('',(#51,#52,#53,#54));
  const loopRegex = /#(\d+)\s*=\s*EDGE_LOOP\s*\([^,]*,\s*\(([^)]+)\)\s*\)/gi;
  const loopMap = new Map<number, number[]>();

  while ((match = loopRegex.exec(stepText)) !== null) {
    const loopId = parseInt(match[1], 10);
    const edgeRefsStr = match[2];
    const edgeIds = (edgeRefsStr.match(/#(\d+)/g) || []).map(ref => parseInt(ref.substring(1), 10));
    loopMap.set(loopId, edgeIds);
  }

  // 3. Extract ORIENTED_EDGE and EDGE_CURVE to resolve vertex points
  // Example: #51=ORIENTED_EDGE('',*,*,#60,.T.);
  // Example: #60=EDGE_CURVE('',#61,#62,#63,.T.);
  // Example: #61=VERTEX_POINT('',#10);
  const vertexPointMap = new Map<number, number>(); // VERTEX_POINT id -> CARTESIAN_POINT id
  const vertexRegex = /#(\d+)\s*=\s*VERTEX_POINT\s*\([^,]*,\s*#(\d+)\s*\)/gi;
  while ((match = vertexRegex.exec(stepText)) !== null) {
    const vId = parseInt(match[1], 10);
    const ptId = parseInt(match[2], 10);
    vertexPointMap.set(vId, ptId);
  }

  const edgeCurveMap = new Map<number, [number, number]>(); // EDGE_CURVE id -> [v1, v2]
  const edgeCurveRegex = /#(\d+)\s*=\s*EDGE_CURVE\s*\([^,]*,\s*#(\d+)\s*,\s*#(\d+)/gi;
  while ((match = edgeCurveRegex.exec(stepText)) !== null) {
    const edgeId = parseInt(match[1], 10);
    const v1 = parseInt(match[2], 10);
    const v2 = parseInt(match[3], 10);
    edgeCurveMap.set(edgeId, [v1, v2]);
  }

  // 4. Construct polygons from loops or Cartesian point sequences
  const polygonPaths: Vector2D[][] = [];

  loopMap.forEach((edgeIds) => {
    const path: Vector2D[] = [];
    edgeIds.forEach(edgeId => {
      const vPair = edgeCurveMap.get(edgeId);
      if (vPair) {
        const ptId = vertexPointMap.get(vPair[0]);
        if (ptId !== undefined) {
          const pt = pointsMap.get(ptId);
          if (pt) path.push({ x: pt.x, y: pt.y });
        }
      }
    });

    if (path.length >= 3) {
      polygonPaths.push(path);
    }
  });

  // Fallback: If no EDGE_LOOP structures parsed, create polygon directly from CARTESIAN_POINTS
  if (polygonPaths.length === 0 && pointsMap.size >= 3) {
    const pts = Array.from(pointsMap.values());
    const path: Vector2D[] = pts.map(p => ({ x: p.x, y: p.y }));
    polygonPaths.push(path);
  }

  // Fallback: Default sample rectangle if file has no readable points
  if (polygonPaths.length === 0) {
    polygonPaths.push([
      { x: -60, y: -40 },
      { x: 60, y: -40 },
      { x: 60, y: 40 },
      { x: -60, y: 40 },
    ]);
  }

  // 5. Generate WoodPart objects for parsed profiles
  polygonPaths.forEach((path, idx) => {
    const profile: Part2DProfile = {
      id: `step_prof_${idx + 1}`,
      name: `STEP Profile ${idx + 1}`,
      outerPath: path,
      innerHoles: [],
    };

    parts.push({
      id: `step_part_${idx + 1}`,
      name: `STEP Component ${idx + 1}`,
      color: defaultColor,
      thickness: defaultThickness,
      position: { x: 0, y: 0, z: idx * (defaultThickness + 5) },
      rotation: { x: 0, y: 0, z: 0 },
      assemblySlideVector: { x: 0, y: 0, z: 1 },
      profile,
      isInterlocking: false,
    });
  });

  return parts;
}
