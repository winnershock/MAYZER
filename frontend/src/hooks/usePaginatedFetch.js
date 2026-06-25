import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_LIMITE     = 25;
const DEFAULT_DEBOUNCE   = 300;

export function usePaginatedFetch(
  fetchFn,
  filtros       = {},
  limite        = DEFAULT_LIMITE,
  debounceMs    = DEFAULT_DEBOUNCE,
) {
  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pagina,   setPagina]   = useState(1);
  const [cargando, setCargando] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtrosKey = JSON.stringify(filtros);

  useEffect(() => {
    setPagina(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey]);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { limit: limite, page: pagina };
      const filtrosActivos = JSON.parse(filtrosKey);
      Object.entries(filtrosActivos).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) params[k] = v;
      });

      const { data } = await fetchFnRef.current(params);

      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else {
        const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
        setItems(arrayKey ? data[arrayKey] : []);
        setTotal(data.total ?? 0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrosKey, pagina, limite]);

  useEffect(() => {
    const t = setTimeout(cargar, debounceMs);
    return () => clearTimeout(t);
  }, [cargar, debounceMs]);

  const cambiarPagina = useCallback((nuevaPagina) => {
    setPagina(nuevaPagina);
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return { items, total, pagina, totalPaginas, limite, cargando, recargar: cargar, cambiarPagina };
}
