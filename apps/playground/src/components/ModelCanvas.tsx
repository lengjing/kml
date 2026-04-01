import React, { PropsWithChildren } from 'react';

interface ModelCanvasProps {
    width?: number;
    height?: number;
}

const ModelCanvas: React.FC<PropsWithChildren<ModelCanvasProps>> = ({ width = 800, height = 600, children }) => {
    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            console.log(child.props);
        }
    });

    return (
        <svg width={width} height={height}>{children}</svg>
    )
};

export default ModelCanvas;
