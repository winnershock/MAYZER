/**
 * hooks/useGrupos.jsx
 * Responsabilidad : Hook para cargar y paginar grupos con filtros, esperando hidratación de Auth.
 * Exporta         : useGrupos
 * Usado en        : pages/admin/Grupos.jsx
 * Depende de      : services/grupo.service.js, hooks/useAuth.jsx
 */
import { useState, useEffect, useCallback } from 'react';
import { GrupoService } from '../services';
import { useAuth } from './useAuth.jsx';

const LIMITE = 25;

export function useGrupos(filtrosExtra = {}) {
  const { usuario, esInstructor, cargando: authCargando } = useAuth();
  const [grupos,       setGrupos]       = useState([]);
  const [total,        setTotal]        = useState(0);
  const [pagina,       setPagina]       = useState(1);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtrosKey = JSON.stringify(filtrosExtra);

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setPagina(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey]);

  const recargar = useCallback(async (paginaOverride) => {
    if (authCargando) return;

    const paginaActual = paginaOverride ?? pagina;
    setCargando(true);
    setError(null);
    try {
      const params = { ...filtrosExtra, limit: LIMITE, page: paginaActual };
      if (esInstructor && usuario?.instructor_id) {
        params.instructor_id = usuario.instructor_id;
      }
      const { data } = await GrupoService.listar(params);
      // Soporte formato paginado { grupos, total } y fallback array plano
      if (Array.isArray(data)) {
        setGrupos(data);
        setTotal(data.length);
      } else {
        setGrupos(Array.isArray(data.grupos) ? data.grupos : []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cargar grupos');
      setGrupos([]);
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCargando, esInstructor, usuario?.instructor_id, filtrosKey, pagina]);

  useEffect(() => { recargar(); }, [recargar]);

  const cambiarPagina = useCallback((nuevaPagina) => {
    setPagina(nuevaPagina);
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

  return { grupos, total, pagina, totalPaginas, limite: LIMITE, cargando, error, recargar, cambiarPagina };
}
