
import api from './api';

const AspiranteService = {
  listar: (params) => api.get('/aspirantes', { params }),

  preAprobar: (id) => api.patch(`/aspirantes/${id}/pre-aprobar`),

  rechazar: (id, motivo) => api.patch(`/aspirantes/${id}/rechazar`, { motivo }),

  asignar: (id, grupoId) => api.patch(`/aspirantes/${id}/asignar`, { grupo_id: grupoId }),

  desasignar: (id) => api.patch(`/aspirantes/${id}/desasignar`),

  restablecer: (id) => api.patch(`/aspirantes/${id}/restablecer`),

  verUno: (id) => api.get(`/aspirantes/${id}`),
};

export default AspiranteService;
