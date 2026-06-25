
import api from './api';

const SolicitudService = {
  listar: (params) => api.get('/solicitudes', { params }),

  obtener: (id) => api.get(`/solicitudes/${id}`),
};

export default SolicitudService;
