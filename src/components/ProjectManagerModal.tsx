import React, { useEffect, useState } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import {
  listOPFSProjects,
  saveProjectToOPFS,
  loadProjectFromOPFS,
  deleteOPFSProject,
} from '../storage/opfsStorage';
import type { OPFSProjectMeta } from '../storage/opfsStorage';
import { HardDrive, X, Save, FolderOpen, Trash2, Clock, FileCheck } from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ isOpen, onClose }) => {
  const { exportProjectJSON, selectedPreset } = useKerfStore();
  const [opfsProjects, setOpfsProjects] = useState<OPFSProjectMeta[]>([]);
  const [newProjectName, setNewProjectName] = useState(`kerfsoft_${selectedPreset}`);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const refreshProjectList = async () => {
    const list = await listOPFSProjects();
    setOpfsProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshProjectList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveToOPFS = async () => {
    if (!newProjectName.trim()) return;
    const jsonStr = exportProjectJSON();
    const success = await saveProjectToOPFS(newProjectName, jsonStr);
    if (success) {
      setSaveSuccessMsg(`Saved '${newProjectName}' to OPFS storage!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      refreshProjectList();
    }
  };

  const handleLoadFromOPFS = async (filename: string) => {
    const jsonStr = await loadProjectFromOPFS(filename);
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.preset) {
          useKerfStore.getState().setSelectedPreset(parsed.preset);
        }
        if (parsed.material) {
          useKerfStore.getState().setMaterial(parsed.material);
        }
        if (parsed.kerfSettings) {
          useKerfStore.getState().setKerfSettings(parsed.kerfSettings);
        }
        if (parsed.crateDimensions) {
          useKerfStore.getState().setCrateDimensions(parsed.crateDimensions);
        }
        setSaveSuccessMsg(`Loaded '${filename}' successfully!`);
        setTimeout(() => setSaveSuccessMsg(''), 3000);
        onClose();
      } catch (err) {
        console.error('Failed to parse project JSON:', err);
      }
    }
  };

  const handleDeleteFromOPFS = async (filename: string) => {
    const success = await deleteOPFSProject(filename);
    if (success) {
      refreshProjectList();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="h-14 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-950 border border-emerald-800/80 rounded-lg flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">OPFS LOCAL STORAGE MANAGER</h3>
              <p className="text-[10px] font-mono text-emerald-400">100% In-Browser Memory File Persistence</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {saveSuccessMsg && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-3 py-2 rounded-lg flex items-center gap-2 font-mono">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Save Current Project Section */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold block">Save Active Project to OPFS</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project Name..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                onClick={handleSaveToOPFS}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg shadow transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Local</span>
              </button>
            </div>
          </div>

          {/* OPFS Saved Files List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-slate-800 pb-1">
              <span>SAVED OPFS PROJECTS ({opfsProjects.length})</span>
              <Clock className="w-3.5 h-3.5" />
            </div>

            {opfsProjects.length > 0 ? (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {opfsProjects.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-bold text-slate-200 font-mono truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(file.updatedAt).toLocaleDateString()} - {(file.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleLoadFromOPFS(file.name)}
                        className="px-2.5 py-1 bg-sky-950 border border-sky-800/60 text-sky-300 hover:bg-sky-900 text-[11px] font-semibold rounded transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteFromOPFS(file.name)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition"
                        title="Delete File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-6 text-center text-xs text-slate-500">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                <p>No saved projects in OPFS storage yet. Type a name above and click 'Save Local'!</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 bg-slate-950 border-t border-slate-800 px-6 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
