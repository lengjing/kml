export interface DragDropContext {
  operation: 'move' | 'connect';
}

export interface IDragDropStrategy {
  canDrag(element: ElementNode, ctx: DragDropContext): boolean;
  canDrop(target: ElementNode | null, dragged: ElementNode, ctx: DragDropContext): ValidationResult;
  executeDrop(target: ElementNode | null, dragged: ElementNode, ctx: DragDropContext): Command;
  executeDrag(element: ElementNode, ctx: DragDropContext): Command;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}
