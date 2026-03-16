import React from 'react';
import ModelCanvas from './components/ModelCanvas';
import Block from './components/Block';

export default function App() {


    return (
        <div>
            <h1>KML Playground</h1>

            <ModelCanvas>
                <Block ports={[]} node={{ id: '1', x: 0, y: 0, width: 100, height: 100 }} isSelected={false}></Block>
            </ModelCanvas>
        </div>
    );
}
