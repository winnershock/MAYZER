/**
 * services/correo.service.js
 * Responsabilidad : Llamadas HTTP para envío e historial de correos.
 * Exporta         : CorreoService (default)
 * Usado en        : Cualquier componente que gestione correos
 * Depende de      : services/api.js
 */

import api from './api';

const CorreoService = {
  /**
   * Enviar un correo manualmente.
   * @param {{ tipo: string, destinatario: string, datos?: object,
   *           asunto?: string, aspirante_id?: number, empresa_id?: number }} payload
   */
  enviar: (payload) => api.post('/correos', payload),

  /**
   * Historial paginado de correos enviados.
   * @param {{ page?: number, limit?: number }} params
   */
  historial: (params) => api.get('/correos/historial', { params }),
};

export default CorreoService;
