import React, { useState } from 'react';
import { useKerfStore } from '../store/useKerfStore';
import { Edit3, MousePointer, Paintbrush, Scissors } from 'lucide-react';
import type { SketchTool } from '../types/sketch';
import type { JointType } from '../types/cad';

export const SketchEditor: React.FC = () => {
  const {
    activeSketch,
    selectedEdgeId,
    setSelectedEdgeId,
    updateEdgeJoint,
    updateSketchVertex,
    setSelectedPreset,
  } = useKerfStore();

  const [activeTool, setActiveTool] = useState<SketchTool>('select');
  const [draggedVertexId, setDraggedVertexId] = useState<string | null>(null);

  // Switch to custom_sketch model preset automatically when sketching
  const handleStartSketching = () => {
    setSelectedPreset('custom_sketch');
  };

  // Drag vertex logic
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedVertexId) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const rawX = e.clientX - rect.left - rect.width / 2;
    const rawY = e.clientY - rect.top - rect.height / 2;

    // Grid snap to nearest 5mm
    const snappedX = Math.round(rawX / 5) * 5;
    const snappedY = Math.round(rawY / 5) * 5;

    updateSketchVertex(draggedVertexId, snappedX, snappedY);
    handleStartSketching();
  };

  const selectedEdge = activeSketch.edges.find((e) => e.id === selectedEdgeId);

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col font-sans select-none overflow-hidden">
      {/* 2D Sketcher Top Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <span>2D SKETCHER & EDGE JOINT PAINTER</span>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTool('select')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                activeTool === 'select'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Select & Drag Vertices</span>
            </button>

            <button
              onClick={() => setActiveTool('joint_painter')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition ${
                activeTool === 'joint_painter'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Paint Edge Joints</span>
            </button>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 border-l border-slate-800 pl-4">
          <span>VERTICES: <strong className="text-amber-400">{activeSketch.vertices.length}</strong></span>
          <span className="mx-2">|</span>
          <span>EDGES: <strong className="text-sky-400">{activeSketch.edges.length}</strong></span>
        </div>
      </div>

      {/* Main Canvas & Edge Joint Inspector Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* SVG Drawing Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
          <svg
            width={700}
            height={500}
            viewBox="-350 -250 700 500"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setDraggedVertexId(null)}
            className="cursor-crosshair bg-slate-950/80 rounded-2xl border border-slate-800 shadow-2xl"
          >
            {/* Grid Crosshair Axes */}
            <line x1={-350} y1={0} x2={350} y2={0} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" />
            <line x1={0} y1={-250} x2={0} y2={250} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" />

            {/* Inner Slots */}
            {activeSketch.innerHoles.map((hole, hIdx) => {
              const ptsStr = hole.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
              return <path key={hIdx} d={ptsStr} fill="#0f172a" stroke="#f43f5e" strokeWidth={1.5} />;
            })}

            {/* Render Sketch Edges */}
            {activeSketch.edges.map((edge) => {
              const startV = activeSketch.vertices.find((v) => v.id === edge.startVertexId);
              const endV = activeSketch.vertices.find((v) => v.id === edge.endVertexId);
              if (!startV || !endV) return null;

              const isSelected = edge.id === selectedEdgeId;
              const hasJoint = edge.joint && edge.joint.enabled;

              return (
                <g key={edge.id} className="cursor-pointer">
                  {/* Clickable hit area edge line */}
                  <line
                    x1={startV.x}
                    y1={startV.y}
                    x2={endV.x}
                    y2={endV.y}
                    stroke={isSelected ? '#38bdf8' : hasJoint ? '#f43f5e' : '#64748b'}
                    strokeWidth={isSelected ? 4 : hasJoint ? 3 : 2}
                    strokeDasharray={hasJoint ? '6 3' : 'none'}
                    onClick={() => {
                      setSelectedEdgeId(edge.id);
                      handleStartSketching();
                    }}
                  />

                  {/* Midpoint Edge Joint Badge */}
                  {hasJoint && (
                    <circle
                      cx={(startV.x + endV.x) / 2}
                      cy={(startV.y + endV.y) / 2}
                      r={6}
                      fill="#f43f5e"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}

            {/* Render Sketch Vertices */}
            {activeSketch.vertices.map((v) => (
              <g key={v.id}>
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={7}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="cursor-grab hover:scale-125 transition-transform"
                  onMouseDown={() => {
                    setDraggedVertexId(v.id);
                    handleStartSketching();
                  }}
                />
                <text
                  x={v.x + 10}
                  y={v.y - 10}
                  fill="#94a3b8"
                  fontSize={10}
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  ({v.x}, {v.y})
                </text>
              </g>
            ))}
          </svg>

          {/* Canvas Bottom Instructions Overlay */}
          <div className="absolute bottom-4 left-6 text-xs font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg backdrop-blur shadow-xl">
            <span>DRAG AMBER VERTICES TO RESHAPE | CLICK ANY EDGE TO APPLY FINGER JOINTS</span>
          </div>
        </div>

        {/* Right Side: Edge Joint Painter Inspector Panel */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 p-5 flex flex-col space-y-5 overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400 border-b border-slate-800 pb-2">
            <Paintbrush className="w-4 h-4" />
            <span>EDGE JOINT PAINTER</span>
          </div>

          {selectedEdge ? (
            <div className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                <div className="text-slate-400">EDGE ID: <strong className="text-slate-200">{selectedEdge.id}</strong></div>
              </div>

              {/* Toggle Joint Enable */}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Interlocking Joint</span>
                <button
                  onClick={() =>
                    updateEdgeJoint(selectedEdge.id, { enabled: !selectedEdge.joint.enabled })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    selectedEdge.joint.enabled
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {selectedEdge.joint.enabled ? 'ENABLED' : 'PLAIN CUT'}
                </button>
              </div>

              {selectedEdge.joint.enabled && (
                <>
                  {/* Joint Type */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Joint Type</label>
                    <select
                      value={selectedEdge.joint.type}
                      onChange={(e) =>
                        updateEdgeJoint(selectedEdge.id, { type: e.target.value as JointType })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-rose-500"
                    >
                      <option value="finger_box">Finger / Box Joint</option>
                      <option value="dovetail">Dovetail Joint</option>
                      <option value="mortise_tenon">Mortise & Tenon</option>
                    </select>
                  </div>

                  {/* Orientation: Male vs Female */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Tab Orientation</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        onClick={() => updateEdgeJoint(selectedEdge.id, { isMale: true })}
                        className={`py-1.5 text-xs font-bold rounded transition ${
                          selectedEdge.joint.isMale
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Male (Tabs Out)
                      </button>
                      <button
                        onClick={() => updateEdgeJoint(selectedEdge.id, { isMale: false })}
                        className={`py-1.5 text-xs font-bold rounded transition ${
                          !selectedEdge.joint.isMale
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Female (Slots In)
                      </button>
                    </div>
                  </div>

                  {/* Finger Width Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Finger Width</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {selectedEdge.joint.fingerWidth} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={30}
                      step={1}
                      value={selectedEdge.joint.fingerWidth}
                      onChange={(e) =>
                        updateEdgeJoint(selectedEdge.id, {
                          fingerWidth: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-6 text-center text-xs text-slate-500">
              <Scissors className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p>Click on any edge line in the canvas to paint interlocking finger joints or change tab width.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
