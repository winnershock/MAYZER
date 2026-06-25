
import api from './api';

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
  resumen: (params) => api.get('/reportes/resumen', { params }),

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

  descargarPdf: (params) => {
    return _descargarArchivo(
      '/reportes/exportar/pdf',
      params,
      `Mayzer_${params.tipo || 'aspirantes'}_${params.anio || 'general'}.pdf`
    );
  },

  descargarZipAnual: (anio, mes = null) => {
    const params   = mes ? { anio, mes } : { anio };
    const sufijo   = mes ? `${String(mes).padStart(2, '0')}_${anio}` : anio;
    return _descargarArchivo(
      '/reportes/exportar/zip',
      params,
      `Mayzer_Reporte_${sufijo}.zip`
    );
  },

  descargarZipMisGrupos: (anio, mes = null) => {
    const params = mes ? { anio, mes } : { anio };
    const sufijo = mes ? `${String(mes).padStart(2, '0')}_${anio}` : anio;
    return _descargarArchivo(
      '/reportes/exportar/zip-mis-grupos',
      params,
      `Mayzer_MisGrupos_${sufijo}.zip`
    );
  },

  descargarZipGrupo: (grupoId, nombreGrupo = 'Grupo') => {
    return _descargarArchivo(
      '/reportes/exportar/zip-grupo',
      { grupo_id: grupoId },
      `Mayzer_${nombreGrupo.replace(/[^a-zA-Z0-9_-]+/g, '_')}.zip`
    );
  },

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
