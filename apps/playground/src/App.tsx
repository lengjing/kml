import ModelCanvas from './components/ModelCanvas';
import Block from './components/Block';

import './App.css';
import { useModelStore, useViewStore } from './store';

export default function App() {
    const model = useModelStore();
    const { graph } = useViewStore();

    window.graph = graph;
    window.model = model;
    return (
        <ModelCanvas>
            {graph.nodes.map((node) => (
                <Block key={node.id} node={node} />
            ))}
            {graph.edges.map((edge) => (
                // <Block key={edge.id} node={edge} isSelected={false} />
                <div key={edge.id} style={{ backgroundColor: 'red' }}></div>
            ))}
        </ModelCanvas>
    );
}
