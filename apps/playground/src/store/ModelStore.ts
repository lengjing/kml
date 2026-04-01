/**
 * Model Store - Manages semantic elements with undo/redo
 * Pure model layer, no visualization concerns
 */

import { create } from "zustand";
import { Element, ID } from "../types/sysml";

export interface ModelStoreState {
  elements: Map<ID, Element>;
}

export interface ModelStoreActions {
  // CRUD operations
  get: (id: ID) => Element | undefined;
  add: (el: Element) => void;
  update: (id: ID, patch: Partial<Element>) => void;
  remove: (id: ID) => void;
  queryByType: (type: string) => Element[];
  setElements: (elements: Map<ID, Element>) => void;
  
  // History management
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveHistory: () => void;
}

export type ModelStore = ModelStoreState & ModelStoreActions;

interface History {
  past: Map<ID, Element>[];
  future: Map<ID, Element>[];
}

interface ModelStoreWithHistory extends ModelStoreState {
  history: History;
}

const useModelStore = create<ModelStoreWithHistory & ModelStoreActions>((set, get) => ({
  // State
  elements: new Map<ID, Element>(),
  history: { past: [], future: [] },

  // CRUD Actions
  get: (id: ID) => {
    return get().elements.get(id);
  },

  add: (el: Element) => {
    get().saveHistory();
    const currentElements = new Map(get().elements);
    currentElements.set(el.id, el);
    set({ elements: currentElements });
  },

  update: (id: ID, patch: Partial<Element>) => {
    get().saveHistory();
    const currentElements = new Map(get().elements);
    const element = currentElements.get(id);
    if (element) {
      Object.assign(element, patch);
      set({ elements: currentElements });
    }
  },

  remove: (id: ID) => {
    get().saveHistory();
    const currentElements = new Map(get().elements);
    currentElements.delete(id);
    set({ elements: currentElements });
  },

  queryByType: (type: string) => {
    return [...get().elements.values()].filter(e => e.type === type);
  },

  setElements: (elements: Map<ID, Element>) => {
    get().saveHistory();
    set({ elements });
  },

  // History Management
  saveHistory: () => {
    const currentState = new Map(get().elements);
    set((state) => ({
      history: {
        past: [...state.history.past, currentState],
        future: []
      }
    }));
  },

  undo: () => {
    const { history } = get();
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const current = new Map(get().elements);
    
    set({
      elements: previous,
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
    const current = new Map(get().elements);
    
    set({
      elements: next,
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
let prevSize = useModelStore.getState().elements.size;
useModelStore.subscribe((state) => {
  const currentSize = state.elements.size;
  if (currentSize !== prevSize) {
    prevSize = currentSize;
    window.dispatchEvent(new CustomEvent('model-changed'));
  }
});

export default useModelStore;
