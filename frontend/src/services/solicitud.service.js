/**
 * services/solicitud.service.js
 * Responsabilidad : Llamadas HTTP para solicitudes de formación.
 * Exporta         : SolicitudService (default)
 * Usado en        : pages/admin/Solicitudes.jsx, components/solicitudes/ModalSolicitud.jsx
 * Depende de      : services/api.js
 */

import api from './api';

const SolicitudService = {
  /** Obtener lista filtrada de solicitudes */
  listar: (params) => api.get('/solicitudes', { params }),

  /** Obtener detalle de una solicitud por ID */
  obtener: (id) => api.get(`/solicitudes/${id}`),

  /** Cambiar estado de una solicitud */
  cambiarEstado: (id, estado) => api.patch(`/solicitudes/${id}/estado`, { estado }),
};

export default SolicitudService;
