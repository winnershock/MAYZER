
module.exports = [
  { path: '/api/public',          router: require('./public.routes')         },

  { path: '/api/auth',            router: require('./auth.routes')            },

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
