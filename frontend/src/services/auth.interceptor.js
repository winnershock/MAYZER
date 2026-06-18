/**
 * services/auth.interceptor.js
 * Responsabilidad : Interceptores Axios — adjunta token Bearer y maneja refresh silencioso.
 * Exporta         : applyAuthInterceptors
 * Usado en        : services/api.js
 */
import axios from 'axios';

let refreshando = false;
let colaEspera  = [];

function resolverCola(token, error) {
  colaEspera.forEach(cb => (error ? cb.reject(error) : cb.resolve(token)));
  colaEspera = [];
}

const RUTAS_AUTH = new Set(['/auth/login', '/auth/logout', '/auth/refresh']);

function esRutaAuth(url = '') {
  return RUTAS_AUTH.has(url) || [...RUTAS_AUTH].some(r => url.includes(r));
}

let aplicado = false;

export function applyAuthInterceptors(apiInstance) {
  if (aplicado) return; // evita doble registro en StrictMode
  aplicado = true;

  // ── Request: adjuntar Bearer token ──────────────────────────────────────
  apiInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers ??= {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ── Response: manejo centralizado de 401 ────────────────────────────────
  apiInstance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error?.config;
      if (!original) return Promise.reject(error);

      const url    = original.url ?? '';
      const status = error.response?.status;
      const code   = error.response?.data?.code;

      if (esRutaAuth(url)) return Promise.reject(error);

      // ── TOKEN_EXPIRED → refresh con cola ────────────────────────────────
      if (status === 401 && code === 'TOKEN_EXPIRED' && !original._retry) {
        if (refreshando) {
          return new Promise((resolve, reject) => {
            colaEspera.push({ resolve, reject });
          }).then((token) => {
            original.headers ??= {};
            original.headers.Authorization = `Bearer ${token}`;
            return apiInstance(original);
          });
        }

        original._retry = true;
        refreshando     = true;

        try {
          const { data } = await Promise.race([
            axios.post('/api/auth/refresh', {}, { withCredentials: true }),
            new Promise((_, rej) =>
              setTimeout(() => rej(new Error('Refresh timeout')), 10_000)
            ),
          ]);

          localStorage.setItem('accessToken', data.accessToken);
          // refreshToken se renueva automáticamente vía cookie httpOnly
          resolverCola(data.accessToken, null);
          original.headers ??= {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiInstance(original);
        } catch (refreshError) {
          resolverCola(null, refreshError);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          refreshando = false;
        }
      }

      // ── 401 genérico sin token → redirigir ──────────────────────────────
      if (status === 401 && !original._retry && !localStorage.getItem('accessToken')) {
        localStorage.clear();
        window.location.href = '/login';
      }

      if (import.meta.env?.DEV && status === 401) {
        console.warn(`[auth] 401 en ${url}:`, error.response?.data?.error ?? 'sin detalle');
      }

      return Promise.reject(error);
    }
  );
}
