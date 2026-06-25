
import api from './api';

const EventoService = {
  listar: (params, opts) => api.get('/eventos', { params, signal: opts?.signal }),

  crear: (form) => api.post('/eventos', form),

  actualizar: (id, form) => api.put(`/eventos/${id}`, form),

  eliminar: (id) => api.delete(`/eventos/${id}`),
};

export default EventoService;
