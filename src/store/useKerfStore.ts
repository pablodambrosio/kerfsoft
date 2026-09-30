import { create } from 'zustand';
import type {
  WoodPart,
  MaterialConfig,
  KerfSettings,
  JointConfig,
  ActiveTab,
  NestingSheet,
  NestedPartPlacement
} from '../types/cad';
import { MATERIAL_PRESETS } from '../geometry/kerfEngine';

interface KerfState {
  // Navigation & View Mode
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  viewMode: 'shaded' | 'wireframe';
  setViewMode: (mode: 'shaded' | 'wireframe') => void;

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

  // Computed Parts & Nesting Layout
  parts: WoodPart[];
  setParts: (parts: WoodPart[]) => void;
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

  parts: [],
  setParts: (parts) => {
    set({ parts });
    get().rebuildNesting();
  },

  nestingSheet: {
    width: 600,
    height: 400,
    margin: 15,
    partSpacing: 8,
  },

  placements: [],

  // Re-evaluates nesting for active parts
  rebuildParts: () => {
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
    const { material, kerfSettings, jointConfig, parts } = get();
    return JSON.stringify(
      {
        version: '1.0.0',
        generator: 'Kerfsoft CAD',
        material,
        kerfSettings,
        jointConfig,
        parts,
      },
      null,
      2
    );
  }
}));

// Initialize initial parts on load
useKerfStore.getState().rebuildParts();


