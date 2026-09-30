import React, { useState } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { Play, SlidersHorizontal } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AssemblyToolbar: React.FC = () => {
  const {
    explodedViewFactor,
    setExplodedViewFactor,
    viewMode,
    setViewMode,
  } = useKerfStore();

  const [isPlayingAnimation, setIsPlayingAnimation] = useState(false);

  // Smooth Exploded View Assembly Animation
  const handlePlayAnimation = () => {
    if (isPlayingAnimation) return;
    setIsPlayingAnimation(true);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.04;
      if (progress <= 1.0) {
        setExplodedViewFactor(Math.sin(progress * Math.PI));
      } else {
        clearInterval(interval);
        setExplodedViewFactor(0.0);
        setIsPlayingAnimation(false);

        // Confetti effect on puzzle assembly completion!
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    }, 40);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl px-5 py-2.5 flex items-center gap-6 shadow-2xl z-20 select-none">
      {/* Exploded View Slider */}
      <div className="flex items-center gap-3">
        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-slate-300">EXPLODED VIEW</span>
        <input
          type="range"
          min={0.0}
          max={1.0}
          step={0.01}
          value={explodedViewFactor}
          onChange={(e) => setExplodedViewFactor(parseFloat(e.target.value))}
          className="w-32 accent-amber-500 cursor-pointer"
        />
        <span className="text-xs font-mono text-amber-400 w-8">{Math.round(explodedViewFactor * 100)}%</span>
      </div>

      <div className="w-px h-6 bg-slate-800" />

      {/* Assembly Kinematic Animation Play Button */}
      <button
        onClick={handlePlayAnimation}
        disabled={isPlayingAnimation}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
          isPlayingAnimation
            ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
            : 'bg-amber-600 hover:bg-amber-500 text-white shadow active:scale-95'
        }`}
      >
        <Play className={`w-3.5 h-3.5 ${isPlayingAnimation ? 'animate-spin' : ''}`} />
        <span>{isPlayingAnimation ? 'SIMULATING...' : 'TEST ASSEMBLY FIT'}</span>
      </button>

      <div className="w-px h-6 bg-slate-800" />

      {/* View Mode Options */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setViewMode('shaded')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            viewMode === 'shaded'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Shaded Wood
        </button>

        <button
          onClick={() => setViewMode('wireframe')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            viewMode === 'wireframe'
              ? 'bg-sky-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Wireframe
        </button>

        <button
          onClick={() => setViewMode('kerf_preview')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            viewMode === 'kerf_preview'
              ? 'bg-rose-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Kerf Preview
        </button>
      </div>
    </div>
  );
};
