/**
 * services/index.js  — Barrel de servicios del frontend
 * Responsabilidad : Re-exporta todos los servicios del dominio para imports limpios.
 * Exporta         : AspiranteService, SolicitudService, GrupoService, EventoService,
 *                   InstructorService, CursoService, EmpresaService, CorreoService,
 *                   ReporteService, AdminUsuarioService, PublicoService
 */

export { default as AspiranteService }    from './aspirante.service';
export { default as SolicitudService }    from './solicitud.service';
export { default as GrupoService }        from './grupo.service';
export { default as EventoService }       from './evento.service';
export { default as InstructorService }   from './instructor.service';
export { default as CursoService }        from './curso.service';
export { default as EmpresaService }      from './empresa.service';
export { default as ReporteService }      from './reporte.service';
export { default as AdminUsuarioService } from './adminUsuario.service';
export { default as PublicoService }      from './publico.service';
export { default as CorreoService }       from './correo.service';
