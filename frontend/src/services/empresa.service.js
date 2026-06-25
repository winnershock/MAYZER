
import api from './api';

const EmpresaService = {
  listar: (params) => api.get('/empresas', { params }),

  listarLugares: () => api.get('/empresas/lugares'),

  listarCiudades: () => api.get('/empresas/ciudades'),
};

export default EmpresaService;
