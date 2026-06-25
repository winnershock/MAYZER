
import api from './api';

const PublicoService = {
  listarCursos: () => api.get('/public/cursos'),

  listarCiudades: () => api.get('/public/ciudades'),

  enviarSolicitud: (formData) =>
    api.post('/public/solicitud', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default PublicoService;
