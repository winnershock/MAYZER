import { useState, useEffect, useCallback, useRef } from 'react';
import { EventoService } from '../services';
import { useAuth } from './useAuth.jsx';

export function useEventos(params = {}) {
  const { usuario, esInstructor, cargando: authCargando } = useAuth();
  const [eventos,  setEventos]  = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const abortRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paramsKey = JSON.stringify({
    ...params,
    _authCargando: authCargando,
    _instructor: esInstructor ? usuario?.instructor_id : null,
  });

  const recargar = useCallback(async () => {
    if (authCargando) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCargando(true);
    setError(null);

    try {
      const query = { ...params };
      if (esInstructor && usuario?.instructor_id) {
        query.instructor_id = usuario.instructor_id;
      }

      const { data } = await EventoService.listar(query, { signal: controller.signal });

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.eventos)
          ? data.eventos
          : [];

      setEventos(lista);
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      setError(e?.response?.data?.error ?? 'Error al cargar eventos');
      setEventos([]);
    } finally {
      if (!controller.signal.aborted) setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    recargar();
    return () => { abortRef.current?.abort(); };
  }, [recargar]);

  return { eventos, cargando, error, recargar };
}
