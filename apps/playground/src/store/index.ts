/**
 * Store Module Exports
 * 
 * Three-store architecture:
 * - ModelStore: Element data management
 * - ViewStore: Layout and visualization  
 * - DiagramStore: Unified API combining both
 */

// Main unified store (recommended for most use cases)
export { default as useDiagramStore } from './DiagramStore';

// Individual stores for fine-grained control
export { default as useModelStore } from './ModelStore';
export { default as useViewStore } from './ViewStore';

// Re-export types
export type { ModelStore, ModelStoreState, ModelStoreActions } from './ModelStore';
export type { ViewStore, ViewStoreState, ViewStoreActions, Graph } from './ViewStore';
export type { DiagramStore, DiagramState, DiagramActions } from './DiagramStore';
