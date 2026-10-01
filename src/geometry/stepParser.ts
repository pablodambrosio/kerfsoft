import type { WoodPart, Vector2D } from '../types/cad';
import * as THREE from 'three';
import occtimportjs from 'occt-import-js';

let occt: any = null;

async function initOCCT() {
  if (!occt) {
    occt = await occtimportjs({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/occt-import-js.wasm';
        }
        return path;
      }
    });
  }
  return occt;
}

export async function parseSTEPFile(fileBuffer: Uint8Array, defaultThickness: number = 4.0, defaultColor: string = '#d4a373'): Promise<WoodPart[]> {
  const occtAPI = await initOCCT();
  
  // Parse the step file
  const result = occtAPI.ReadStepFile(fileBuffer);
  
  if (!result || !result.success) {
    throw new Error("Failed to parse STEP file.");
  }
  
  const parts: WoodPart[] = [];
  let partIndex = 1;
  
  // Extract assembly tree paths
  const meshPaths = new Map<number, string>();
  function traverse(node: any, currentPath: string) {
    const nodeName = node.name ? node.name.trim() : '';
    const newPath = currentPath ? (nodeName ? `${currentPath}/${nodeName}` : currentPath) : nodeName;
    
    if (node.meshes && node.meshes.length > 0) {
      for (const meshIdx of node.meshes) {
        meshPaths.set(meshIdx, newPath);
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child, newPath);
      }
    }
  }
  
  if (result.root) {
    traverse(result.root, '');
  }
  
  for (let i = 0; i < result.meshes.length; i++) {
    const mesh = result.meshes[i];
    const posAttr = mesh.attributes.position;
    const idxAttr = mesh.attributes.index;
    if (!posAttr) continue;
    
    const positions = posAttr.array;
    let indices: ArrayLike<number>;
    
    if (idxAttr && idxAttr.array.length > 0) {
      indices = idxAttr.array;
    } else {
      const numVertices = positions.length / 3;
      const genIndices = new Uint32Array(numVertices);
      for (let k = 0; k < numVertices; k++) {
        genIndices[k] = k;
      }
      indices = genIndices;
    }
    
    // 1. Group triangles by UNORIENTED 3D Geometric Plane:
    // Defined by unit normal N and a reference point p0 on the plane.
    const planes: { normal: THREE.Vector3; p0: THREE.Vector3; area: number; triangles: THREE.Vector3[][] }[] = [];
    
    for (let k = 0; k < indices.length; k += 3) {
      const iA = indices[k];
      const iB = indices[k+1];
      const iC = indices[k+2];
      
      const vA = new THREE.Vector3(positions[iA*3], positions[iA*3+1], positions[iA*3+2]);
      const vB = new THREE.Vector3(positions[iB*3], positions[iB*3+1], positions[iB*3+2]);
      const vC = new THREE.Vector3(positions[iC*3], positions[iC*3+1], positions[iC*3+2]);
      
      const cb = new THREE.Vector3().subVectors(vC, vB);
      const ab = new THREE.Vector3().subVectors(vA, vB);
      const cross = new THREE.Vector3().crossVectors(cb, ab);
      
      const area = cross.length() * 0.5;
      if (area < 1e-6) continue; // degenerate triangle
      
      const normal = cross.normalize();
      
      let foundGroup = false;
      for (const plane of planes) {
        // Check if parallel
        if (Math.abs(plane.normal.dot(normal)) > 0.99) {
          // Check perpendicular distance from vA to plane (passing through plane.p0)
          const dist = Math.abs(plane.normal.dot(new THREE.Vector3().subVectors(vA, plane.p0)));
          if (dist < 1e-2) {
            plane.area += area;
            plane.triangles.push([vA, vB, vC]);
            foundGroup = true;
            break;
          }
        }
      }
      
      if (!foundGroup) {
        planes.push({ normal, p0: vA.clone(), area, triangles: [[vA, vB, vC]] });
      }
    }
    
    planes.sort((a, b) => b.area - a.area);
    const mainPlane = planes[0];
    if (!mainPlane) continue;
    
    // 2. Find Back Plane (parallel plane offset by >= 1.0mm with largest area) to calculate thickness
    let backPlane = null;
    let maxBackArea = 0;
    for (let pIdx = 1; pIdx < planes.length; pIdx++) {
      const p = planes[pIdx];
      if (Math.abs(p.normal.dot(mainPlane.normal)) > 0.95) {
        const dist = Math.abs(mainPlane.normal.dot(new THREE.Vector3().subVectors(p.p0, mainPlane.p0)));
        if (dist >= 1.0 && p.area > maxBackArea && p.area > 0.01 * mainPlane.area) {
          maxBackArea = p.area;
          backPlane = p;
        }
      }
    }
    
    let thickness = defaultThickness;
    if (backPlane) {
      thickness = Math.abs(mainPlane.normal.dot(new THREE.Vector3().subVectors(backPlane.p0, mainPlane.p0)));
    }
    if (thickness < 0.1) thickness = defaultThickness;
    
    // 3. Define local coordinate system (XY plane)
    const Z_local = mainPlane.normal.clone().normalize();
    let X_local = new THREE.Vector3(1, 0, 0);
    if (Math.abs(Z_local.dot(X_local)) > 0.99) {
      X_local.set(0, 1, 0);
    }
    const Y_local = new THREE.Vector3().crossVectors(Z_local, X_local).normalize();
    X_local.crossVectors(Y_local, Z_local).normalize();
    
    const rotationMatrix = new THREE.Matrix4().makeBasis(X_local, Y_local, Z_local);
    const mainP0 = mainPlane.p0;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    const uniquePoints: { x: number; y: number; id: number }[] = [];
    const getPointId = (x: number, y: number) => {
      for (let j = 0; j < uniquePoints.length; j++) {
        if (Math.hypot(uniquePoints[j].x - x, uniquePoints[j].y - y) < 1e-3) {
          return uniquePoints[j].id;
        }
      }
      const newId = uniquePoints.length;
      uniquePoints.push({ x, y, id: newId });
      return newId;
    };
    
    const edgeMap = new Map<string, { p1: { x: number; y: number; id: number }; p2: { x: number; y: number; id: number }; count: number }>();
    const edgeKey = (idA: number, idB: number) => (idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`);
    
    for (const tri of mainPlane.triangles) {
      const pts = tri.map(p3d => {
        const localVec = p3d.clone().sub(mainP0);
        const x = localVec.dot(X_local);
        const y = localVec.dot(Y_local);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        return { x, y };
      });
      
      for (let j = 0; j < 3; j++) {
        const pt1 = pts[j];
        const pt2 = pts[(j + 1) % 3];
        
        if (Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y) < 1e-4) continue;
        
        const id1 = getPointId(pt1.x, pt1.y);
        const id2 = getPointId(pt2.x, pt2.y);
        const eKey = edgeKey(id1, id2);
        
        if (edgeMap.has(eKey)) {
          edgeMap.get(eKey)!.count++;
        } else {
          edgeMap.set(eKey, { p1: { ...pt1, id: id1 }, p2: { ...pt2, id: id2 }, count: 1 });
        }
      }
    }
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    const center3D = mainP0.clone()
      .add(X_local.clone().multiplyScalar(cx))
      .add(Y_local.clone().multiplyScalar(cy))
      .sub(Z_local.clone().multiplyScalar(thickness / 2));
      
    const boundaryEdges: { p1: { x: number; y: number; id: number }; p2: { x: number; y: number; id: number } }[] = [];
    for (const edge of edgeMap.values()) {
      if (edge.count === 1) {
        boundaryEdges.push({
          p1: { x: edge.p1.x - cx, y: edge.p1.y - cy, id: edge.p1.id },
          p2: { x: edge.p2.x - cx, y: edge.p2.y - cy, id: edge.p2.id }
        });
      }
    }
    
    // 4. Chain edges into loops
    const loops: { x: number; y: number }[][] = [];
    let currentLoop: { x: number; y: number; id: number }[] = [];
    
    while (boundaryEdges.length > 0) {
      if (currentLoop.length === 0) {
        const first = boundaryEdges.pop()!;
        currentLoop.push(first.p1, first.p2);
      } else {
        const lastPt = currentLoop[currentLoop.length - 1];
        
        let found = false;
        for (let j = 0; j < boundaryEdges.length; j++) {
          const e = boundaryEdges[j];
          
          if (e.p1.id === lastPt.id) {
            currentLoop.push(e.p2);
            boundaryEdges.splice(j, 1);
            found = true;
            break;
          } else if (e.p2.id === lastPt.id) {
            currentLoop.push(e.p1);
            boundaryEdges.splice(j, 1);
            found = true;
            break;
          }
        }
        
        if (!found) {
          loops.push(currentLoop.map(p => ({ x: p.x, y: p.y })));
          currentLoop = [];
        }
      }
    }
    if (currentLoop.length > 0) {
      loops.push(currentLoop.map(p => ({ x: p.x, y: p.y })));
    }
    
    // Calculate signed areas and filter out zero/near-zero area loops (< 0.1 mm²)
    const validLoops: { loop: Vector2D[]; area: number; absArea: number }[] = [];
    for (let j = 0; j < loops.length; j++) {
      const loop = loops[j];
      if (loop.length > 2) {
        const first = loop[0];
        const last = loop[loop.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-3) {
          loop.pop();
        }
      }
      if (loop.length < 3) continue;
      
      let signedArea = 0;
      for (let k = 0; k < loop.length; k++) {
        const p1 = loop[k];
        const p2 = loop[(k + 1) % loop.length];
        signedArea += p1.x * p2.y - p2.x * p1.y;
      }
      signedArea = signedArea / 2;
      const absArea = Math.abs(signedArea);
      
      if (absArea >= 0.1) {
        validLoops.push({ loop, area: signedArea, absArea });
      }
    }
    
    if (validLoops.length === 0) continue;
    
    // Sort loops by area descending (largest area = outer boundary)
    validLoops.sort((a, b) => b.absArea - a.absArea);
    
    let outerPath = validLoops[0].loop;
    const outerSign = Math.sign(validLoops[0].area);
    
    // Force outer path to be CCW (positive) for Three.js Earcut & 2D rendering
    if (outerSign < 0) {
      outerPath.reverse();
    }
    
    const innerHoles: Vector2D[][] = [];
    for (let j = 1; j < validLoops.length; j++) {
      let hole = validLoops[j].loop;
      const holeSign = Math.sign(validLoops[j].area);
      // Force inner holes to be CW (negative) for Three.js Earcut
      if (holeSign > 0) {
        hole.reverse();
      }
      innerHoles.push(hole);
    }
    
    const euler = new THREE.Euler().setFromRotationMatrix(rotationMatrix);
    
    const basePath = meshPaths.get(i) || '';
    const bodyName = mesh.name ? mesh.name : `Body ${partIndex}`;
    const fullName = basePath ? `${basePath}/${bodyName}` : bodyName;
    
    parts.push({
      id: `step_part_${partIndex}`,
      name: fullName,
      color: defaultColor,
      thickness,
      position: { x: center3D.x, y: center3D.y, z: center3D.z },
      rotation: { x: euler.x, y: euler.y, z: euler.z },
      assemblySlideVector: { x: 0, y: 0, z: 1 },
      profile: {
        id: `step_prof_${partIndex}`,
        name: `STEP Profile ${partIndex}`,
        outerPath,
        innerHoles
      },
      isInterlocking: false,
    });
    
    partIndex++;
  }
  
  return parts;
}

