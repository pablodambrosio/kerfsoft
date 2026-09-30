
import { Header } from './components/Header';
import { FeatureTree } from './components/FeatureTree';
import { CADViewport } from './components/CADViewport';
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
        {/* Left Sidebar: Components Panel */}
        <FeatureTree />

        {/* Central Viewport Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
          {activeTab === '3d_cad' ? (
            <>
              <div className="flex-1 relative overflow-hidden">
                <CADViewport />
              </div>
              <AssemblyToolbar />
            </>
          ) : (
            <NestingView />
          )}
        </main>

        {/* Right Sidebar: Properties Panel */}
        <Inspector />
      </div>
    </div>
  );
}

export default App;

