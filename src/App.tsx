
import { Header } from './components/Header';
import { FeatureTree } from './components/FeatureTree';
import { CADViewport } from './components/CADViewport';
import { SketchEditor } from './components/SketchEditor';
import { NestingView } from './components/NestingView';
import { Inspector } from './components/Inspector';
import { AssemblyToolbar } from './components/AssemblyToolbar';
import { useKerfStore } from './store/useKerfStore';

export function App() {
  const { activeTab } = useKerfStore();

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 font-sans overflow-hidden">
      {/* Top Header Navigation */}
      <Header />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Parametric Feature Tree */}
        <FeatureTree />

        {/* Central Viewport Area */}
        <main className="flex-1 relative overflow-hidden bg-slate-950">
          {activeTab === '3d_cad' ? (
            <>
              <CADViewport />
              <AssemblyToolbar />
            </>
          ) : activeTab === '2d_sketch' ? (
            <SketchEditor />
          ) : (
            <NestingView />
          )}
        </main>

        {/* Right Sidebar: Parametric Inspector & Kerf Settings */}
        <Inspector />
      </div>
    </div>
  );
}

export default App;
