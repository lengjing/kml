/**
 * View Store - Manages diagram layout with undo/redo
 * Handles node positions, sizes, and user interactions
 */

import { create } from "zustand";
import { Node, Edge } from "../types/model";
import { ID } from "../types/sysml";

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface ViewStoreState {
  graph: Graph;
}

export interface ViewStoreActions {
  // Graph operations
  setGraph: (graph: Graph) => void;
  
  // Node mutations
  updateNodePosition: (nodeId: ID, x: number, y: number) => void;
  updateNodeSize: (nodeId: ID, width: number, height: number) => void;
  updateNodes: (nodes: Node[]) => void;
  
  // History management
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveHistory: () => void;
}

export type ViewStore = ViewStoreState & ViewStoreActions;

interface History {
  past: Graph[];
  future: Graph[];
}

interface ViewStoreWithHistory extends ViewStoreState {
  history: History;
}

const useViewStore = create<ViewStoreWithHistory & ViewStoreActions>((set, get) => ({
  // State
  graph: { nodes: [], edges: [] },
  history: { past: [], future: [] },

  // Graph Operations
  setGraph: (graph: Graph) => {
    set({ graph });
  },

  updateNodes: (nodes: Node[]) => {
    set((state) => ({
      graph: {
        ...state.graph,
        nodes
      }
    }));
  },

  // Node Mutations with History
  updateNodePosition: (nodeId: ID, x: number, y: number) => {
    get().saveHistory();
    const currentGraph = { ...get().graph };
    const nodeIndex = currentGraph.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex !== -1) {
      currentGraph.nodes[nodeIndex] = {
        ...currentGraph.nodes[nodeIndex],
        x,
        y
      };
      set({ graph: currentGraph });
    }
  },

  updateNodeSize: (nodeId: ID, width: number, height: number) => {
    get().saveHistory();
    const currentGraph = { ...get().graph };
    const nodeIndex = currentGraph.nodes.findIndex(n => n.id === nodeId);
    
    if (nodeIndex !== -1) {
      currentGraph.nodes[nodeIndex] = {
        ...currentGraph.nodes[nodeIndex],
        width,
        height
      };
      set({ graph: currentGraph });
    }
  },

  // History Management
  saveHistory: () => {
    const currentGraph = JSON.parse(JSON.stringify(get().graph));
    set((state) => ({
      history: {
        past: [...state.history.past, currentGraph],
        future: []
      }
    }));
  },

  undo: () => {
    const { history } = get();
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const current = JSON.parse(JSON.stringify(get().graph));
    
    set({
      graph: previous,
      history: {
        past: newPast,
        future: [current, ...history.future]
      }
    });
  },

  redo: () => {
    const { history } = get();
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    const current = JSON.parse(JSON.stringify(get().graph));
    
    set({
      graph: next,
      history: {
        past: [...history.past, current],
        future: newFuture
      }
    });
  },

  canUndo: () => {
    return get().history.past.length > 0;
  },

  canRedo: () => {
    return get().history.future.length > 0;
  }
}));

// Notify listeners on changes
useViewStore.subscribe((state, prevState) => {
  if (state.graph !== prevState.graph) {
    window.dispatchEvent(new CustomEvent('view-changed'));
  }
});

export default useViewStore;
