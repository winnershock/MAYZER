
import api from './api';

const AdminUsuarioService = {
  listar: () => api.get('/admin-usuarios'),

  toggleEstado: (id, accion) => api.patch(`/admin-usuarios/${id}/${accion}`),
};

export default AdminUsuarioService;
