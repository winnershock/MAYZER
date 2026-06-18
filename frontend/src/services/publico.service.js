/**
 * services/publico.service.js
 * Responsabilidad : Llamadas HTTP a rutas públicas sin autenticación.
 * Exporta         : PublicoService (default)
 * Usado en        : pages/public/FormPublico.jsx
 * Depende de      : services/api.js
 */

import api from './api';

const PublicoService = {
  /** Obtener cursos disponibles para el formulario público */
  listarCursos: () => api.get('/public/cursos'),

  /** Obtener ciudades disponibles para el formulario público */
  listarCiudades: () => api.get('/public/ciudades'),

  /** Enviar solicitud pública de inscripción (multipart/form-data) */
  enviarSolicitud: (formData) =>
    api.post('/public/solicitud', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default PublicoService;
