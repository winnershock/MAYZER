
import api from './api';

const GrupoService = {
  listar: (params) => api.get('/grupos', { params }),

  obtener: (id) => api.get(`/grupos/${id}`),

  crear: (form) => api.post('/grupos', form),

  actualizar: (id, form) => api.put(`/grupos/${id}`, form),

  eliminar: (id) => api.delete(`/grupos/${id}`),
};

export default GrupoService;
