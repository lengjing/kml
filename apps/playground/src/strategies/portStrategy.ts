// strategies/PortStrategy.ts
import { IDragDropStrategy } from './types';
import { validatePortConnect } from '../validators/port';

export class PortStrategy implements IDragDropStrategy {
  canDrag() {
    return false;  // Port 不移动
  }

  canDrop(target, dragged, ctx) {
    if (ctx.operation !== 'connect') {
      return { valid: false, reason: 'Port cannot contain children' };
    }
    return validatePortConnect(target, dragged);
  }

  executeDrop(target, dragged) {
    return {
      execute() {
        console.log('Connecting port → port');
      },
      undo() {},
    };
  }

  executeDrag(element, ctx) {
    return {
      execute() {
        console.log('Dragging port');

        layout(element);
      },
      undo() {},
    };
  }
}