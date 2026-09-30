import React from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { Layers, Folder, Cpu, Box, Scissors } from 'lucide-react';

export const FeatureTree: React.FC = () => {
  const {
    parts,
    selectedPartId,
    setSelectedPartId,
    material,
    kerfSettings,
    jointConfig,
  } = useKerfStore();

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col font-sans select-none overflow-hidden h-full">
      {/* Sidebar Header */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>PARAMETRIC FEATURE TREE</span>
        </div>
      </div>

      {/* Feature Nodes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Node 1: Stock Material Configuration */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Box className="w-3.5 h-3.5" />
            <span>Material Stock Node</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
            <div>Material: {material.name}</div>
            <div>Thickness (T): {material.thickness} mm</div>
          </div>
        </div>

        {/* Node 2: Kerf Compensation Engine */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-1">
            <Scissors className="w-3.5 h-3.5" />
            <span>Kerf Compensation Node</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
            <div>Laser Beam: {kerfSettings.laserBeamWidth} mm</div>
            <div>Fit Mode: <span className="text-emerald-400 font-bold uppercase">{kerfSettings.fitMode.replace('_', ' ')}</span></div>
          </div>
        </div>

        {/* Node 3: Joinery Generator */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>Finger Joint Generator</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
            <div>Tab Width: {jointConfig.fingerWidth} mm</div>
            <div>Corners: {jointConfig.cornerRelief}</div>
          </div>
        </div>

        {/* Part Components Section */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 px-1">
            <span>COMPONENTS ({parts.length})</span>
            <Folder className="w-3.5 h-3.5" />
          </div>

          <div className="space-y-1">
            {parts.map((part) => {
              const isSelected = part.id === selectedPartId;
              return (
                <div
                  key={part.id}
                  onClick={() => setSelectedPartId(part.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition border ${
                    isSelected
                      ? 'bg-sky-950 border-sky-600 text-sky-200 font-medium'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-700 shrink-0"
                      style={{ backgroundColor: part.color }}
                    />
                    <span className="truncate">{part.name}</span>
                  </div>
                  {part.isInterlocking && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">
                      JOINED
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
