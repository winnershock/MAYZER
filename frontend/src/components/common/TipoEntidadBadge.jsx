/**
 * components/common/TipoEntidadBadge.jsx
 * Responsabilidad : Badge visual para el tipo de entidad de una solicitud.
 * Exporta         : TipoEntidadBadge (default)
 * Usado en        : pages/admin/Solicitudes.jsx, components/solicitudes/ModalSolicitud.jsx
 */
import s from './TipoEntidadBadge.module.css';

const TIPO_MAP = {
  'empresa':    { label: 'Empresa',        color: '#1a6bbf', bg: '#e8f0fb' },
  'grupo SENA': { label: 'Grupo SENA',     color: '#1e7e34', bg: '#e6f4ea' },
  'persona':    { label: 'Independiente',  color: '#7b3f00', bg: '#fff3e0' },
};

import { memo } from 'react';

const TipoEntidadBadge = memo(function TipoEntidadBadge({ tipo }) {
  const cfg = TIPO_MAP[tipo] || {
    label: tipo || '—',
    color: 'var(--text-tertiary)',
    bg:    'var(--bg)',
  };

  return (
    <span
      className={s['tipo-badge']}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
});

export default TipoEntidadBadge;
