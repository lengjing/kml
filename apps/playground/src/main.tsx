import App from './App.tsx';
import { createRoot } from 'react-dom/client';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const root = createRoot(document.getElementById('root')!);
root.render(
    <DndProvider backend={HTML5Backend}>
        <App />
    </DndProvider>
);
