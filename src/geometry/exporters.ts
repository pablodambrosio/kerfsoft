import type { NestedPartPlacement, NestingSheet, KerfSettings } from '../types/cad';
import { getEffectiveKerfOffset, offsetPolygon } from './kerfEngine';

/**
 * Generates production-ready SVG file string for Laser Cutters & CNC Routers.
 */
export function generateSVGExport(
  placements: NestedPartPlacement[],
  sheet: NestingSheet,
  settings: KerfSettings
): string {
  const kerfOffset = getEffectiveKerfOffset(settings);

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.width}mm" height="${sheet.height}mm" viewBox="0 0 ${sheet.width} ${sheet.height}">
  <style>
    .sheet-boundary { fill: none; stroke: #4a5568; stroke-width: 0.5; stroke-dasharray: 4,4; }
    .nominal-path { fill: none; stroke: #3182ce; stroke-width: 0.15; stroke-dasharray: 1,1; opacity: 0.6; }
    .kerf-cut-path { fill: none; stroke: #e53e3e; stroke-width: 0.2; stroke-linecap: round; stroke-linejoin: round; }
    .engrave-path { fill: none; stroke: #38a169; stroke-width: 0.15; }
    .text-label { font-family: sans-serif; font-size: 3px; fill: #a0aec0; }
  </style>

  <!-- Stock Wood Sheet Boundary (${sheet.width}x${sheet.height}mm) -->
  <rect class="sheet-boundary" x="0" y="0" width="${sheet.width}" height="${sheet.height}" />
  <text x="5" y="10" class="text-label">Kerfsoft Laser Export - Stock: ${sheet.width}x${sheet.height}mm - Kerf: ${kerfOffset.toFixed(3)}mm</text>
`;

  placements.forEach((placement, index) => {
    svgContent += `\n  <!-- Part ${index + 1}: ${placement.partName} -->\n`;
    svgContent += `  <g transform="translate(${placement.x.toFixed(2)}, ${placement.y.toFixed(2)}) rotate(${placement.rotation})">\n`;

    // 1. Nominal Design Outline (Blue dashed reference)
    const nominalOuterStr = placement.profile.outerPath
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
      .join(' ') + ' Z';
    svgContent += `    <path class="nominal-path" d="${nominalOuterStr}" />\n`;

    // 2. Kerf Compensated Cut Line (Red solid cutter path)
    const kerfOuterPath = offsetPolygon(placement.profile.outerPath, kerfOffset);
    const kerfOuterStr = kerfOuterPath
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
      .join(' ') + ' Z';
    svgContent += `    <path class="kerf-cut-path" d="${kerfOuterStr}" />\n`;

    // 3. Inner Holes with Kerf Compensation (-kerfOffset)
    placement.profile.innerHoles.forEach(hole => {
      const kerfHolePath = offsetPolygon(hole, -kerfOffset);
      const kerfHoleStr = kerfHolePath
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
        .join(' ') + ' Z';
      svgContent += `    <path class="kerf-cut-path" d="${kerfHoleStr}" />\n`;
    });

    // Part Label Engraving
    svgContent += `    <text x="0" y="0" class="text-label" text-anchor="middle">${placement.partName}</text>\n`;
    svgContent += `  </g>\n`;
  });

  svgContent += `</svg>`;
  return svgContent;
}

/**
 * Generates R12/2000 ASCII DXF file string compatible with LightBurn, AutoCAD, and VCarve.
 */
export function generateDXFExport(
  placements: NestedPartPlacement[],
  _sheet: NestingSheet,
  settings: KerfSettings
): string {
  const kerfOffset = getEffectiveKerfOffset(settings);

  let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n`;
  dxf += `0\nLAYER\n2\nCUT_KERF\n70\n0\n62\n1\n6\nCONTINUOUS\n`; // Red Layer = 1
  dxf += `0\nLAYER\n2\nNOMINAL_REF\n70\n0\n62\n5\n6\nCONTINUOUS\n`; // Blue Layer = 5
  dxf += `0\nENDTAB\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nENTITIES\n`;

  placements.forEach(p => {
    const kerfOuter = offsetPolygon(p.profile.outerPath, kerfOffset);
    
    // Write LWPOLYLINE entity for cut path
    dxf += `0\nLWPOLYLINE\n8\nCUT_KERF\n90\n${kerfOuter.length}\n70\n1\n`;
    kerfOuter.forEach(pt => {
      // Transform vertex by placement x, y
      const tx = p.x + pt.x;
      const ty = p.y + pt.y;
      dxf += `10\n${tx.toFixed(4)}\n20\n${ty.toFixed(4)}\n`;
    });

    p.profile.innerHoles.forEach(hole => {
      const kerfHole = offsetPolygon(hole, -kerfOffset);
      dxf += `0\nLWPOLYLINE\n8\nCUT_KERF\n90\n${kerfHole.length}\n70\n1\n`;
      kerfHole.forEach(pt => {
        const tx = p.x + pt.x;
        const ty = p.y + pt.y;
        dxf += `10\n${tx.toFixed(4)}\n20\n${ty.toFixed(4)}\n`;
      });
    });
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

/**
 * Triggers browser file download for generated vector strings.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
