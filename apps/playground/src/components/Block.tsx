import React from 'react';
import useElementInteractions from '../hooks/useElementInteraction';
import { Node } from '../types/model';

interface BlockProps {
    node: Node;
    isSelected: boolean;
}

const Block: React.FC<BlockProps> = ({ node, isSelected }) => {
    const { moveRef, onResizeStart } =
        useElementInteractions(node);

    return (
        <g ref={el => { dragRef(el); dropRef(el); moveRef(el); }}>
            <rect x={node.x} y={node.y} width={node.width} height={node.height} style={{ fill: '#ddddff' }} />
            {/* stroke: '#444488', strokeWidth: 1 */}
            {node.ports?.map((port) => <rect style={{ strokeWidth: 1 }} height="8" width="8" y={port.y} x={port.x} fill="currentColor" />)}

            {isSelected && (
                <g>
                    <line onMouseDown={() => onResizeStart('bottom-right')} x1={node.x} y1={node.y} x2={node.x + node.width} y2={node.y} stroke="currentColor" />
                    <line onMouseDown={() => onResizeStart('bottom-left')} x1={node.x} y1={node.y} x2={node.x} y2={node.y + node.height} stroke="currentColor" />
                    <line onMouseDown={() => onResizeStart('top-right')} x1={node.x + node.width} y1={node.y} x2={node.x + node.width} y2={node.y + node.height} stroke="currentColor" />
                    <line onMouseDown={() => onResizeStart('top-left')} x1={node.x} y1={node.y + node.height} x2={node.x + node.width} y2={node.y + node.height} stroke="currentColor" />
                </g>
            )}
        </g>
    )
};

export default Block;
