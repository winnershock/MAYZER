
async function fetchAutenticado(url) {
  const token = localStorage.getItem('accessToken');
  const respuesta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta;
}

export async function descargarArchivo(url, nombreArchivo) {
  const respuesta = await fetchAutenticado(url);
  const blob      = await respuesta.blob();
  const enlace    = document.createElement('a');
  enlace.href     = URL.createObjectURL(blob);
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function urlExportarReporte(tabla, anio, mes, formato) {
  const params = new URLSearchParams({ anio, tipo: tabla });
  if (mes) params.set('mes', mes);
  return `/api/reportes/exportar/${formato}?${params}`;
}

export function nombreArchivoReporte(tabla, anio, mes, extension) {
  const mesStr = mes ? `${String(mes).padStart(2, '0')}-` : '';
  return `${anio}-${mesStr}${tabla}.${extension}`;
}
