
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

  return {
    filtro: `AND ${columna} >= ? AND ${columna} < ?`,
    params: [`${anioNum}-01-01`, `${anioNum + 1}-01-01`],
  };
}

function normalizarPaginacion(query) {
  const paginaRaw   = query.page      ?? query.pagina     ?? 1;
  const porPaginaRaw= query.limit     ?? query.por_pagina ?? 25;

  const pagina = Math.max(1, Number(paginaRaw));
  const limit  = Math.max(1, Math.min(500, Number(porPaginaRaw)));
  const offset = (pagina - 1) * limit;
  return { limit, offset, pagina };
}

module.exports = { construirFiltroPeriodo, normalizarPaginacion };
