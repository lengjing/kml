import ELK, { ElkNode } from "elkjs";
import { Edge, Node } from "../types/model";
import useModelStore, { type ModelStore } from "./ModelStore";
import useViewStore, { type ViewStore } from "./ViewStore";
import { useEffect } from "react";

const elk = new ELK();

// History entry with timestamp for proper ordering
export interface HistoryEntry {
  timestamp: number;
  type: 'model' | 'view';
}

interface RedoEntry {
  timestamp: number;
  type: 'model' | 'view';
}

export interface DiagramActions {
  // Layout operations
  rebuild: () => Promise<void>;

  // Unified undo/redo based on operation sequence
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// Custom hook that combines model and view stores
export function useDiagramStore() {
  const model = useModelStore();
  const view = useViewStore();

  useEffect(() => {
    // Auto-rebuild when model changes
    return useModelStore.subscribe((state, prevState) => {
      if (state.elements.size !== prevState.elements.size) {
        rebuild()
      }
    });
  }, [])

  const rebuild = async () => {
    try {
      // 1. Build diagram from model
      const diagram = buildDiagram(model, view);

      // 2. Convert to ELK format
      const elkGraph = toElkGraph(diagram);

      // 3. Run layout algorithm
      const layout = await elk.layout(elkGraph);

      // 4. Apply layout to view
      applyLayout(layout, view);
    } catch (error) {
      console.error('Failed to rebuild diagram:', error);
    }
  }

  const undo = () => {
    // TODO: Implement unified undo with history tracking
    if (view.canUndo()) {
      view.undo();
    } else if (model.canUndo()) {
      model.undo();
    }
  }

  const redo = () => {
    // TODO: Implement unified redo with history tracking
    if (view.canRedo()) {
      view.redo();
    } else if (model.canRedo()) {
      model.redo();
    }
  }

  return {
    isReady: true,
    model,
    view,
    history: [] as HistoryEntry[],
    redoStack: [] as RedoEntry[],
    rebuild,
    undo,
    redo,
    canUndo: () => {
      return model.canUndo() || view.canUndo();
    },

    canRedo: () => {
      return model.canRedo() || view.canRedo();
    }
  };
}

// Helper: Build diagram structure from model with preserved layout
function buildDiagram(model: ModelStore, view: ViewStore): { nodes: Node[]; edges: Edge[] } {
  const elements = model.queryByType("Block");

  // Get existing node sizes from current view to preserve user adjustments
  const existingNodes = new Map(view.graph.nodes.map((n: Node) => [n.id, n]));

  const nodes: Node[] = elements.map((el: any) => {
    const existingNode = existingNodes.get(el.id);

    return {
      id: el.id,
      x: existingNode?.x || 0,
      y: existingNode?.y || 0,
      width: existingNode?.width || 100,  // Preserve user-adjusted width
      height: existingNode?.height || 60, // Preserve user-adjusted height
      ports: []
    };
  });

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
  const edges: Edge[] = connectors.map((conn: any) => ({
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

// Helper: Apply layout result to view while preserving user adjustments
function applyLayout(layout: ElkNode, view: ViewStore) {
  const layoutNodes = new Map<string, any>();

  if (layout.children) {
    layout.children.forEach(child => {
      layoutNodes.set(child.id, {
        x: child.x ?? 0,
        y: child.y ?? 0,
        width: child.width ?? 0,
        height: child.height ?? 0
      });
    });
  }

  // Build new nodes array from layout
  const newNodes = layout.children?.map(layoutChild => {
    const existingNode = view.graph.nodes.find((n: Node) => n.id === layoutChild.id);

    return {
      id: layoutChild.id,
      x: layoutChild.x ?? existingNode?.x ?? 0,
      y: layoutChild.y ?? existingNode?.y ?? 0,
      width: layoutChild.width ?? existingNode?.width ?? 100,
      height: layoutChild.height ?? existingNode?.height ?? 60,
      ports: existingNode?.ports || []
    };
  }) || [];

  // Add any existing nodes that weren't in the layout (shouldn't happen, but safety check)
  const existingIds = new Set(newNodes.map((n: Node) => n.id));
  view.graph.nodes.forEach((existingNode: Node) => {
    if (!existingIds.has(existingNode.id)) {
      newNodes.push({
        ...existingNode,
        ports: existingNode.ports || []
      });
    }
  });

  view.updateNodes(newNodes);
}

export default useDiagramStore;
