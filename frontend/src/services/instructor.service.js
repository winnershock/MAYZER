import api from './api';

const InstructorService = {
  listar:    ()            => api.get('/instructores'),
  crear:     (form)        => api.post('/instructores', form),
  editar:    (id, form)    => api.put(`/instructores/${id}`, form),
  historial: (id)          => api.get(`/instructores/${id}/historial`),
  eliminar:  (id)          => api.delete(`/instructores/${id}`),
};

export default InstructorService;
