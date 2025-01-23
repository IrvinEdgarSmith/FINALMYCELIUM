import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const root = document.getElementById('root');

if (!root) {
  console.error('Failed to find root element');
} else {
  try {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('Failed to render app:', error);
    
    // Fallback error display
    root.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(2 6 23);
        color: rgb(226 232 240);
        padding: 1rem;
        font-family: system-ui, sans-serif;
      ">
        <div style="
          max-width: 32rem;
          background: rgb(15 23 42);
          padding: 1.5rem;
          border-radius: 0.5rem;
          text-align: center;
        ">
          <h1 style="
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: rgb(239 68 68);
          ">
            Failed to load application
          </h1>
          <p style="color: rgb(148 163 184); margin-bottom: 1rem;">
            ${error.message || 'An unexpected error occurred while loading the application.'}
          </p>
          <button
            onclick="window.location.reload()"
            style="
              background: rgb(147 51 234);
              color: white;
              padding: 0.5rem 1rem;
              border-radius: 0.375rem;
              border: none;
              cursor: pointer;
            "
          >
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
