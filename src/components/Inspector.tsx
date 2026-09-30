import React from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { MATERIAL_PRESETS, getEffectiveKerfOffset } from '../geometry/kerfEngine';
import { Sliders, Scissors, Box, Layers, Cpu } from 'lucide-react';
import type { FitMode, CornerRelief } from '../types/cad';

export const Inspector: React.FC = () => {
  const {
    material,
    setMaterial,
    kerfSettings,
    setKerfSettings,
    jointConfig,
    setJointConfig,
    crateDimensions,
    setCrateDimensions,
    selectedPreset,
  } = useKerfStore();

  const effectiveKerf = getEffectiveKerfOffset(kerfSettings);

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col font-sans select-none overflow-hidden h-full">
      {/* Inspector Header */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>PARAMETRIC PROPERTIES & KERF</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 1. Wood Material & Thickness Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 border-b border-slate-800 pb-1">
            <Box className="w-4 h-4" />
            <span>1. MATERIAL STOCK</span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Preset Material</label>
            <select
              value={material.id}
              onChange={(e) => setMaterial(MATERIAL_PRESETS[e.target.value])}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {Object.values(MATERIAL_PRESETS).map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name} ({mat.thickness}mm)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Sheet Thickness (T)</span>
              <span className="font-mono text-amber-400 font-bold">{material.thickness} mm</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={15.0}
              step={0.5}
              value={material.thickness}
              onChange={(e) => setMaterial({ ...material, thickness: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 2. Manufacturing Machine Mode & Kerf Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
              <Scissors className="w-4 h-4" />
              <span>2. CUTTER & CORNER RELIEFS</span>
            </div>
            <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
              OFFSET: {effectiveKerf > 0 ? `+${effectiveKerf.toFixed(3)}` : effectiveKerf.toFixed(3)} mm
            </span>
          </div>

          {/* Machine Mode Selector */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Manufacturing Mode</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setKerfSettings({ machineMode: 'laser_cut', cornerRelief: 'none' })}
                className={`py-1.5 text-xs font-bold rounded capitalize transition ${
                  kerfSettings.machineMode === 'laser_cut'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Laser Cutting
              </button>

              <button
                onClick={() => setKerfSettings({ machineMode: 'cnc_router', cornerRelief: 'dog_bone' })}
                className={`py-1.5 text-xs font-bold rounded capitalize transition ${
                  kerfSettings.machineMode === 'cnc_router'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CNC Router
              </button>
            </div>
          </div>

          {/* Laser Beam Width / CNC Bit Diameter */}
          {kerfSettings.machineMode === 'laser_cut' ? (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Laser Beam Width (Kerf)</span>
                <span className="font-mono text-rose-400 font-bold">{kerfSettings.laserBeamWidth} mm</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.40}
                step={0.01}
                value={kerfSettings.laserBeamWidth}
                onChange={(e) => setKerfSettings({ laserBeamWidth: parseFloat(e.target.value) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>CNC Endmill Bit Diameter</span>
                <span className="font-mono text-amber-400 font-bold">{kerfSettings.toolDiameter} mm</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={6.35}
                step={0.05}
                value={kerfSettings.toolDiameter}
                onChange={(e) => setKerfSettings({ toolDiameter: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <button onClick={() => setKerfSettings({ toolDiameter: 3.175 })} className="hover:text-amber-400">1/8" (3.175mm)</button>
                <button onClick={() => setKerfSettings({ toolDiameter: 4.0 })} className="hover:text-amber-400">4.0mm</button>
                <button onClick={() => setKerfSettings({ toolDiameter: 6.35 })} className="hover:text-amber-400">1/4" (6.35mm)</button>
              </div>
            </div>
          )}

          {/* CNC Corner Relief Overcut Type */}
          {kerfSettings.machineMode === 'cnc_router' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">CNC Corner Relief Overcut</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['none', 'dog_bone', 't_bone'] as CornerRelief[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setKerfSettings({ cornerRelief: type })}
                    className={`py-1.5 text-[11px] font-bold rounded capitalize transition ${
                      kerfSettings.cornerRelief === type
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fit Mode Selector */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Joint Fit Tolerance</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['press_fit', 'snug_fit', 'loose_fit'] as FitMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setKerfSettings({ fitMode: mode })}
                  className={`py-1.5 text-[11px] font-bold rounded capitalize transition ${
                    kerfSettings.fitMode === mode
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Interlocking Finger Joint Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 border-b border-slate-800 pb-1">
            <Cpu className="w-4 h-4" />
            <span>3. FINGER JOINTS</span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Target Finger Tab Width</span>
              <span className="font-mono text-sky-400 font-bold">{jointConfig.fingerWidth} mm</span>
            </div>
            <input
              type="range"
              min={6.0}
              max={30.0}
              step={1.0}
              value={jointConfig.fingerWidth}
              onChange={(e) => setJointConfig({ fingerWidth: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Model Dimensions (Box Storage Crate preset) */}
        {selectedPreset === 'storage_crate' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1">
              <Layers className="w-4 h-4" />
              <span>4. BOX DIMENSIONS</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Box Length (L)</span>
                <span className="font-mono text-emerald-400 font-bold">{crateDimensions.length} mm</span>
              </div>
              <input
                type="range"
                min={60}
                max={300}
                step={5}
                value={crateDimensions.length}
                onChange={(e) => setCrateDimensions({ length: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Box Width (W)</span>
                <span className="font-mono text-emerald-400 font-bold">{crateDimensions.width} mm</span>
              </div>
              <input
                type="range"
                min={60}
                max={250}
                step={5}
                value={crateDimensions.width}
                onChange={(e) => setCrateDimensions({ width: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Box Height (H)</span>
                <span className="font-mono text-emerald-400 font-bold">{crateDimensions.height} mm</span>
              </div>
              <input
                type="range"
                min={40}
                max={200}
                step={5}
                value={crateDimensions.height}
                onChange={(e) => setCrateDimensions({ height: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
