import React, { PropsWithChildren } from 'react';

interface ModelCanvasProps {

}

const ModelCanvas: React.FC<PropsWithChildren<ModelCanvasProps>> = ({ children }) => {
    return (
        <div>Model Canvas
            {children}
        </div>
    )
};

export default ModelCanvas;
