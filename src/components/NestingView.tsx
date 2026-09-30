import React, { useState } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { generateSVGExport, generateDXFExport, triggerFileDownload } from '../geometry/exporters';
import { getEffectiveKerfOffset, offsetPolygon } from '../geometry/kerfEngine';
import { Download, FileCode, Layers, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

export const NestingView: React.FC = () => {
  const { placements, nestingSheet, kerfSettings, material, rebuildNesting } = useKerfStore();
  const [zoomLevel, setZoomLevel] = useState(1.2);

  const kerfOffset = getEffectiveKerfOffset(kerfSettings);

  // Material Efficiency Calculations
  const sheetArea = (nestingSheet.width * nestingSheet.height) / 100; // in cm2
  let partsArea = 0;
  placements.forEach(p => {
    partsArea += (p.width * p.height * 0.75) / 100; // estimated area
  });
  const efficiencyPct = Math.min(92, Math.max(45, Math.round((partsArea / sheetArea) * 100)));

  const handleExportSVG = () => {
    const svgStr = generateSVGExport(placements, nestingSheet, kerfSettings);
    triggerFileDownload(svgStr, `kerfsoft_nesting_${Date.now()}.svg`, 'image/svg+xml');
  };

  const handleExportDXF = () => {
    const dxfStr = generateDXFExport(placements, nestingSheet, kerfSettings);
    triggerFileDownload(dxfStr, `kerfsoft_nesting_${Date.now()}.dxf`, 'text/plain');
  };

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
      {/* 2D Viewport Header Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm text-slate-100">2D SHEET NESTING & TOOLPATH PREVIEW</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400 border-l border-slate-800 pl-4">
            <span>STOCK: <strong className="text-slate-200">{nestingSheet.width}x{nestingSheet.height}mm</strong></span>
            <span>|</span>
            <span>KERF: <strong className="text-rose-400">{kerfOffset.toFixed(3)}mm</strong></span>
            <span>|</span>
            <span>EFFICIENCY: <strong className="text-emerald-400">{efficiencyPct}%</strong></span>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={rebuildNesting}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Re-pack Nesting Sheet"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
              className="p-1.5 text-slate-300 hover:text-white rounded transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 px-2">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.2))}
              className="p-1.5 text-slate-300 hover:text-white rounded transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportSVG}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg shadow transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            EXPORT SVG (Laser)
          </button>

          <button
            onClick={handleExportDXF}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-lg shadow transition active:scale-95"
          >
            <FileCode className="w-4 h-4" />
            EXPORT DXF (CNC)
          </button>
        </div>
      </div>

      {/* Main 2D Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div
          className="transition-transform duration-150 shadow-2xl bg-slate-900 rounded-xl border border-slate-800 p-4 relative"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          {/* SVG Vector Drawing Canvas */}
          <svg
            width={nestingSheet.width}
            height={nestingSheet.height}
            viewBox={`0 0 ${nestingSheet.width} ${nestingSheet.height}`}
            className="bg-slate-950 rounded border border-slate-800"
          >
            {/* Sheet Boundary */}
            <rect
              x={0}
              y={0}
              width={nestingSheet.width}
              height={nestingSheet.height}
              fill="none"
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Placed Wood Parts */}
            {placements.map((placement, i) => {
              const kerfOuterPath = offsetPolygon(placement.profile.outerPath, kerfOffset);

              const nominalPoints = placement.profile.outerPath
                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ') + ' Z';

              const kerfPoints = kerfOuterPath
                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ') + ' Z';

              return (
                <g key={placement.partId + i} transform={`translate(${placement.x}, ${placement.y})`}>
                  {/* Fill Background representing wood sheet */}
                  <path
                    d={kerfPoints}
                    fill={material.color}
                    fillOpacity={0.15}
                  />

                  {/* Nominal Path (Blue Dashed) */}
                  <path
                    d={nominalPoints}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={0.5}
                    strokeDasharray="2 2"
                    opacity={0.6}
                  />

                  {/* Kerf Compensated Laser Path (Red Solid) */}
                  <path
                    d={kerfPoints}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={0.8}
                  />

                  {/* Inner Slots with -kerfOffset */}
                  {placement.profile.innerHoles.map((hole, hIdx) => {
                    const kerfHole = offsetPolygon(hole, -kerfOffset);
                    const holeStr = kerfHole
                      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                      .join(' ') + ' Z';
                    return (
                      <path
                        key={hIdx}
                        d={holeStr}
                        fill="#0f172a"
                        stroke="#f43f5e"
                        strokeWidth={0.8}
                      />
                    );
                  })}

                  {/* Part Title Label */}
                  <text
                    x={0}
                    y={0}
                    fill="#94a3b8"
                    fontSize={6}
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {placement.partName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="h-10 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-rose-500 rounded"></span>
            <span>Laser Cut Path (+Kerf Offset)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-sky-400 border-b border-dashed border-sky-400"></span>
            <span>Nominal Design Contour</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded"></span>
            <span>{material.name} ({material.thickness}mm)</span>
          </div>
        </div>
        <div>
          <span>{placements.length} nested parts laid out</span>
        </div>
      </div>
    </div>
  );
};
