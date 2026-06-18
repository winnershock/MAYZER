/**
 * services/adminUsuario.service.js
 * Responsabilidad : Llamadas HTTP para gestión de cuentas de administrador.
 * Exporta         : AdminUsuarioService (default)
 * Usado en        : pages/admin/Administradores.jsx
 * Depende de      : services/api.js
 */

import api from './api';

const AdminUsuarioService = {
  /** Obtener lista de administradores */
  listar: () => api.get('/admin-usuarios'),

  /** Activar o desactivar un administrador */
  toggleEstado: (id, accion) => api.patch(`/admin-usuarios/${id}/${accion}`),
};

export default AdminUsuarioService;
