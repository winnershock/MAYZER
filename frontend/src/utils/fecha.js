/**
 * utils/fecha.js
 * Responsabilidad : Helpers de formato y cálculo de fechas del frontend.
 * Exporta         : formatearFecha, formatearFechaHora, generarRangoAnios
 * Usado en        : pages/admin/*, components/instructores/*, constants/index.js
 */

/**
 * Formatea una fecha a DD/MM/YYYY.
 * Acepta strings ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ssZ) y objetos Date.
 * Devuelve '—' si el valor es nulo, vacío o inválido.
 * @param {string|Date|null|undefined} valor
 * @returns {string}
 */
export function formatearFecha(valor) {
  if (!valor) return '—';
  // Si ya tiene formato DD/MM/YYYY devolvemos tal cual
  if (typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;
  // Para strings YYYY-MM-DD evitamos problemas de zona horaria
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

/**
 * Formatea una fecha+hora a DD/MM/YYYY HH:mm.
 * Devuelve '—' si el valor es nulo, vacío o inválido.
 * @param {string|Date|null|undefined} valor
 * @returns {string}
 */
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

/**
 * Verifica si un grupo/evento se solapa con un mes dado.
 * @param {string} fechaInicio  Fecha de inicio del grupo (YYYY-MM-DD)
 * @param {string} fechaFin     Fecha de fin del grupo (YYYY-MM-DD)
 * @param {number} anio
 * @param {number} mes          Mes en base 0 (como getMonth())
 * @returns {boolean}
 */
export function solapaCon(fechaInicio, fechaFin, anio, mes) {
  if (!fechaInicio || !fechaFin) return false;
  const inicio  = new Date(fechaInicio + 'T00:00:00');
  const fin     = new Date(fechaFin    + 'T00:00:00');
  const mesIni  = new Date(anio, mes, 1);
  const mesFin  = new Date(anio, mes + 1, 0);
  return inicio <= mesFin && fin >= mesIni;
}

/**
 * Genera un arreglo de años relativo al año actual.
 * @param {number} antesDelActual  Años a incluir antes del año actual.
 * @param {number} despuesDelActual Años a incluir después del año actual.
 * @returns {number[]}
 */
export function generarRangoAnios(antesDelActual = 2, despuesDelActual = 3) {
  const actual = new Date().getFullYear();
  return Array.from(
    { length: antesDelActual + despuesDelActual + 1 },
    (_, i) => actual - antesDelActual + i
  );
}
