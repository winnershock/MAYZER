
import api from './api';

// Cuando el backend responde con un error (400/404/500) a una petición con
// responseType "blob", axios entrega ese cuerpo de error como un Blob en
// error.response.data en lugar de JSON. Esta función lo "desenvuelve" para
// que los componentes puedan seguir leyendo error.response.data.error como
// si la petición no hubiera usado blob.
async function _normalizarErrorBlob(error) {
  const data = error?.response?.data;
  const esBlobJson = data instanceof Blob && data.type?.includes('application/json');
  if (!esBlobJson) throw error;

  try {
    const texto = await data.text();
    error.response.data = JSON.parse(texto);
  } catch {
    // Si no se puede parsear, se deja el error original tal cual.
  }
  throw error;
}

async function _descargarArchivo(url, params, filename) {
  let response;
  try {
    response = await api.get(url, {
      params,
      responseType: 'blob',
    });
  } catch (error) {
    return _normalizarErrorBlob(error);
  }
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
};

export default ReporteService;
