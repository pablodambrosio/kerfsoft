import React from 'react';
import { Sliders } from 'lucide-react';

export const Inspector: React.FC = () => {
  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col font-sans select-none overflow-hidden h-full">
      {/* Inspector Header */}
      <div className="h-10 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>PROPERTIES</span>
        </div>
      </div>

      {/* Properties Box (Empty) */}
      <div className="flex-1 overflow-y-auto p-4">
      </div>
    </div>
  );
};

