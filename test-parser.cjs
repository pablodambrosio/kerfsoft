const fs = require('fs');
const THREE = require('three');
const initOpenCascade = require('occt-import-js')();

async function run() {
  const occt = await initOpenCascade;
  const fileBuffer = fs.readFileSync('examples/box.step');
  const result = occt.ReadStepFile(new Uint8Array(fileBuffer));

  if (!result || !result.success) {
    console.error("Failed to parse STEP file.");
    return;
  }

  // Simplified traversal to find meshes
  for (let i = 0; i < result.meshes.length; i++) {
    const mesh = result.meshes[i];
    const posAttr = mesh.attributes.position;
    const idxAttr = mesh.attributes.index;
    if (!posAttr) continue;
    
    const positions = posAttr.array;
    let indices;
    if (idxAttr && idxAttr.array.length > 0) {
      indices = idxAttr.array;
    } else {
      const numVertices = positions.length / 3;
      indices = new Uint32Array(numVertices);
      for (let k = 0; k < numVertices; k++) indices[k] = k;
    }
    
    const faces = [];
    for (let k = 0; k < indices.length; k += 3) {
      const iA = indices[k], iB = indices[k+1], iC = indices[k+2];
      const vA = new THREE.Vector3(positions[iA*3], positions[iA*3+1], positions[iA*3+2]);
      const vB = new THREE.Vector3(positions[iB*3], positions[iB*3+1], positions[iB*3+2]);
      const vC = new THREE.Vector3(positions[iC*3], positions[iC*3+1], positions[iC*3+2]);
      
      const cb = new THREE.Vector3().subVectors(vC, vB);
      const ab = new THREE.Vector3().subVectors(vA, vB);
      const cross = new THREE.Vector3().crossVectors(cb, ab);
      const area = cross.length() * 0.5;
      if (area < 1e-6) continue;
      
      const normal = cross.normalize();
      let foundGroup = false;
      for (const face of faces) {
        if (face.normal.dot(normal) > 0.99) {
          face.area += area;
          face.triangles.push([iA, iB, iC]);
          foundGroup = true; break;
        }
      }
      if (!foundGroup) faces.push({ normal, area, triangles: [[iA, iB, iC]] });
    }
    
    let mainFace = null, maxArea = 0;
    for (const face of faces) {
      if (face.area > maxArea) { maxArea = face.area; mainFace = face; }
    }
    if (!mainFace) continue;
    
    const Z_local = mainFace.normal.clone().normalize();
    let X_local = new THREE.Vector3(1, 0, 0);
    if (Math.abs(Z_local.dot(X_local)) > 0.99) X_local.set(0, 1, 0);
    const Y_local = new THREE.Vector3().crossVectors(Z_local, X_local).normalize();
    X_local.crossVectors(Y_local, Z_local).normalize();
    
    const mainP0_idx = mainFace.triangles[0][0];
    const mainP0 = new THREE.Vector3(positions[mainP0_idx*3], positions[mainP0_idx*3+1], positions[mainP0_idx*3+2]);
    
    const uniquePoints = [];
    const getPointId = (x, y) => {
      for (let j = 0; j < uniquePoints.length; j++) {
        if (Math.hypot(uniquePoints[j].x - x, uniquePoints[j].y - y) < 1e-3) return uniquePoints[j].id;
      }
      const newId = uniquePoints.length;
      uniquePoints.push({x, y, id: newId});
      return newId;
    };
    
    const edgeMap = new Map();
    const edgeKey = (idA, idB) => idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const tri of mainFace.triangles) {
      const pts = tri.map(idx => {
        const p3d = new THREE.Vector3(positions[idx*3], positions[idx*3+1], positions[idx*3+2]);
        const localVec = p3d.clone().sub(mainP0);
        const x = localVec.dot(X_local), y = localVec.dot(Y_local);
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        return {x, y};
      });
      for (let j = 0; j < 3; j++) {
        const pt1 = pts[j], pt2 = pts[(j+1)%3];
        if (Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y) < 1e-4) continue;
        const id1 = getPointId(pt1.x, pt1.y), id2 = getPointId(pt2.x, pt2.y);
        const eKey = edgeKey(id1, id2);
        if (edgeMap.has(eKey)) edgeMap.get(eKey).count++;
        else edgeMap.set(eKey, { p1: { ...pt1, id: id1 }, p2: { ...pt2, id: id2 }, count: 1 });
      }
    }
    
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const boundaryEdges = [];
    for (const edge of edgeMap.values()) {
      if (edge.count === 1) {
        boundaryEdges.push({
          p1: { x: edge.p1.x - cx, y: edge.p1.y - cy, id: edge.p1.id },
          p2: { x: edge.p2.x - cx, y: edge.p2.y - cy, id: edge.p2.id }
        });
      }
    }
    
    const loops = [];
    let currentLoop = [];
    while (boundaryEdges.length > 0) {
      if (currentLoop.length === 0) {
        const first = boundaryEdges.pop();
        currentLoop.push(first.p1, first.p2);
      } else {
        const lastPt = currentLoop[currentLoop.length - 1];
        let found = false;
        for (let j = 0; j < boundaryEdges.length; j++) {
          const e = boundaryEdges[j];
          if (e.p1.id === lastPt.id) {
            currentLoop.push(e.p2); boundaryEdges.splice(j, 1); found = true; break;
          } else if (e.p2.id === lastPt.id) {
            currentLoop.push(e.p1); boundaryEdges.splice(j, 1); found = true; break;
          }
        }
        if (!found) { loops.push(currentLoop); currentLoop = []; }
      }
    }
    if (currentLoop.length > 0) loops.push(currentLoop);
    
    console.log(`Mesh ${i}: faces=${faces.length}, mainFace.triangles=${mainFace.triangles.length}, uniquePts=${uniquePoints.length}, boundaryEdges=${edgeMap.size}(total)->${loops.reduce((acc,l)=>acc+l.length,0)}(loopPoints)`);
    console.log(`  Loops: ${loops.length} ` + JSON.stringify(loops.map(l => l.length)));
  }
}

run().catch(console.error);
