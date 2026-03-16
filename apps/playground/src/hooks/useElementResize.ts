import { Node } from "../types/model";

export default function useElementResize(node: Node) {
    const handleResizeMouseDown = (direction: string) => (e: MouseEvent) => {

        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = node.width;
        const startH = node.height;

        const move = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
        };

        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };

    return {
        handleResizeMouseDown,
    }
}
