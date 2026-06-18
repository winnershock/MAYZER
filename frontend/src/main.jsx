/**
 * main.jsx  — Punto de entrada de la aplicación React
 * Responsabilidad : Monta el árbol React en el DOM.
 * Depende de      : App.jsx, styles/reset.css, styles/tokens.css, styles/global.css
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
