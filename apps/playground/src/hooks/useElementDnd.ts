// hooks/useElementDnD.ts
import { useDrag, useDrop } from 'react-dnd';
import { getStrategy } from '../strategies';

export function useElementDnD(node) {
  const strategy = getStrategy(node.type);

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: 'ELEMENT',
    canDrag: () => strategy.canDrag(node, { operation: 'move' }),
    item: { node },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }), [node]);

  const [{ isOver, canDrop, error }, dropRef] = useDrop(() => ({
    accept: 'ELEMENT',
    canDrop: (item) => {
      const res = strategy.canDrop(node, item.node, { operation: 'move' });
      return res.valid;
    },
    drop: (item) =>
      strategy.executeDrop(node, item.node, { operation: 'move' }).execute(),
    collect: monitor => {
      const item = monitor.getItem();
      if (!item) return {};
      const res = strategy.canDrop(node, item.node, { operation: 'move' });
      return {
        isOver: monitor.isOver(),
        canDrop: res.valid,
        error: res.valid ? null : res.reason,
      };
    },
  }), [node]);

  return {
    dragRef,
    dropRef: strategy.allowDropRef ? dropRef : null,
    state: {
      isDragging,
      isOver,
      canDrop,
      error,
    },
  };
}