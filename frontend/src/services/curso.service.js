
import api from './api';

const CursoService = {
  listar: (params) => api.get('/cursos', { params }),

  listarInactivos: (params) => api.get('/cursos', { params: { ...params, inactivos: '1' } }),

  crear: (form) => api.post('/cursos', form),

  actualizar: (id, form) => api.put(`/cursos/${id}`, form),

  desactivar: (id) => api.delete(`/cursos/${id}`),

  activar: (id) => api.patch(`/cursos/${id}/activar`),
};

export default CursoService;
