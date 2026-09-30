import type { WoodPart, KerfSettings } from '../types/cad';
import { createWoodPartGeometry } from './kerfEngine';

/**
 * Generates Binary STL ArrayBuffer from an array of WoodParts
 */
export function generateBinarySTL(parts: WoodPart[], settings?: KerfSettings): ArrayBuffer {
  let totalTriangles = 0;

  // 1. Build Three.js BufferGeometries for all parts and count triangles
  const geometries = parts.map((part) => {
    const geom = createWoodPartGeometry(part, settings);

    // Apply part position and rotation transformations
    geom.rotateX(part.rotation.x);
    geom.rotateY(part.rotation.y);
    geom.rotateZ(part.rotation.z);
    geom.translate(part.position.x, part.position.y, part.position.z);

    const indexAttr = geom.getIndex();
    const posAttr = geom.getAttribute('position');

    if (indexAttr) {
      totalTriangles += indexAttr.count / 3;
    } else if (posAttr) {
      totalTriangles += posAttr.count / 3;
    }

    return geom;
  });

  // 2. Allocate Binary STL Buffer (80-byte header + 4-byte count + 50 bytes per triangle)
  const bufferSize = 80 + 4 + totalTriangles * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // Write 80-byte ASCII Header
  const headerStr = 'KERFSOFT 3D CAD Binary STL Exporter';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 32);
  }

  // Write Triangle Count uint32
  dataView.setUint32(80, totalTriangles, true);

  let byteOffset = 84;

  // 3. Write Triangles
  geometries.forEach((geom) => {
    const posAttr = geom.getAttribute('position');
    const normAttr = geom.getAttribute('normal');
    const indexAttr = geom.getIndex();

    const triangleCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

    for (let i = 0; i < triangleCount; i++) {
      let idx1 = i * 3;
      let idx2 = i * 3 + 1;
      let idx3 = i * 3 + 2;

      if (indexAttr) {
        idx1 = indexAttr.getX(i * 3);
        idx2 = indexAttr.getX(i * 3 + 1);
        idx3 = indexAttr.getX(i * 3 + 2);
      }

      // Normal vector
      const nx = normAttr ? normAttr.getX(idx1) : 0;
      const ny = normAttr ? normAttr.getY(idx1) : 0;
      const nz = normAttr ? normAttr.getZ(idx1) : 1;

      dataView.setFloat32(byteOffset, nx, true);
      dataView.setFloat32(byteOffset + 4, ny, true);
      dataView.setFloat32(byteOffset + 8, nz, true);

      // Vertex 1
      dataView.setFloat32(byteOffset + 12, posAttr.getX(idx1), true);
      dataView.setFloat32(byteOffset + 16, posAttr.getY(idx1), true);
      dataView.setFloat32(byteOffset + 20, posAttr.getZ(idx1), true);

      // Vertex 2
      dataView.setFloat32(byteOffset + 24, posAttr.getX(idx2), true);
      dataView.setFloat32(byteOffset + 28, posAttr.getY(idx2), true);
      dataView.setFloat32(byteOffset + 32, posAttr.getZ(idx2), true);

      // Vertex 3
      dataView.setFloat32(byteOffset + 36, posAttr.getX(idx3), true);
      dataView.setFloat32(byteOffset + 40, posAttr.getY(idx3), true);
      dataView.setFloat32(byteOffset + 44, posAttr.getZ(idx3), true);

      // Attribute byte count = 0
      dataView.setUint16(byteOffset + 48, 0, true);

      byteOffset += 50;
    }

    geom.dispose();
  });

  return buffer;
}

/**
 * Triggers download of Binary STL File
 */
export function downloadSTLExport(parts: WoodPart[], filename: string = 'kerfsoft_model.stl') {
  const stlBuffer = generateBinarySTL(parts);
  const blob = new Blob([stlBuffer], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
