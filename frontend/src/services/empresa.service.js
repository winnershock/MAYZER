/**
 * services/empresa.service.js
 * Responsabilidad : Llamadas HTTP para empresas y lugares/sedes.
 * Exporta         : EmpresaService (default)
 * Usado en        : pages/admin/Empresas.jsx, pages/admin/Grupos.jsx
 * Depende de      : services/api.js
 */

import api from './api';

const EmpresaService = {
  /** Obtener lista de empresas con filtro de búsqueda */
  listar: (params) => api.get('/empresas', { params }),

  /** Obtener lista de lugares/sedes para selects */
  listarLugares: () => api.get('/empresas/lugares'),
};

export default EmpresaService;
