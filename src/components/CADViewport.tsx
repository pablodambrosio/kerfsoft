import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useKerfStore } from '../store/useKerfStore';
import { createWoodPartGeometry } from '../geometry/kerfEngine';
import { Box } from 'lucide-react';

export const CADViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const partsGroupRef = useRef<THREE.Group | null>(null);

  const {
    parts,
    kerfSettings,
    explodedViewFactor,
    viewMode,
    selectedPartId,
    setSelectedPartId,
  } = useKerfStore();

  // Initialize Three.js Scene, Camera, Renderer & Orbit Controls
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Slate dark background
    scene.fog = new THREE.FogExp2('#0f172a', 0.0015);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(220, 180, 260);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't flip under grid
    controls.target.set(0, 30, 0);
    controlsRef.current = controls;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight('#ffffff', 1.2);
    dirLight1.position.set(150, 250, 150);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 10;
    dirLight1.shadow.camera.far = 600;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight('#94a3b8', 0.4);
    dirLight2.position.set(-150, 100, -150);
    scene.add(dirLight2);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(400, 40, '#334155', '#1e293b');
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // Group for 3D Wood Parts
    const partsGroup = new THREE.Group();
    scene.add(partsGroup);
    partsGroupRef.current = partsGroup;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const container = containerRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update 3D Wood Part Meshes whenever parts, kerfSettings, explodedViewFactor, or viewMode changes
  useEffect(() => {
    if (!partsGroupRef.current) return;
    const group = partsGroupRef.current;

    // Clear old meshes
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Mesh;
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    parts.forEach((part) => {
      const geometry = createWoodPartGeometry(part);

      const isSelected = part.id === selectedPartId;
      const isWireframe = viewMode === 'wireframe';

      // Wood Material Shader
      const material = new THREE.MeshStandardMaterial({
        color: isSelected ? '#38bdf8' : part.color,
        roughness: 0.6,
        metalness: 0.1,
        wireframe: isWireframe,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = part.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Base transformation matrix
      mesh.position.set(part.position.x, part.position.y, part.position.z);
      mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);

      // Apply Exploded View Offset
      if (explodedViewFactor > 0) {
        const offsetDist = explodedViewFactor * 90;
        mesh.position.x += part.assemblySlideVector.x * offsetDist;
        mesh.position.y += part.assemblySlideVector.y * offsetDist;
        mesh.position.z += part.assemblySlideVector.z * offsetDist;
      }

      // Add High-Contrast CAD Edge Lines
      const edgesGeometry = new THREE.EdgesGeometry(geometry, 25);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: isSelected ? '#ffffff' : '#000000',
        linewidth: isSelected ? 2 : 1,
      });
      const lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial);
      mesh.add(lineSegments);

      group.add(mesh);
    });
  }, [parts, kerfSettings, explodedViewFactor, viewMode, selectedPartId]);

  // Handle Raycasting Pointer Selection
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !partsGroupRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(partsGroupRef.current.children, true);
    if (intersects.length > 0) {
      let hitObj: THREE.Object3D | null = intersects[0].object;
      while (hitObj && hitObj.parent !== partsGroupRef.current) {
        hitObj = hitObj.parent;
      }
      if (hitObj && hitObj.name) {
        setSelectedPartId(hitObj.name);
      }
    } else {
      setSelectedPartId(null);
    }
  };

  // Preset Views (Top, Front, Right, Isometric)
  const setViewOrientation = (type: 'top' | 'front' | 'right' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    if (type === 'top') {
      cam.position.set(0, 300, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (type === 'front') {
      cam.position.set(0, 30, 300);
      ctrl.target.set(0, 30, 0);
    } else if (type === 'right') {
      cam.position.set(300, 30, 0);
      ctrl.target.set(0, 30, 0);
    } else if (type === 'iso') {
      cam.position.set(220, 180, 260);
      ctrl.target.set(0, 30, 0);
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* CAD Viewport Top Left Overlay Badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 shadow-xl">
        <Box className="w-4 h-4 text-sky-400" />
        <span>3D CAD VIEWPORT</span>
        <span className="text-slate-600">|</span>
        <span className="text-amber-400 font-semibold">{parts.length} PARTS</span>
      </div>

      {/* View Cube & Camera Controls Overlay (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 shadow-2xl gap-1 backdrop-blur">
        <button
          onClick={() => setViewOrientation('iso')}
          className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Isometric View"
        >
          ISO
        </button>
        <button
          onClick={() => setViewOrientation('top')}
          className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Top Plan View"
        >
          TOP
        </button>
        <button
          onClick={() => setViewOrientation('front')}
          className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Front Elevation"
        >
          FRONT
        </button>
        <button
          onClick={() => setViewOrientation('right')}
          className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="Right Elevation"
        >
          RIGHT
        </button>
      </div>

      {/* Viewport Info Overlay (Bottom Left) */}
      <div className="absolute bottom-4 left-4 text-[11px] font-mono text-slate-500 bg-slate-950/60 backdrop-blur px-3 py-1.5 rounded border border-slate-900">
        <div>ORBIT: Left Click + Drag | PAN: Right Click | ZOOM: Scroll Wheel</div>
      </div>
    </div>
  );
};
