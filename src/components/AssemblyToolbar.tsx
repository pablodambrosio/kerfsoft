import React, { useState } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { Play } from 'lucide-react';
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
    <div className="h-12 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between select-none shrink-0 w-full z-20">
      {/* Exploded View Slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-300">EXPLODE</span>
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
        <span>{isPlayingAnimation ? 'SIMULATING...' : 'EXPLODE'}</span>
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
          Shaded
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
      </div>
    </div>
  );
};
