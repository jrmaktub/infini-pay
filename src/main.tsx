
// Import polyfills FIRST before any other imports
import 'buffer';
import 'process';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Test polyfill availability immediately
console.log('Polyfills imported successfully');
console.log('Polyfill Test: Buffer is', typeof Buffer !== 'undefined' ? 'available' : 'NOT available');
console.log('Polyfill Test: process is', typeof process !== 'undefined' ? 'available' : 'NOT available');

if (typeof Buffer !== 'undefined') {
  try {
    const buf = Buffer.from('test');
    console.log('Polyfill Test: Buffer.from works:', buf.toString());
  } catch (e) {
    console.error('Polyfill Test: Buffer.from failed:', e);
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
