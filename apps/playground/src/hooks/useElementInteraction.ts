import { useState } from "react";
import { Node } from "../types/model";
import useElementDnD from "./useElementDnd";
import useElementResize from "./useElementResize";
import useElementMove from "./useElementMove";

export default function useElementInteractions(node: Node) {
  // const dnd = useElementDnD(node);
  const { handleResizeMouseDown } = useElementResize(node);
  const { moveRef } = useElementMove(node);
  const [isSelected, setIsSelected] = useState(false);

  return {
    // dragRef: dnd.dragRef,
    // dropRef: dnd.dropRef,
    moveRef,
    isSelected,
    onResizeStart: handleResizeMouseDown,
    // state: dnd.state,
  };
}