
import axios from 'axios';
import { applyAuthInterceptors } from './auth.interceptor';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

applyAuthInterceptors(api);

export default api;
