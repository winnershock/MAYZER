/**
 * services/evento.service.js
 * Responsabilidad : Llamadas HTTP para eventos del calendario.
 * Exporta         : EventoService (default)
 * Usado en        : pages/admin/Calendario.jsx, components/grupos/ModalEventoCalendario.jsx
 * Depende de      : services/api.js
 */

import api from './api';

const EventoService = {
  /** Obtener eventos por mes y año — acepta signal para cancelación */
  listar: (params, opts) => api.get('/eventos', { params, signal: opts?.signal }),

  /** Crear un nuevo evento */
  crear: (form) => api.post('/eventos', form),

  /** Actualizar un evento existente */
  actualizar: (id, form) => api.put(`/eventos/${id}`, form),

  /** Eliminar un evento */
  eliminar: (id) => api.delete(`/eventos/${id}`),
};

export default EventoService;
