import { create } from 'zustand';
import type {
  WoodPart,
  MaterialConfig,
  KerfSettings,
  JointConfig,
  ModelPreset,
  ActiveTab,
  NestingSheet,
  NestedPartPlacement
} from '../types/cad';
import {
  MATERIAL_PRESETS,
  generateStorageCratePreset,
  generateBurrPuzzlePreset,
  generatePhoneStandPreset,
} from '../geometry/kerfEngine';
import type { SketchProfile, EdgeJointSettings } from '../types/sketch';
import { createDefaultRectangleSketch, convertSketchToWoodPart } from '../geometry/sketchKernel';

interface KerfState {
  // Navigation & View Mode
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedPreset: ModelPreset;
  setSelectedPreset: (preset: ModelPreset) => void;

  // Custom 2D Sketch State
  activeSketch: SketchProfile;
  selectedEdgeId: string | null;
  setSelectedEdgeId: (id: string | null) => void;
  updateEdgeJoint: (edgeId: string, jointSettings: Partial<EdgeJointSettings>) => void;
  updateSketchVertex: (vertexId: string, x: number, y: number) => void;

  viewMode: 'shaded' | 'wireframe' | 'kerf_preview';
  setViewMode: (mode: 'shaded' | 'wireframe' | 'kerf_preview') => void;

  explodedViewFactor: number;
  setExplodedViewFactor: (factor: number) => void;

  selectedPartId: string | null;
  setSelectedPartId: (id: string | null) => void;

  // Parametric Model Settings
  material: MaterialConfig;
  setMaterial: (material: MaterialConfig) => void;

  kerfSettings: KerfSettings;
  setKerfSettings: (settings: Partial<KerfSettings>) => void;

  jointConfig: JointConfig;
  setJointConfig: (joint: Partial<JointConfig>) => void;

  crateDimensions: { length: number; width: number; height: number };
  setCrateDimensions: (dims: Partial<{ length: number; width: number; height: number }>) => void;

  // Computed Parts & Nesting Layout
  parts: WoodPart[];
  nestingSheet: NestingSheet;
  placements: NestedPartPlacement[];
  
  // Actions
  rebuildParts: () => void;
  rebuildNesting: () => void;
  exportProjectJSON: () => string;
}

export const useKerfStore = create<KerfState>((set, get) => ({
  activeTab: '3d_cad',
  setActiveTab: (activeTab) => set({ activeTab }),

  selectedPreset: 'storage_crate',
  setSelectedPreset: (selectedPreset) => {
    set({ selectedPreset });
    get().rebuildParts();
  },

  // Custom 2D Sketch State
  activeSketch: createDefaultRectangleSketch(120, 90),
  selectedEdgeId: null,
  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId }),

  updateEdgeJoint: (edgeId, jointSettings) => {
    set((state) => {
      const newEdges = state.activeSketch.edges.map((e) => {
        if (e.id === edgeId) {
          return { ...e, joint: { ...e.joint, ...jointSettings } };
        }
        return e;
      });
      return {
        activeSketch: { ...state.activeSketch, edges: newEdges },
      };
    });
    get().rebuildParts();
  },

  updateSketchVertex: (vertexId, x, y) => {
    set((state) => {
      const newVertices = state.activeSketch.vertices.map((v) =>
        v.id === vertexId ? { ...v, x, y } : v
      );
      return {
        activeSketch: { ...state.activeSketch, vertices: newVertices },
      };
    });
    get().rebuildParts();
  },

  viewMode: 'shaded',
  setViewMode: (viewMode) => set({ viewMode }),

  explodedViewFactor: 0.0,
  setExplodedViewFactor: (explodedViewFactor) => set({ explodedViewFactor }),

  selectedPartId: null,
  setSelectedPartId: (selectedPartId) => set({ selectedPartId }),

  // Default Birch Plywood 4.0mm
  material: MATERIAL_PRESETS.birch_plywood,
  setMaterial: (material) => {
    set({ material });
    get().rebuildParts();
  },

  // Default Laser Beam Kerf: 0.15mm
  kerfSettings: {
    machineMode: 'laser_cut',
    laserBeamWidth: 0.15,
    fitMode: 'snug_fit',
    clearanceAllowance: 0.0,
    cornerRelief: 'none',
    toolDiameter: 3.175, // 1/8" CNC router bit
  },
  setKerfSettings: (newSettings) => {
    set((state) => ({
      kerfSettings: { ...state.kerfSettings, ...newSettings }
    }));
    get().rebuildNesting();
  },

  jointConfig: {
    type: 'finger_box',
    fingerWidth: 12.0,
    fingerCountAuto: true,
    fingerCount: 5,
    chamferLeadIn: 0.5,
    cornerRelief: 'none',
  },
  setJointConfig: (newJoint) => {
    set((state) => ({
      jointConfig: { ...state.jointConfig, ...newJoint }
    }));
    get().rebuildParts();
  },

  crateDimensions: {
    length: 140,
    width: 100,
    height: 80,
  },
  setCrateDimensions: (newDims) => {
    set((state) => ({
      crateDimensions: { ...state.crateDimensions, ...newDims }
    }));
    get().rebuildParts();
  },

  parts: [],

  nestingSheet: {
    width: 600,
    height: 400,
    margin: 15,
    partSpacing: 8,
  },

  placements: [],

  // Re-evaluates 3D parts based on active parameters
  rebuildParts: () => {
    const { selectedPreset, crateDimensions, material, jointConfig, activeSketch } = get();
    let newParts: WoodPart[] = [];

    if (selectedPreset === 'storage_crate') {
      newParts = generateStorageCratePreset(crateDimensions, material, jointConfig);
    } else if (selectedPreset === 'puzzle_cube') {
      newParts = generateBurrPuzzlePreset(material);
    } else if (selectedPreset === 'phone_stand') {
      newParts = generatePhoneStandPreset(material);
    } else if (selectedPreset === 'custom_sketch') {
      newParts = [convertSketchToWoodPart(activeSketch, material.thickness, material.color)];
    }

    set({ parts: newParts });
    get().rebuildNesting();
  },

  // 2D Bin Packing & Nesting layout calculation
  rebuildNesting: () => {
    const { parts, nestingSheet } = get();
    const placements: NestedPartPlacement[] = [];

    let currentX = nestingSheet.margin + 60;
    let currentY = nestingSheet.margin + 60;
    let maxRowHeight = 0;

    parts.forEach((part, _index) => {
      // Calculate part bounding box
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      part.profile.outerPath.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });

      const pWidth = (maxX - minX) + 10;
      const pHeight = (maxY - minY) + 10;

      if (currentX + pWidth > nestingSheet.width - nestingSheet.margin) {
        currentX = nestingSheet.margin + 60;
        currentY += maxRowHeight + nestingSheet.partSpacing;
        maxRowHeight = 0;
      }

      placements.push({
        partId: part.id,
        partName: part.name,
        x: currentX,
        y: currentY,
        rotation: 0,
        width: pWidth,
        height: pHeight,
        profile: part.profile,
      });

      currentX += pWidth + nestingSheet.partSpacing;
      if (pHeight > maxRowHeight) maxRowHeight = pHeight;
    });

    set({ placements });
  },

  exportProjectJSON: () => {
    const { selectedPreset, material, kerfSettings, jointConfig, crateDimensions } = get();
    return JSON.stringify(
      {
        version: '1.0.0',
        generator: 'Kerfsoft 3D CAD',
        preset: selectedPreset,
        material,
        kerfSettings,
        jointConfig,
        crateDimensions,
      },
      null,
      2
    );
  }
}));

// Initialize initial parts on load
useKerfStore.getState().rebuildParts();
