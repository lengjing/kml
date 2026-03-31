import { useEffect, useRef, useState } from "react";
import { Node } from "../types/model";

export default function useElementMove(node: Node) {
    const [position, setPosition] = useState({ x: node.x, y: node.y });
    const [isMoving, setIsMoving] = useState(false);
    const moveRef = useRef<HTMLElement>(null);

    const handleMouseDown = (e: MouseEvent) => {
        setIsMoving(true);
        setPosition({ x: e.clientX, y: e.clientY });
    };
    const handleMouseMove = (e: MouseEvent) => {
        if (isMoving) {
            node.x = e.clientX - position.x + node.x;
            node.y = e.clientY - position.y + node.y;
        }
    };
    const handleMouseUp = (e: MouseEvent) => {
        setIsMoving(false);
    };

    useEffect(() => {
        const element = moveRef.current!;
        element.addEventListener("mousedown", handleMouseDown);
        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseup", handleMouseUp);

        return () => {
            element.removeEventListener("mousedown", handleMouseDown);
            element.removeEventListener("mousemove", handleMouseMove);
            element.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    return {
        moveRef,
    };
}
