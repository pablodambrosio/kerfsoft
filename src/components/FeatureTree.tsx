import React from 'react';
import { Layers } from 'lucide-react';

export const FeatureTree: React.FC = () => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col font-sans select-none overflow-hidden h-full">
      {/* Sidebar Header */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>COMPONENTS</span>
        </div>
      </div>

      {/* Components Container (Empty) */}
      <div className="flex-1 overflow-y-auto p-3">
      </div>
    </div>
  );
};

