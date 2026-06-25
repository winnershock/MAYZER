
export function formatearFecha(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;
  let fecha;
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-').map(Number);
    fecha = new Date(anio, mes - 1, dia);
  } else {
    fecha = new Date(valor);
  }
  if (isNaN(fecha.getTime())) return String(valor);
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const a = fecha.getFullYear();
  return `${d}/${m}/${a}`;
}

export function formatearFechaHora(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return String(valor);
  const d  = String(fecha.getDate()).padStart(2, '0');
  const m  = String(fecha.getMonth() + 1).padStart(2, '0');
  const a  = fecha.getFullYear();
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mm = String(fecha.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${a} ${hh}:${mm}`;
}

export function solapaCon(fechaInicio, fechaFin, anio, mes) {
  if (!fechaInicio || !fechaFin) return false;
  const inicio  = new Date(fechaInicio + 'T00:00:00');
  const fin     = new Date(fechaFin    + 'T00:00:00');
  const mesIni  = new Date(anio, mes, 1);
  const mesFin  = new Date(anio, mes + 1, 0);
  return inicio <= mesFin && fin >= mesIni;
}

export function generarRangoAnios(antesDelActual = 2, despuesDelActual = 3) {
  const actual = new Date().getFullYear();
  return Array.from(
    { length: antesDelActual + despuesDelActual + 1 },
    (_, i) => actual - antesDelActual + i
  );
}
