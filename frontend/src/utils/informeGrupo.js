
function construirExcelEnWorker(g, fechaInicioFmt, fechaFinFmt) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./informeGrupo.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const data = event.data;
      worker.terminate();
      if (data?.ok) {
        resolve({ buffer: data.buffer, nombreArchivo: data.nombreArchivo });
      } else {
        reject(new Error(data?.error || 'Error al construir el informe.'));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err?.message || 'Error inesperado en el worker de informes.'));
    };

    worker.postMessage({ g, fechaInicioFmt, fechaFinFmt });
  });
}

function descargarBufferXlsx(buffer, nombreArchivo) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function descargarInformeGrupo(grupoRow, toast, GrupoService) {
  try {
    const { formatearFecha } = await import('./fecha.js');

    const resp = await GrupoService.obtener(grupoRow.id);
    const g    = resp?.data;
    if (!g) { toast('No se pudo cargar el grupo', 'danger'); return; }

    const fechaInicioFmt = formatearFecha(g.fecha_inicio) || '—';
    const fechaFinFmt    = formatearFecha(g.fecha_fin) || '—';

    const { buffer, nombreArchivo } = await construirExcelEnWorker(g, fechaInicioFmt, fechaFinFmt);
    descargarBufferXlsx(buffer, nombreArchivo);

    toast('Informe descargado correctamente', 'sena');
  } catch (err) {
    console.error('[InformeGrupo]', err);
    toast('Error al generar el informe', 'danger');
  }
}
