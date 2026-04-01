import React from 'react';
import { Node } from '../types/model';

interface BlockProps {
    node: Node;
}

const Block: React.FC<BlockProps> = ({ node }) => {
    return (
        <g className="block" data-id={node.id}>
            <rect x={node.x} y={node.y} width={node.width} height={node.height} style={{ fill: '#ddddff' }} />
            {/* stroke: '#444488', strokeWidth: 1 */}
            {node.ports?.map((port) => <rect style={{ strokeWidth: 1 }} height="8" width="8" y={port.y} x={port.x} fill="currentColor" />)}
        </g>
    )
};

export default Block;
