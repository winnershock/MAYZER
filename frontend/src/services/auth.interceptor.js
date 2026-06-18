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

function redirigirLogin() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('usuario');
  // Evitar loop si ya estamos en /login
  if (!window.location.pathname.includes('/login')) {
    window.location.replace('/login');
  }
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

      // No interceptar rutas de auth para evitar loops
      if (esRutaAuth(url)) return Promise.reject(error);

      // ── Cualquier 401 → intentar refresh silencioso ──────────────────
      if (status === 401 && !original._retry) {

        // Si ya hay un refresh en curso, encolar y esperar
        if (refreshando) {
          return new Promise((resolve, reject) => {
            colaEspera.push({ resolve, reject });
          }).then((token) => {
            original.headers ??= {};
            original.headers.Authorization = `Bearer ${token}`;
            return apiInstance(original);
          }).catch(() => {
            redirigirLogin();
            return Promise.reject(error);
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
          resolverCola(data.accessToken, null);
          original.headers ??= {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiInstance(original);

        } catch {
          // Refresh falló → cookie expirada o revocada → logout forzado
          resolverCola(null, new Error('Sesión expirada'));
          redirigirLogin();
          return Promise.reject(error);
        } finally {
          refreshando = false;
        }
      }

      if (import.meta.env?.DEV && status === 401) {
        console.warn(`[auth] 401 en ${url}:`, error.response?.data?.error ?? 'sin detalle');
      }

      return Promise.reject(error);
    }
  );
}
