import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global error handler for debugging production/local build issues
window.onerror = function (message, source, lineno, colno, error) {
  const errorContainer = document.createElement('div');
  errorContainer.style.color = 'red';
  errorContainer.style.padding = '20px';
  errorContainer.style.background = 'white';
  errorContainer.style.position = 'fixed';
  errorContainer.style.top = '0';
  errorContainer.style.left = '0';
  errorContainer.style.width = '100%';
  errorContainer.style.zIndex = '9999';
  errorContainer.innerHTML = `
    <h3>Application Error</h3>
    <pre>${message}</pre>
    <p>Source: ${source}:${lineno}:${colno}</p>
    <pre>${error ? error.stack : ''}</pre>
  `;
  document.body.appendChild(errorContainer);
};

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("Render error:", e);
  window.onerror(e.message, null, null, null, e);
}
