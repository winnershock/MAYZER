/**
 * services/aspirante.service.js
 * Responsabilidad : Llamadas HTTP para gestión de aspirantes.
 * Exporta         : AspiranteService (default)
 * Usado en        : pages/admin/Aspirantes.jsx, components/aspirantes/*
 * Depende de      : services/api.js
 */

import api from './api';

const AspiranteService = {
  /** Obtener lista paginada/filtrada de aspirantes */
  listar: (params) => api.get('/aspirantes', { params }),

  /** Pre-aprobar un aspirante */
  preAprobar: (id) => api.patch(`/aspirantes/${id}/pre-aprobar`),

  /** Rechazar un aspirante con motivo */
  rechazar: (id, motivo) => api.patch(`/aspirantes/${id}/rechazar`, { motivo }),

  /** Asignar aspirante a un grupo */
  asignar: (id, grupoId) => api.patch(`/aspirantes/${id}/asignar`, { grupo_id: grupoId }),

  /** Desasignar aspirante de su grupo actual (revierte a PRE_APROBADO) */
  desasignar: (id) => api.patch(`/aspirantes/${id}/desasignar`),

  /** Restablecer aspirante RECHAZADO a PENDIENTE */
  restablecer: (id) => api.patch(`/aspirantes/${id}/restablecer`),

  /** Ver detalle completo de un aspirante */
  verUno: (id) => api.get(`/aspirantes/${id}`),
};

export default AspiranteService;
