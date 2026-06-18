/**
 * hooks/useResumenDashboard.jsx
 * Responsabilidad : Hook para cargar y cachear KPIs del dashboard con auto-revalidación.
 * Exporta         : useResumenDashboard
 * Usado en        : pages/admin/Inicio.jsx
 * Depende de      : services/reporte.service.js, services/grupo.service.js,
 *                   services/solicitud.service.js, services/evento.service.js,
 *                   hooks/useAuth.jsx
 * Optimización    : Grupos y solicitudes filtrados en servidor (antes limit:500 + filtro cliente).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReporteService, GrupoService, SolicitudService, EventoService } from '../services';
import { useAuth } from './useAuth.jsx';

const INTERVALO_MS = 30_000;

// Cache en memoria — singleton de módulo, persiste entre navegaciones de ruta
const _cache = {};

function getCacheKey(usuario, esAdmin, esSuperUsuario, esInstructor) {
  if (esAdmin || esSuperUsuario) return 'admin';
  if (esInstructor && usuario?.instructor_id) return `inst_${usuario.instructor_id}`;
  return null;
}

export function useResumenDashboard() {
  const { usuario, esAdmin, esSuperUsuario, esInstructor, cargando: authCargando } = useAuth();

  const cacheKey = getCacheKey(usuario, esAdmin, esSuperUsuario, esInstructor);
  const cached   = cacheKey ? _cache[cacheKey] : null;

  const [resumen,     setResumen]     = useState(cached?.resumen     ?? null);
  const [solicitudes, setSolicitudes] = useState(cached?.solicitudes ?? []);
  const [grupos,      setGrupos]      = useState(cached?.grupos      ?? []);
  const [cargando,    setCargando]    = useState(!cached);
  const [error,       setError]       = useState(null);

  const abortRef = useRef(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (authCargando) return;
    if (!localStorage.getItem('accessToken')) { setCargando(false); return; }

    if (!silencioso) setCargando(true);
    setError(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      let nextResumen, nextSolicitudes = [], nextGrupos = [];

      if (esAdmin || esSuperUsuario) {
        // ── Optimizado: grupos filtrados en servidor (estado=EN_CURSO, limit=5)
        //    Antes cargaba 500 grupos y filtraba en cliente — ahora solo 5.
        const [r, s, g] = await Promise.all([
          ReporteService.resumen().catch(() => ({ data: null })),
          SolicitudService.listar({ estado: 'PENDIENTE', limit: 5 }).catch(() => ({ data: [] })),
          GrupoService.listar({ estado: 'EN_CURSO', limit: 5 }).catch(() => ({ data: [] })),
        ]);
        if (ctrl.signal.aborted) return;

        nextResumen     = r.data;
        const solArray  = Array.isArray(s.data) ? s.data : (s.data?.solicitudes ?? []);
        nextSolicitudes = solArray.slice(0, 5);
        const grpArray  = Array.isArray(g.data) ? g.data : (g.data?.grupos ?? []);
        nextGrupos      = grpArray.slice(0, 5);

      } else if (esInstructor && usuario?.instructor_id) {
        // ── Optimizado: grupos en curso del instructor filtrados en servidor
        //    Se hacen 4 queries en paralelo en lugar de 1 con limit:500 + filtro cliente.
        const [gAll, gEnCurso, gProg, ev] = await Promise.all([
          GrupoService.listar({ instructor_id: usuario.instructor_id, limit: 1 }).catch(() => ({ data: [] })),
          GrupoService.listar({ instructor_id: usuario.instructor_id, estado: 'EN_CURSO',   limit: 5  }).catch(() => ({ data: [] })),
          GrupoService.listar({ instructor_id: usuario.instructor_id, estado: 'PROGRAMADO', limit: 1  }).catch(() => ({ data: [] })),
          EventoService.listar({ instructor_id: usuario.instructor_id }).catch(() => ({ data: [] })),
        ]);
        if (ctrl.signal.aborted) return;

        const misEventos = Array.isArray(ev.data) ? ev.data : [];
        const enCurso    = Array.isArray(gEnCurso.data) ? gEnCurso.data : (gEnCurso.data?.grupos ?? []);
        const totalGrupos = Array.isArray(gAll.data) ? gAll.data : (gAll.data?.grupos ?? []);

        nextResumen = {
          grupos: {
            total:       gAll.data?.total       ?? totalGrupos.length,
            en_curso:    gEnCurso.data?.total   ?? enCurso.length,
            programados: gProg.data?.total      ?? 0,
            finalizados: 0,
          },
          eventos: { total: misEventos.length },
        };
        nextGrupos = enCurso.slice(0, 5);

      } else {
        setCargando(false);
        return;
      }

      // Solo actualiza si los datos cambiaron — evita re-renders vacíos en autoRefresh
      setResumen(prev =>
        JSON.stringify(prev) !== JSON.stringify(nextResumen) ? nextResumen : prev);
      setSolicitudes(prev =>
        JSON.stringify(prev) !== JSON.stringify(nextSolicitudes) ? nextSolicitudes : prev);
      setGrupos(prev =>
        JSON.stringify(prev) !== JSON.stringify(nextGrupos) ? nextGrupos : prev);

      if (cacheKey) {
        _cache[cacheKey] = { resumen: nextResumen, solicitudes: nextSolicitudes, grupos: nextGrupos };
      }

    } catch {
      if (ctrl.signal.aborted) return;
      setError('Error al cargar el panel');
    } finally {
      if (!ctrl.signal.aborted) setCargando(false);
    }
  }, [authCargando, esAdmin, esSuperUsuario, esInstructor, usuario?.instructor_id, cacheKey]);

  useEffect(() => {
    if (authCargando) return;
    const silencioso = !!(cacheKey && _cache[cacheKey]);
    cargar(silencioso);
    const id = setInterval(() => cargar(true), INTERVALO_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [cargar, authCargando, cacheKey]);

  return { resumen, solicitudes, grupos, cargando, error, recargar: () => cargar(false) };
}
