/**
 * routes/index.js — Barrel de rutas del backend
 * Centraliza el registro de todas las rutas para mantener index.js limpio.
 * Cada entrada define el prefijo de URL y el router correspondiente.
 *
 * Orden: rutas públicas primero, luego auth, luego rutas protegidas.
 */

module.exports = [
  // ── Rutas públicas (sin autenticación) ──────────────────────────────────
  { path: '/api/public',          router: require('./public.routes')         },

  // ── Autenticación ────────────────────────────────────────────────────────
  { path: '/api/auth',            router: require('./auth.routes')            },

  // ── Rutas protegidas (requieren JWT) ─────────────────────────────────────
  { path: '/api/solicitudes',     router: require('./solicitud.routes')       },
  { path: '/api/aspirantes',      router: require('./aspirante.routes')       },
  { path: '/api/cursos',          router: require('./curso.routes')           },
  { path: '/api/instructores',    router: require('./instructor.routes')      },
  { path: '/api/grupos',          router: require('./grupo.routes')           },
  { path: '/api/eventos',         router: require('./evento.routes')          },
  { path: '/api/reportes',        router: require('./reporte.routes')         },
  { path: '/api/empresas',        router: require('./empresa.routes')         },
  { path: '/api/correos',         router: require('./correo.routes')          },
  { path: '/api/admin-usuarios',  router: require('./usuario-admin.routes')  },
];
