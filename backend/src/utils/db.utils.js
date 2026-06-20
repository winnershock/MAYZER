/**
 * utils/db.utils.js
 * Responsabilidad : Helpers SQL reutilizables (filtros de fecha, paginación).
 * Exporta         : construirFiltroPeriodo, normalizarPaginacion
 * Usado en        : controllers/aspirante, controllers/solicitud, controllers/grupo, controllers/reporte
 */

/**
 * Construye un fragmento SQL AND col >= inicio AND col < fin para filtrar por período.
 * El rango de fechas permite que MySQL use un índice B-TREE sobre la columna,
 * a diferencia de YEAR(col)/MONTH(col) que obligan a full-table-scan.
 *
 * @param {string|number} anio    - Año (ej. 2025) o vacío
 * @param {string|number} mes     - Mes 1-12 o vacío
 * @param {string}        columna - Columna de fecha (ej. 'a.created_at')
 * @returns {{ filtro: string, params: Array }}
 */
function construirFiltroPeriodo(anio, mes, columna = 'created_at') {
  if (!anio) return { filtro: '', params: [] };

  const anioNum = Number(anio);

  if (mes) {
    const mesNum   = Number(mes);
    const inicio   = `${anioNum}-${String(mesNum).padStart(2, '0')}-01`;
    const mesNext  = mesNum === 12 ? 1 : mesNum + 1;
    const anioNext = mesNum === 12 ? anioNum + 1 : anioNum;
    const fin      = `${anioNext}-${String(mesNext).padStart(2, '0')}-01`;
    return {
      filtro: `AND ${columna} >= ? AND ${columna} < ?`,
      params: [inicio, fin],
    };
  }

  // Solo año → rango completo del año
  return {
    filtro: `AND ${columna} >= ? AND ${columna} < ?`,
    params: [`${anioNum}-01-01`, `${anioNum + 1}-01-01`],
  };
}

/**
 * Normaliza los parámetros de paginación de una query string.
 * Acepta tanto la convención antigua (pagina / por_pagina) como la nueva (page / limit).
 * La nueva convención tiene precedencia cuando ambas están presentes.
 *
 * @param {{ pagina?: string|number, por_pagina?: string|number,
 *           page?: string|number,   limit?: string|number }} query
 * @returns {{ limit: number, offset: number, pagina: number }}
 */
function normalizarPaginacion(query) {
  const paginaRaw    = query.page  ?? query.pagina     ?? 1;
  const porPaginaRaw = query.limit ?? query.por_pagina ?? 25;

  // Number(objeto) o Number('[object Object]') da NaN — sin este resguardo,
  // un valor mal formado (ej. un evento del DOM filtrado por error desde el
  // frontend) se propagaría como `LIMIT NaN OFFSET NaN` en SQL crudo y
  // tumbaría la query. Cualquier valor no numérico o no finito cae al default.
  const paginaNum    = Number(paginaRaw);
  const porPaginaNum = Number(porPaginaRaw);

  const pagina = Math.max(1, Number.isFinite(paginaNum) ? paginaNum : 1);
  const limit  = Math.max(1, Math.min(500, Number.isFinite(porPaginaNum) ? porPaginaNum : 25));
  const offset = (pagina - 1) * limit;
  return { limit, offset, pagina };
}

module.exports = { construirFiltroPeriodo, normalizarPaginacion };
