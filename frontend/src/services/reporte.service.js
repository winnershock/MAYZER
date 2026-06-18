/**
 * services/reporte.service.js
 * Responsabilidad : Llamadas HTTP para reportes, exportaciones y resumen del dashboard.
 * Exporta         : ReporteService (default)
 * Usado en        : pages/admin/Reportes.jsx, pages/admin/Inicio.jsx
 * Depende de      : services/api.js
 */

import api from './api';

/**
 * Descarga un blob desde la API y lo guarda como archivo local.
 * @param {string} url      - Ruta relativa al api (e.g. '/reportes/exportar/zip')
 * @param {object} params   - Query params
 * @param {string} filename - Nombre del archivo a descargar
 */
async function _descargarArchivo(url, params, filename) {
  const response = await api.get(url, {
    params,
    responseType: 'blob',
  });
  const href    = window.URL.createObjectURL(new Blob([response.data]));
  const link    = document.createElement('a');
  link.href     = href;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(href);
}

const ReporteService = {
  /** Obtener resumen del dashboard (KPIs, estadísticas) */
  resumen: (params) => api.get('/reportes/resumen', { params }),

  /** Descargar Excel filtrado */
  descargarExcel: (params) => {
    const periodo = params.anio
      ? params.mes
        ? `${String(params.mes).padStart(2, '0')}-${params.anio}`
        : params.anio
      : 'completo';
    return _descargarArchivo(
      '/reportes/exportar/excel',
      params,
      `Mayzer_${params.tipo || 'aspirantes'}_${periodo}.xlsx`
    );
  },

  /** Descargar PDF filtrado */
  descargarPdf: (params) => {
    return _descargarArchivo(
      '/reportes/exportar/pdf',
      params,
      `Mayzer_${params.tipo || 'aspirantes'}_${params.anio || 'general'}.pdf`
    );
  },

  /**
   * Descarga el ZIP estructurado por año, o por mes si se especifica.
   * @param {number|string} anio
   * @param {number|string|null} mes  - Si se pasa, filtra solo ese mes
   */
  descargarZipAnual: (anio, mes = null) => {
    const params   = mes ? { anio, mes } : { anio };
    const sufijo   = mes ? `${String(mes).padStart(2, '0')}_${anio}` : anio;
    return _descargarArchivo(
      '/reportes/exportar/zip',
      params,
      `Mayzer_Reporte_${sufijo}.zip`
    );
  },

  /**
   * Descarga el PDF de expediente de un aspirante individual.
   * @param {number|string} id      - ID del aspirante
   * @param {string}        nombre  - Nombre del aspirante (para el filename)
   */
  descargarExpedienteAspirante: (id, nombre) => {
    const nombreSeguro = (nombre || 'Aspirante')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    return _descargarArchivo(
      `/reportes/aspirantes/${id}/pdf`,
      {},
      `Expediente_${nombreSeguro}.pdf`
    );
  },
};

export default ReporteService;
