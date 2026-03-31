import React, { PropsWithChildren } from 'react';

interface ModelCanvasProps {

}

const ModelCanvas: React.FC<PropsWithChildren<ModelCanvasProps>> = ({ children }) => {
    return (
        <svg width="100%" height="100%">{children}</svg>
    )
};

export default ModelCanvas;
