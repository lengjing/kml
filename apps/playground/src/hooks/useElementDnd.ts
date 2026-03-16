import { useDrag, useDrop } from 'react-dnd';
import { Node } from '../types/model';

export default function useElementDnD(node: Node) {
    // const strategy = getStrategy(node.type);

    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: 'ELEMENT',
        // canDrag: () => strategy.canDrag(node, { operation: 'move' }),
        canDrag: () => true,
        item: { node },
        collect: monitor => ({ isDragging: monitor.isDragging() }),
    }), [node]);

    const [{ isOver, canDrop, error }, dropRef] = useDrop(() => ({
        accept: 'ELEMENT',
        // canDrop: (item) => {
        //   const res = strategy.canDrop(node, item.node, { operation: 'move' });
        //   return res.valid;
        // },
        // drop: (item) =>
        //   strategy.executeDrop(node, item.node, { operation: 'move' }).execute(),
        canDrop: () => true,
        drop: () => ({}),
        collect: monitor => {
            const item = monitor.getItem();
            if (!item) return {};
            // const res = strategy.canDrop(node, item.node, { operation: 'move' });
            return {
                isOver: monitor.isOver(),
                canDrop: 1,
                error: 1,
            };
        },
    }), [node]);

    return {
        dragRef,
        dropRef,
        state: {
            isDragging,
            isOver,
            canDrop,
            error,
        },
    };
}