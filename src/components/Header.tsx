import React, { useState, useRef } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { downloadSTLExport } from '../geometry/stlExporter';
import { parseSTEPFile } from '../geometry/stepParser';
import { ProjectManagerModal } from './ProjectManagerModal';
import { Box, Layers, HardDrive, Download, Printer, FolderInput } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    exportProjectJSON,
    parts,
    setParts,
    setMaterial,
    setKerfSettings,
    setJointConfig,
    material,
  } = useKerfStore();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadProject = () => {
    const jsonStr = exportProjectJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kerfsoft_project.kerf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSTL = () => {
    downloadSTLExport(parts, 'kerfsoft_3d.stl');
  };

  const handleImportFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const fileText = await file.text();

    if (fileName.endsWith('.kerf') || fileName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(fileText);
        if (parsed.material) setMaterial(parsed.material);
        if (parsed.kerfSettings) setKerfSettings(parsed.kerfSettings);
        if (parsed.jointConfig) setJointConfig(parsed.jointConfig);
        if (parsed.parts) setParts(parsed.parts);
      } catch (err) {
        console.error('Failed to parse .kerf file:', err);
      }
    } else if (fileName.endsWith('.step') || fileName.endsWith('.stp')) {
      try {
        const importedParts = parseSTEPFile(fileText, material.thickness, material.color);
        setParts(importedParts);
      } catch (err) {
        console.error('Failed to parse STEP file:', err);
      }
    }

    // Reset input value so the same file can be re-imported
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".kerf,.step,.stp,.json"
        className="hidden"
      />

      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shadow-lg select-none z-30">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-600 via-rose-600 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-950/40 border border-slate-700/50">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-amber-400 via-rose-300 to-sky-400 bg-clip-text text-transparent">
                KERFSOFT
              </span>
              <span className="bg-sky-950 text-sky-400 border border-sky-800/80 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                v0.1.1-beta
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Wood & Kerf Puzzle CAD Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4">
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

        {/* Right Controls: Local Storage, Import STEP/KERF, Export 3D STL */}
        <div className="flex items-center gap-3">
          {/* Import STEP / KERF File */}
          <button
            onClick={handleImportFileClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/80 rounded-lg text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Import .STEP or .KERF CAD File"
          >
            <FolderInput className="w-3.5 h-3.5 text-sky-400" />
            <span>Import STEP / KERF</span>
          </button>

          {/* Local Storage Button */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-slate-950 border border-emerald-900/80 hover:border-emerald-500 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 transition"
            title="Local Storage Project Manager"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>LOCAL STORAGE</span>
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
