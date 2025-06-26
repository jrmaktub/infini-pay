
// Import polyfills first
import './utils/polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('main.tsx - Starting application...');

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('main.tsx - Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('main.tsx - Rendering App component...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  console.log('main.tsx - Application rendered successfully');
} catch (error) {
  console.error('main.tsx - Fatal error during application startup:', error);
  
  // Fallback error display
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh;
        background: linear-gradient(135deg, #581c87 0%, #1e3a8a 50%, #312e81 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="
          background: rgba(239, 68, 68, 0.2);
          backdrop-filter: blur(12px);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid rgba(239, 68, 68, 0.3);
          max-width: 32rem;
          text-align: center;
        ">
          <h2 style="color: white; font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
            Application Failed to Start
          </h2>
          <p style="color: #fca5a5; margin-bottom: 1.5rem;">
            ${error instanceof Error ? error.message : 'Unknown startup error'}
          </p>
          <button 
            onclick="window.location.reload()" 
            style="
              background: #7c3aed;
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 0.5rem;
              border: none;
              cursor: pointer;
              font-size: 1rem;
            "
          >
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
