/**
 * services/grupo.service.js
 * Responsabilidad : Llamadas HTTP para grupos de formación.
 * Exporta         : GrupoService (default)
 * Usado en        : pages/admin/Grupos.jsx, pages/admin/Calendario.jsx,
 *                   pages/admin/Inicio.jsx, components/grupos/*
 * Depende de      : services/api.js
 */

import api from './api';

const GrupoService = {
  /** Obtener lista filtrada de grupos */
  listar: (params) => api.get('/grupos', { params }),

  /** Obtener detalle de un grupo por ID */
  obtener: (id) => api.get(`/grupos/${id}`),

  /** Crear un nuevo grupo */
  crear: (form) => api.post('/grupos', form),

  /** Actualizar un grupo existente */
  actualizar: (id, form) => api.put(`/grupos/${id}`, form),

  /** Eliminar un grupo */
  eliminar: (id) => api.delete(`/grupos/${id}`),
};

export default GrupoService;
