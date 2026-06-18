/**
 * utils/descarga.js
 * Responsabilidad : Helpers para descarga autenticada de archivos binarios del servidor.
 * Exporta         : descargarArchivo
 * Usado en        : pages/admin/Reportes.jsx
 */

/**
 * Realiza un fetch autenticado con el Bearer token del localStorage.
 * Función privada — usada únicamente por descargarArchivo en este módulo.
 * @param {string} url
 * @returns {Promise<Response>}
 */
async function fetchAutenticado(url) {
  const token = localStorage.getItem('accessToken');
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta;
}

/**
 * Descarga un archivo desde una URL autenticada y lo guarda con el nombre dado.
 * @param {string} url
 * @param {string} nombreArchivo
 */
export async function descargarArchivo(url, nombreArchivo) {
  const respuesta = await fetchAutenticado(url);
  const blob      = await respuesta.blob();
  const enlace    = document.createElement('a');
  enlace.href     = URL.createObjectURL(blob);
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

/**
 * Construye la URL de exportación de reportes.
 * @param {string} tabla  'aspirantes' | 'solicitudes' | 'grupos'
 * @param {string|number} anio
 * @param {string|number} mes
 * @param {'pdf'|'excel'} formato
 * @returns {string}
 */
export function urlExportarReporte(tabla, anio, mes, formato) {
  const params = new URLSearchParams({ anio, tipo: tabla });
  if (mes) params.set('mes', mes);
  return `/api/reportes/exportar/${formato}?${params}`;
}

/**
 * Genera el nombre de archivo para un reporte exportado.
 * @param {string} tabla
 * @param {string|number} anio
 * @param {string|number} mes
 * @param {'pdf'|'xlsx'} extension
 * @returns {string}
 */
export function nombreArchivoReporte(tabla, anio, mes, extension) {
  const mesStr = mes ? `${String(mes).padStart(2, '0')}-` : '';
  return `${anio}-${mesStr}${tabla}.${extension}`;
}
