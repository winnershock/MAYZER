/**
 * components/common/Icon.jsx
 * Responsabilidad : Librería interna de íconos SVG Lucide — renderiza un <svg> por nombre.
 * Exporta         : Icon (default, envuelto en React.memo)
 * Usado en        : Ampliamente en toda la aplicación.
 */

import { memo } from 'react';

const paths = {
  // ── Navegación ──────────────────────────────────────────
  home:            'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z M9 21V12h6v9',
  'chevron-right': 'M9 18l6-6-6-6',
  'chevron-left':  'M15 18l-6-6 6-6',
  'log-out':       'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  'log-in':        'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3',
  refresh:         'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  settings:        'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',

  // ── Entidades / personas ─────────────────────────────────
  user:            'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  users:           'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  building:        'M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 10v1M12 10v1M16 10v1M8 14v1M12 14v1M16 14v1',
  teacher:         'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 12l-3 3-1.5-1.5M20 9a3 3 0 100 6',
  shield:          'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',

  // ── Dominio / contenido ──────────────────────────────────
  clipboard:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  book:            'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 004 22H20V4H6.5A2.5 2.5 0 004 6.5v13z',
  award:           'M12 15l-2 5 2-1 2 1-2-5M8.21 13.89L7 23l5-3 5 3-1.21-9.12M12 2a7 7 0 100 14 7 7 0 000-14z',
  calendar:        'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  chart:           'M3 3v18h18M7 16l4-4 4 4 4-8',
  clock:           'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  'file-text':     'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  pdf:             'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h4',
  'file-excel':    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13l3 3-3 3M11 16h5',
  zip:             'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M10 12h2v2h-2zM12 14h2v2h-2zM10 16h2v2h-2zM12 18h2',

  // ── Acciones ─────────────────────────────────────────────
  plus:            'M12 5v14M5 12h14',
  edit:            'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash:           'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  download:        'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  eye:             'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
  'eye-off':       'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22M9.9 9.9a3 3 0 004.2 4.2',
  send:            'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  lock:            'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',

  // ── Estado / feedback ────────────────────────────────────
  check:           'M20 6L9 17l-5-5',
  'check-circle':  'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  x:               'M18 6L6 18M6 6l12 12',
  'x-circle':      'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  'alert-triangle':'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  'alert-circle':  'M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01',
  // 'info' se conserva como fallback interno del componente (ver línea `paths[name] || paths['info']`)
  info:            'M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M11 12h1v4h1',

  // ── Miscelánea ───────────────────────────────────────────
  help:            'M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
};

const Icon = memo(function Icon({
  name,
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.75,
  className = '',
  style = {},
}) {
  const d = paths[name] || paths['info'];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
      aria-hidden="true"
    >
      {/* Renderizar el path completo sin dividirlo — preserva subpaths M...M... */}
      <path d={d} />
    </svg>
  );
});

export default Icon;
