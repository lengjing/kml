import React from 'react';
import { Port } from '../types/model';

interface InportProps {
    port: Port;
}

const Inport: React.FC<InportProps> = ({ port }) => {
    return (
        <rect style={{ strokeWidth: 1 }} height="8" width="8" y={port.y} x={port.x} fill="currentColor" />
    )
};

export default Inport;
