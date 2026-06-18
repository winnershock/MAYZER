/**
 * services/curso.service.js
 * Responsabilidad : Llamadas HTTP para el catálogo de cursos.
 * Exporta         : CursoService (default)
 * Usado en        : pages/admin/Cursos.jsx, pages/admin/Grupos.jsx,
 *                   pages/admin/Aspirantes.jsx, components/cursos/ModalCurso.jsx
 * Depende de      : services/api.js
 */

import api from './api';

const CursoService = {
  /** Obtener lista de cursos activos */
  listar: (params) => api.get('/cursos', { params }),

  /** Obtener todos los cursos incluidos inactivos (uso en reportes/historial) */
  listarTodos: (params) => api.get('/cursos', { params: { ...params, todos: '1' } }),

  /** Crear un nuevo curso */
  crear: (form) => api.post('/cursos', form),

  /** Actualizar un curso (fallará si tiene grupos finalizados) */
  actualizar: (id, form) => api.put(`/cursos/${id}`, form),

  /** Desactivar un curso (reemplaza eliminación física) */
  desactivar: (id) => api.delete(`/cursos/${id}`),

  /** Reactivar un curso desactivado */
  activar: (id) => api.patch(`/cursos/${id}/activar`),
};

export default CursoService;
