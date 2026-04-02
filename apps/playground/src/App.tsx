import {ASTBuilder, Printer} from '@kml/compiler';
import { useEffect } from 'react';
import Block from './components/Block';
import ModelCanvas from './components/ModelCanvas';
import { useDiagramStore } from './store';

import './App.css';


export default function App() {
    const diagramStore = useDiagramStore();
    window.diagramStore = diagramStore;

    const { view: { graph } } = diagramStore;

    useEffect(() => {
        Array.from(Array(50)).forEach((v, idx) => {
            diagramStore.model.add({ id: idx + '', type: 'Block' })
        })
    }, [])

    const generateKml = () => {
        const astBuilder = new ASTBuilder();
        const printer = new Printer();

        // Build root namespace with all elements
        const root = astBuilder.root();

        // Add all blocks from model
        const blocks = diagramStore.model.queryByType('Block');
        blocks.forEach(block => {
            // Create a class for each block
            const classDecl = astBuilder.class(block.id);
            root.members.push(classDecl);

            // Check if block has children (ports, etc.)
            const element = diagramStore.model.get(block.id as any);
            if (element?.children) {
                element.children.forEach((childId: any) => {
                    const child = diagramStore.model.get(childId);
                    if (child?.type === 'Port') {
                        // Add port as a feature
                        const portFeature = astBuilder.port(childId, 'Port');
                        classDecl.members.push(portFeature);
                    }
                });
            }
        });

        // Add connectors as associations
        const connectors = diagramStore.model.queryByType('Connector');
        connectors.forEach(connector => {
            const source = (connector as any).source;
            const target = (connector as any).target;
            
            if (source && target) {
                const assoc = astBuilder.assoc(`${source}_to_${target}`);
                assoc.members.push(
                    astBuilder.endFeature('source', source),
                    astBuilder.endFeature('target', target)
                );
                root.members.push(assoc);
            }
        });

        // Print AST to KML string
        printer.line('// Generated KML from Diagram Editor');
        printer.blank();
        
        root.members.forEach(member => {
            // Simple printing - you might need to handle different member types
            printer.raw(JSON.stringify(member, null, 2));
            printer.blank();
        });

        

        const kmlCode = printer.toString();
       
        console.log(kmlCode)
    };

    return (
        <div style={{width: '100%', height: '100%'}}>
            <ModelCanvas>
                {graph.nodes.map((node) => (
                    <Block key={node.id} node={node} />
                ))}
                {graph.edges.map((edge) => (
                    // <Block key={edge.id} node={edge} isSelected={false} />
                    <div key={edge.id} style={{ backgroundColor: 'red' }}></div>
                ))}
            </ModelCanvas>
            <div>
                <button onClick={generateKml}>生成 kml</button>
            </div>
        </div>
    );
}
