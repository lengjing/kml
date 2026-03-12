import { useElementDnD } from './useElementDnD';
import { resizeStrategy } from '../strategies/ResizeStrategy';
import { useSelectionStore } from '../store/useSelectionStore';

export function useElementInteractions(node) {
  const dnd = useElementDnD(node);
  const selectedId = useSelectionStore(s => s.selectedId);
  const isSelected = selectedId === node.id;

  const handleResizeMouseDown = (direction) => (e) => {
    if (!resizeStrategy.canResize(node)) return;

    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = node.width;
    const startH = node.height;

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      resizeStrategy.onResize(node, { direction, dx, dy, startW, startH });
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return {
    dragRef: dnd.dragRef,
    dropRef: dnd.dropRef,
    isSelected,
    onResizeStart: handleResizeMouseDown,
    state: dnd.state,
  };
}