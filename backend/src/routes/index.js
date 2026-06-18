/**
 * routes/index.js  — Barrel de rutas del backend
 * Responsabilidad : Centraliza el registro de todas las rutas para mantener index.js limpio.
 * Exporta         : Array de { path, router } — montado en index.js con app.use()
 * Orden           : Rutas públicas → autenticación → rutas protegidas.
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
