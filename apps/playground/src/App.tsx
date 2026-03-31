import React, { useEffect, useState } from 'react';
import ModelCanvas from './components/ModelCanvas';
import Block from './components/Block';
import ELK, { ElkNode } from "elkjs";

const elk = new ELK();

export default function App() {
    const [graph, setGraph] = useState({
        id: "root",
        layoutOptions: { 'elk.algorithm': 'fixed', "elk.edgeRouting": "ORTHOGONAL" },
        children: [
            { id: "n1", width: 30, height: 30, x: 20, y: 20, },
            { id: "n2", width: 30, height: 30 },
            { id: "n3", width: 30, height: 30 }
        ],
        edges: [
            { id: "e1", sources: ["n1"], targets: ["n2"], sections: [{ id: "s1", startPoint: { x: 0, y: 0 }, endPoint: { x: 0, y: 0 } }] },
            { id: "e2", sources: ["n1"], targets: ["n3"], sections: [{ id: "s2", startPoint: { x: 0, y: 0 }, endPoint: { x: 0, y: 0 } }] }
        ]
    });

    useEffect(() => {
        console.log('App mounted');

        elk.layout(graph)
            .then((data) => {
                debugger
                console.log(data)
            })

    }, [graph]);

    return (
        <div>
            <h1>KML Playground</h1>

            <ModelCanvas>
                <Block node={{ id: '1', x: 0, y: 0, width: 100, height: 100 }} isSelected={true}></Block>
            </ModelCanvas>
        </div>
    );
}
