
export const ASP_ESTADO_MAP = {
  PENDIENTE:    ['badge-warn',    'Pendiente'],
  PRE_APROBADO: ['badge-info',    'Pre-aprobado'],
  ASIGNADO:     ['badge-sena',    'Asignado'],
  RECHAZADO:    ['badge-danger',  'Rechazado'],
};

export const SOL_ESTADO_MAP = {
  PENDIENTE:   ['badge-warn',   'Pendiente'],
  EN_REVISION: ['badge-info',   'En revisión'],
  APROBADA:    ['badge-sena',   'Aprobada'],
  RECHAZADA:   ['badge-danger', 'Rechazada'],
};

export const GRP_ESTADO_MAP = {
  PROGRAMADO: ['badge-gray',    'Programado'],
  EN_CURSO:   ['badge-info',    'En curso'],
  FINALIZADO: ['badge-success', 'Finalizado'],
  CANCELADO:  ['badge-danger',  'Cancelado'],
};

import { memo } from 'react';

const EstadoBadge = memo(function EstadoBadge({ estado, mapa }) {
  const map = mapa || ASP_ESTADO_MAP;
  const [cls, txt] = map[estado] || ['badge-gray', estado || '–'];
  return <span className={`badge ${cls}`}>{txt}</span>;
});

export { EstadoBadge };

export const AspEstadoBadge = memo(function AspEstadoBadge({ estado }) {
  return <EstadoBadge estado={estado} mapa={ASP_ESTADO_MAP} />;
});

export const SolEstadoBadge = memo(function SolEstadoBadge({ estado }) {
  return <EstadoBadge estado={estado} mapa={SOL_ESTADO_MAP} />;
});

export const GrpEstadoBadge = memo(function GrpEstadoBadge({ estado }) {
  return <EstadoBadge estado={estado} mapa={GRP_ESTADO_MAP} />;
});
