import React, { useState, useMemo } from 'react';
import { Layers, Folder, FolderOpen, Box, ChevronRight, ChevronDown } from 'lucide-react';
import { useKerfStore } from '../store/useKerfStore';
import type { WoodPart } from '../types/cad';

interface TreeNode {
  id: string;
  name: string;
  children: Record<string, TreeNode>;
  parts: WoodPart[];
}

export const FeatureTree: React.FC = () => {
  const { parts, selectedPartId, setSelectedPartId } = useKerfStore();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const tree = useMemo(() => {
    const root: TreeNode = { id: 'root', name: 'Root', children: {}, parts: [] };

    parts.forEach(part => {
      // Split name by '/', '\', or ':' to create hierarchy if CAD exporter provided one
      const pathParts = part.name.split(/[\\/:]/);
      
      let currentNode = root;
      
      if (pathParts.length === 1) {
        currentNode.parts.push(part);
        return;
      }

      // Navigate or create folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i].trim();
        if (!folderName) continue;
        
        if (!currentNode.children[folderName]) {
          currentNode.children[folderName] = {
            id: `${currentNode.id}-${folderName}`,
            name: folderName,
            children: {},
            parts: []
          };
        }
        currentNode = currentNode.children[folderName];
      }
      
      currentNode.parts.push(part);
    });

    return root;
  }, [parts]);

  const renderNode = (node: TreeNode, level: number) => {
    const isExpanded = expandedNodes[node.id] !== false; // expanded by default
    
    return (
      <div key={node.id} className="flex flex-col">
        {node.id !== 'root' && (
          <div 
            className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800 cursor-pointer text-slate-300 transition-colors"
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => toggleNode(node.id)}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
            {isExpanded ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <Folder className="w-4 h-4 text-amber-500" />}
            <span className="text-xs font-semibold truncate select-none">{node.name}</span>
          </div>
        )}
        
        {isExpanded && (
          <div className="flex flex-col">
            {Object.values(node.children).map(child => renderNode(child, node.id === 'root' ? level : level + 1))}
            
            {node.parts.map(part => {
              const isSelected = selectedPartId === part.id;
              const leafLevel = node.id === 'root' ? level : level + 1;
              const displayName = part.name.split(/[\\/:]/).pop() || part.name;
              
              return (
                <div 
                  key={part.id}
                  onClick={() => setSelectedPartId(part.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-xs transition-colors ${
                    isSelected 
                      ? 'bg-sky-900/40 text-white border-l-2 border-sky-400' 
                      : 'text-slate-400 hover:bg-slate-800/50 border-l-2 border-transparent'
                  }`}
                  style={{ paddingLeft: `${leafLevel * 12 + (node.id === 'root' ? 12 : 28)}px` }}
                >
                  <Box className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span className="truncate select-none font-medium">{displayName}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col font-sans select-none overflow-hidden h-full z-10">
      <div className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>COMPONENTS</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {parts.length === 0 ? (
          <div className="px-4 text-xs text-slate-500 text-center mt-6 p-4 border border-slate-800/50 rounded-lg mx-4 bg-slate-900/50">
            No components yet. Import a STEP or KERF file to see the hierarchy.
          </div>
        ) : (
          renderNode(tree, 0)
        )}
      </div>
    </div>
  );
};
