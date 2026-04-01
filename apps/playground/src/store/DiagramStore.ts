/**
 * Diagram Store - Combines Model and View stores with layout engine
 * Provides unified API for diagram operations
 */

import ELK, { ElkNode } from "elkjs";
import { create } from "zustand";
import { Node, Edge } from "../types/model";
import useModelStore from "./ModelStore";
import useViewStore from "./ViewStore";

const elk = new ELK();

export interface DiagramState {
  isReady: boolean;
}

export interface DiagramActions {
  // Layout operations
  rebuild: () => Promise<void>;
  
  // Convenience methods that delegate to model/view stores
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type DiagramStore = DiagramState & DiagramActions;

// Helper: Build diagram structure from model
function buildDiagram(): { nodes: Node[]; edges: Edge[] } {
  const model = useModelStore.getState();
  const elements = model.queryByType("Block");

  const nodes: Node[] = elements.map(el => ({
    id: el.id,
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    ports: []
  }));

  // Add ports for each block
  nodes.forEach(node => {
    const element = model.get(node.id as any);
    if (element?.children) {
      element.children.forEach((childId: any) => {
        const child = model.get(childId);
        if (child?.type === "Port") {
          const side = "EAST"; // Default or implement detectSide logic
          node.ports?.push({
            id: childId,
            nodeId: node.id,
            side
          });
        }
      });
    }
  });

  // Build edges from connectors
  const connectors = model.queryByType("Connector");
  const edges: Edge[] = connectors.map(conn => ({
    id: conn.id,
    sourcePort: (conn as any).source,
    targetPort: (conn as any).target
  }));

  return { nodes, edges };
}

// Helper: Convert to ELK graph
function toElkGraph(diagram: { nodes: Node[]; edges: Edge[] }): ElkNode {
  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.edgeRouting": "ORTHOGONAL"
    },
    children: diagram.nodes.map(node => ({
      id: node.id,
      width: node.width,
      height: node.height,
      ports: node.ports?.map(port => ({
        id: port.id,
        layoutOptions: {
          "elk.port.side": port.side
        }
      }))
    })),
    edges: diagram.edges.map(edge => ({
      id: edge.id,
      sources: [edge.sourcePort],
      targets: [edge.targetPort]
    }))
  };
}

// Helper: Apply layout result to view
function applyLayout(layout: ElkNode) {
  const layoutNodes = new Map<string, any>();

  if (layout.children) {
    layout.children.forEach(child => {
      layoutNodes.set(child.id, {
        x: child.x || 0,
        y: child.y || 0,
        width: child.width || 0,
        height: child.height || 0
      });
    });
  }

  // Get current view and update positions
  const view = useViewStore.getState();
  const newNodes = view.graph.nodes.map(node => {
    const layoutData = layoutNodes.get(node.id);
    return {
      ...node,
      x: layoutData?.x || 0,
      y: layoutData?.y || 0,
      width: layoutData?.width || node.width,
      height: layoutData?.height || node.height
    };
  });

  useViewStore.getState().updateNodes(newNodes);
}

const useDiagramStore = create<DiagramStore>((set, get) => ({
  isReady: false,

  rebuild: async () => {
    try {
      // 1. Build diagram from model
      const diagram = buildDiagram();

      // 2. Convert to ELK format
      const elkGraph = toElkGraph(diagram);

      // 3. Run layout algorithm
      const layout = await elk.layout(elkGraph);

      // 4. Apply layout to view
      applyLayout(layout);

      set({ isReady: true });
    } catch (error) {
      console.error('Failed to rebuild diagram:', error);
      set({ isReady: false });
    }
  },

  // Unified undo - tries view first, then model
  undo: () => {
    const view = useViewStore.getState();
    const model = useModelStore.getState();
    
    if (view.canUndo()) {
      view.undo();
    } else if (model.canUndo()) {
      model.undo();
    }
  },

  // Unified redo - tries view first, then model
  redo: () => {
    const view = useViewStore.getState();
    const model = useModelStore.getState();
    
    if (view.canRedo()) {
      view.redo();
    } else if (model.canRedo()) {
      model.redo();
    }
  },

  canUndo: () => {
    const view = useViewStore.getState();
    const model = useModelStore.getState();
    return view.canUndo() || model.canUndo();
  },

  canRedo: () => {
    const view = useViewStore.getState();
    const model = useModelStore.getState();
    return view.canRedo() || model.canRedo();
  }
}));

// Auto-rebuild when model changes
let prevModelSize = useModelStore.getState().elements.size;
useModelStore.subscribe(() => {
  const currentSize = useModelStore.getState().elements.size;
  if (currentSize !== prevModelSize) {
    prevModelSize = currentSize;
    useDiagramStore.getState().rebuild();
  }
});

// Export individual stores for direct access
export { useModelStore, useViewStore };
export default useDiagramStore;
