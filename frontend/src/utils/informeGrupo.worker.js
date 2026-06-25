import * as XLSX from 'xlsx-js-style';
import {
  C, EST_HEADER_COL, EST_LABEL,
  estValor, estCelda, encabezadoMayzer, VACIA,
} from './excelEstilos.js';

const borde = (c = C.GRIS_BORDE_L) => ({
  top:    { style: 'thin', color: { rgb: c } },
  bottom: { style: 'thin', color: { rgb: c } },
  left:   { style: 'thin', color: { rgb: c } },
  right:  { style: 'thin', color: { rgb: c } },
});

function construirWorkbook(g, fechaInicioFmt, fechaFinFmt) {
  const wb    = XLSX.utils.book_new();
  const VERDE = C.VERDE, ROJO = C.ROJO;

  const inscritos   = g.aspirantes?.length ?? 0;
  const disponible  = (g.cupo_maximo ?? 0) - inscritos;
  const estadoColor = g.estado === 'EN_CURSO'
    ? VERDE
    : g.estado === 'FINALIZADO'
      ? C.GRIS_SEC
      : C.NARANJA;

  const encabs = encabezadoMayzer('Informe de Grupo', g.nombre || '');

  const secHdr = (txt) => ({
    v: txt, t: 's', s: {
      font:      { bold: true, sz: 9.5, color: { rgb: C.BLANCO }, name: 'Calibri' },
      fill:      { fgColor: { rgb: C.NARANJA } },
      border:    borde(C.NARANJA_OSC),
      alignment: { horizontal: 'left', vertical: 'center' },
    },
  });

  const fichaRows = [
    [secHdr('DATOS DEL GRUPO'), VACIA, VACIA, VACIA],
    [{ v: 'Nombre del grupo',  t: 's', s: EST_LABEL }, { v: g.nombre || '—',                      t: 's', s: estValor(true)  }, VACIA, VACIA],
    [{ v: 'Código',            t: 's', s: EST_LABEL }, { v: g.codigo != null ? String(g.codigo) : '—', t: 's', s: estValor()  }, VACIA, VACIA],
    [{ v: 'Curso',             t: 's', s: EST_LABEL }, { v: g.curso_nombre || '—',                t: 's', s: estValor()      }, VACIA, VACIA],
    [{ v: 'Instructor',        t: 's', s: EST_LABEL }, { v: g.instructor_nombre || '—',           t: 's', s: estValor()      }, VACIA, VACIA],
    [{ v: 'Estado',            t: 's', s: EST_LABEL }, { v: g.estado || '—',                      t: 's', s: estValor(true, estadoColor) }, VACIA, VACIA],
    [{ v: 'Fecha inicio',      t: 's', s: EST_LABEL }, { v: fechaInicioFmt || '—',                t: 's', s: estValor()      }, VACIA, VACIA],
    [{ v: 'Fecha fin',         t: 's', s: EST_LABEL }, { v: fechaFinFmt || '—',                   t: 's', s: estValor()      }, VACIA, VACIA],
    [{ v: 'Lugar',             t: 's', s: EST_LABEL }, { v: g.lugar_nombre || g.lugar || 'Sin especificar', t: 's', s: estValor() }, VACIA, VACIA],
    [{ v: 'Inscritos',         t: 's', s: EST_LABEL }, { v: inscritos,             t: 'n', s: estValor(true)             }, VACIA, VACIA],
    [{ v: 'Cupo máximo',       t: 's', s: EST_LABEL }, { v: g.cupo_maximo ?? 0,   t: 'n', s: estValor()                 }, VACIA, VACIA],
    [{ v: 'Cupo disponible',   t: 's', s: EST_LABEL }, { v: disponible, t: 'n', s: estValor(true, disponible > 0 ? VERDE : ROJO) }, VACIA, VACIA],
    [VACIA, VACIA, VACIA, VACIA],
    [{ v: 'Observaciones',     t: 's', s: EST_LABEL }, { v: g.observaciones || '—',               t: 's', s: estValor()      }, VACIA, VACIA],
  ];

  const resumenAOA = [...encabs, ...fichaRows];
  const wsRes = XLSX.utils.aoa_to_sheet(resumenAOA);
  wsRes['!cols']   = [{ wch: 20 }, { wch: 38 }, { wch: 10 }, { wch: 10 }];
  wsRes['!rows']   = [{ hpt: 22 }, { hpt: 16 }, { hpt: 14 }, { hpt: 8 }];
  wsRes['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    ...fichaRows.map((_, fi) => ({
      s: { r: encabs.length + fi, c: 1 },
      e: { r: encabs.length + fi, c: 3 },
    })),
  ];
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen');

  const aspirantes = g.aspirantes ?? [];
  const COLS = ['#', 'Nombre Completo', 'Tipo Doc.', 'N.° Documento',
    'Email', 'Teléfono', 'Empresa', 'Curso Requerido', 'Estado'];

  const aspAOA = [
    ...encabezadoMayzer('Aspirantes del Grupo', `${g.nombre} · Total: ${inscritos}`),
    [secHdr('LISTADO DE ASPIRANTES'), ...Array(COLS.length - 1).fill(VACIA)],
    COLS.map(h => ({ v: h, t: 's', s: EST_HEADER_COL })),
    ...aspirantes.map((a, ri) =>
      [
        ri + 1,
        a.nombre_completo   || '—',
        a.tipo_documento    || '—',
        a.numero_documento  || '—',
        a.email             || '—',
        a.telefono          || '—',
        a.empresa           || '—',
        a.curso_requerido   || '—',
        a.inscripcion_estado || a.estado || '—',
      ].map(v => ({ v: v ?? '', t: typeof v === 'number' ? 'n' : 's', s: estCelda(v, ri) }))
    ),
  ];

  const wsAsp = XLSX.utils.aoa_to_sheet(aspAOA);
  wsAsp['!cols']   = [4, 30, 10, 18, 28, 14, 22, 22, 16].map(w => ({ wch: w }));
  wsAsp['!rows']   = [{ hpt: 22 }, { hpt: 16 }, { hpt: 14 }, { hpt: 8 }];
  wsAsp['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: COLS.length - 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsAsp, 'Aspirantes');

  return wb;
}

self.onmessage = (event) => {
  const { g, fechaInicioFmt, fechaFinFmt } = event.data;
  try {
    const wb     = construirWorkbook(g, fechaInicioFmt, fechaFinFmt);
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx', bookSST: false });
    const nombreArchivo = `Informe_${(g.nombre || 'grupo').replace(/[^a-zA-Z0-9_\-]/g, '_')}.xlsx`;
    self.postMessage({ ok: true, buffer, nombreArchivo }, [buffer]);
  } catch (err) {
    self.postMessage({ ok: false, error: err?.message || 'Error al construir el Excel.' });
  }
};
