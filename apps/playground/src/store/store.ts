import { create } from "zustand";
import ModelRepository from "./ModelRepository";
import { Element, ID } from "../types/sysml";
import { Node, Edge } from "../types/model";
import ELK, { ElkNode } from "elkjs";

const elk = new ELK();

interface Diagram {
  nodes: Node[];
  edges: Edge[];
}

interface Graph {
  nodes: Node[];
  edges: Edge[];
}

interface StoreState {
  repo: ModelRepository;
  diagram: Diagram;
  view: Graph;
  rebuild: () => Promise<void>;
}

// Helper function: Build diagram from repository
function buildDiagram(repo: ModelRepository): Diagram {
  const elements = repo.queryByType("Block");
  
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
    const element = repo.get(node.id as any);
    if (element?.children) {
      element.children.forEach((childId: ID) => {
        const child = repo.get(childId);
        if (child?.type === "Port") {
          // Detect or assign port side
          const side = "EAST"; // Default or use detectSide logic
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
  const connectors = repo.queryByType("Connector");
  const edges: Edge[] = connectors.map(conn => ({
    id: conn.id,
    sourcePort: (conn as any).source,
    targetPort: (conn as any).target
  }));

  return { nodes, edges };
}

// Helper function: Convert diagram to ELK graph
function toElkGraph(repo: ModelRepository, diagram: Diagram): ElkNode {
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

// Helper function: Convert layout result to view model
function toViewModel(
  repo: ModelRepository,
  diagram: Diagram,
  layout: ElkNode
): Graph {
  const layoutNodes = new Map<string, any>();
  
  // Extract layout positions
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

  // Build view nodes with layout positions
  const nodes = diagram.nodes.map(node => {
    const layout = layoutNodes.get(node.id);
    return {
      ...node,
      x: layout?.x || 0,
      y: layout?.y || 0,
      width: layout?.width || node.width,
      height: layout?.height || node.height
    };
  });

  return {
    nodes,
    edges: diagram.edges
  };
}

const useStore = create<StoreState>((set, get) => ({
  repo: new ModelRepository(),

  diagram: { nodes: [], edges: [] },

  view: { nodes: [], edges: [] },

  rebuild: async () => {
    const { repo } = get()

    // 1. model -> diagram
    const diagram = buildDiagram(repo)

    // 2. diagram -> elk graph
    const elkGraph = toElkGraph(repo, diagram)

    // 3. layout
    const layout = await elk.layout(elkGraph)

    // 4. layout -> view
    const view = toViewModel(repo, diagram, layout)

    set({ diagram, view })
  }
}))

export default useStore;

