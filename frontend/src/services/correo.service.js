
import api from './api';

const CorreoService = {
  enviar: (payload) => api.post('/correos', payload),

  historial: (params) => api.get('/correos/historial', { params }),
};

export default CorreoService;
