import React from 'react';

interface InportProps {
    port: any;
    node: any;
}

const Inport: React.FC<InportProps> = ({ port, node }) => {
    return (
        <rect style={{ strokeWidth: 1 }} height="8" width="8" y={port.y} x={port.x} fill="currentColor"/>
    )
};

export default Inport;
