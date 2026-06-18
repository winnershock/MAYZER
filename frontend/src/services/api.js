/**
 * services/api.js
 * Responsabilidad : Instancia central de Axios con baseURL y timeout.
 * Exporta         : api (default)
 * Usado en        : Todos los archivos *.service.js
 * Depende de      : services/auth.interceptor.js
 */

import axios from 'axios';
import { applyAuthInterceptors } from './auth.interceptor';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

applyAuthInterceptors(api);

export default api;
