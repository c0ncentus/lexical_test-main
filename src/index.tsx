import './index.css';
import 'katex/dist/katex.css';
import {createRoot} from 'react-dom/client';
import {PlaygroundApp} from './App';
import React from 'react';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PlaygroundApp onChange={(data)=>{console.log(data)}} initLexicalData={undefined} />
  </React.StrictMode>,
);
