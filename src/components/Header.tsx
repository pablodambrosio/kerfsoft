import React, { useState } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { downloadSTLExport } from '../geometry/stlExporter';
import { ProjectManagerModal } from './ProjectManagerModal';
import { Box, Layers, Edit3, HardDrive, Download, Sparkles, Printer } from 'lucide-react';
import type { ModelPreset } from '../types/cad';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedPreset,
    setSelectedPreset,
    exportProjectJSON,
    parts,
  } = useKerfStore();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const handleDownloadProject = () => {
    const jsonStr = exportProjectJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kerfsoft_project_${selectedPreset}.kerf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSTL = () => {
    downloadSTLExport(parts, `kerfsoft_${selectedPreset}_3d.stl`);
  };

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shadow-lg select-none z-30">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 via-rose-600 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-950/40 border border-slate-700/50">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-amber-400 via-rose-300 to-sky-400 bg-clip-text text-transparent">
                KERFSOFT 3D
              </span>
              <span className="bg-sky-950 text-sky-400 border border-sky-800/80 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                v1.0 RAM
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Wood & Kerf Puzzle CAD Platform</p>
          </div>
        </div>

        {/* Preset Model Selector & Navigation Tabs */}
        <div className="flex items-center gap-4">
          {/* Preset Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">MODEL:</span>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value as ModelPreset)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="storage_crate" className="bg-slate-900">Parametric Storage Box (Finger Joints)</option>
              <option value="puzzle_cube" className="bg-slate-900">3D Interlocking Burr Puzzle</option>
              <option value="phone_stand" className="bg-slate-900">Interlocking Phone Stand</option>
              <option value="custom_sketch" className="bg-slate-900">Custom 2D Sketch Panel</option>
            </select>
          </div>

          {/* Workspace Tab Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab('3d_cad')}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === '3d_cad'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              3D CAD Viewport
            </button>

            <button
              onClick={() => setActiveTab('2d_sketch')}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === '2d_sketch'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              2D Sketcher
            </button>

            <button
              onClick={() => setActiveTab('2d_nesting')}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === '2d_nesting'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2D Sheet Nesting
            </button>
          </div>
        </div>

        {/* Right Controls: Local OPFS Manager & Export 3D STL */}
        <div className="flex items-center gap-3">
          {/* Local-First OPFS Storage Button */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-slate-950 border border-emerald-900/80 hover:border-emerald-500 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 transition"
            title="OPFS Local Storage Project Manager"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>OPFS STORAGE</span>
          </button>

          {/* Export 3D STL File */}
          <button
            onClick={handleExportSTL}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg shadow transition active:scale-95"
            title="Export 3D Printable STL File"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export 3D STL</span>
          </button>

          {/* Save Project JSON */}
          <button
            onClick={handleDownloadProject}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition active:scale-95 shadow-sm"
            title="Save Kerfsoft Project (.kerf JSON)"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Save .kerf</span>
          </button>
        </div>
      </header>

      {/* OPFS Local Project Manager Modal */}
      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </>
  );
};
