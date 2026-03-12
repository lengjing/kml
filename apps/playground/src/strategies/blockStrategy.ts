import { IDragDropStrategy } from './types';
import { validateContainment } from '../validators/containment';

export class BlockStrategy implements IDragDropStrategy {
  canDrag() {
    return true; 
  }

  canDrop(target, dragged) {
    return validateContainment(target, dragged);
  }

  executeDrop(target, dragged) {
    return {
      execute() {
        dragged.parentId = target.id;
      },
      undo() {},
    };
  }
}