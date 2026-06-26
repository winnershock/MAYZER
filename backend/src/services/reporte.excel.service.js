const XLSX = require('xlsx-js-style');
const { etiquetaPeriodo, NOMBRES_MES: MESES } = require('../utils/formato.utils');

const M = {
  NARANJA:      'FF6719',
  NARANJA_OSC:  'CC5214',
  NARANJA_CLR:  'FFF3EC',
  NARANJA_MID:  'FFE4CC',
  BLANCO:       'FFFFFF',
  GRIS_TEXTO:   '1E1E1E',
  GRIS_SEC:     '555555',
  GRIS_META:    '888888',
  GRIS_BORDE_L: 'EBEBEB',
  GRIS_BORDE:   'D0D0D0',
  VERDE:        '059669',
  ROJO:         'DC2626',
  AZUL:         '1D4ED8',
};

const _borde = (c) => ({
  top:    { style: 'thin', color: { rgb: c } },
  bottom: { style: 'thin', color: { rgb: c } },
  left:   { style: 'thin', color: { rgb: c } },
  right:  { style: 'thin', color: { rgb: c } },
});

const EST_HEADER = {
  fill:      { fgColor: { rgb: M.NARANJA } },
  font:      { bold: true, color: { rgb: M.BLANCO }, sz: 9.5, name: 'Calibri' },
  border:    _borde(M.NARANJA_OSC),
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const EST_CELDA = {
  font:      { sz: 9, color: { rgb: M.GRIS_TEXTO }, name: 'Calibri' },
  border:    _borde(M.GRIS_BORDE_L),
  alignment: { vertical: 'center' },
};

const EST_CELDA_ALT = {
  ...EST_CELDA,
  fill: { fgColor: { rgb: M.NARANJA_CLR } },
};

const EST_NUMERO = {
  ...EST_CELDA,
  alignment: { horizontal: 'right', vertical: 'center' },
};

const EST_NUMERO_ALT = {
  ...EST_CELDA_ALT,
  alignment: { horizontal: 'right', vertical: 'center' },
};

const ETIQUETA_TIPO = {
  aspirantes: 'Aspirantes',
  solicitudes: 'Solicitudes',
  grupos: 'Grupos',
  empresas: 'Empresas',
  aspirantes_empresa: 'Aspirantes y Empresa',
};

function etiquetaTipo(tipo) {
  return ETIQUETA_TIPO[tipo] || (tipo.charAt(0).toUpperCase() + tipo.slice(1));
}

function nombreHoja(tipo) {
  // Excel no permite más de 31 caracteres ni ciertos símbolos en el nombre de hoja.
  return etiquetaTipo(tipo).replace(/[\\/?*[\]]/g, '').slice(0, 31);
}

function construirLibroExcel(encabezados, filas, anchosColumna, tipo, anio, mes) {
  const wb = XLSX.utils.book_new();
  const ahora = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
  const titulo  = [{ v: 'MAYZER · Trabajo Seguro en Alturas — SENA Palmira', t: 's', s: {
    font: { bold: true, sz: 15, color: { rgb: M.NARANJA }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];
  const reporte = [{ v: `Reporte de ${etiquetaTipo(tipo)}  ·  Período: ${etiquetaPeriodo(anio, mes)}`, t: 's', s: {
    font: { bold: true, sz: 10, color: { rgb: M.GRIS_TEXTO }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];
  const meta    = [{ v: `Generado: ${ahora}  ·  ${filas.length} registro${filas.length !== 1 ? 's' : ''}`, t: 's', s: {
    font: { sz: 8.5, color: { rgb: M.GRIS_META }, name: 'Calibri', italic: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];
  const vacio   = [{ v: '', t: 's' }];
  const aoa = [
    titulo, reporte, meta, vacio,
    encabezados.map(h => ({ v: h, t: 's', s: EST_HEADER })),
  ];
  filas.forEach((fila, ri) => {
    aoa.push(fila.map(v => {
      const esNum = typeof v === 'number';
      const alt   = ri % 2 === 1;
      const s = esNum ? (alt ? EST_NUMERO_ALT : EST_NUMERO) : (alt ? EST_CELDA_ALT : EST_CELDA);
      return { v: v ?? '', t: esNum ? 'n' : 's', s };
    }));
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']   = anchosColumna.map(w => ({ wch: w }));
  ws['!rows']   = [{ hpt: 24 }, { hpt: 16 }, { hpt: 14 }, { hpt: 6 }, { hpt: 22 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: encabezados.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: encabezados.length - 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja(tipo));
  return wb;
}

function obtenerConfigExcel(tipo, filas) {
  switch (tipo) {
    case 'aspirantes':
      return {
        encabezados: ['Nombre Completo', 'Tipo Doc.', 'Estado', 'Empresa', 'NIT',
                      'Curso Solicitado', 'Fecha Registro', 'Grupo Asignado', 'Motivo Rechazo'],
        datos:  filas.map(r => [r.nombre_completo, r.tipo_documento, r.estado,
                                r.empresa, r.nit, r.curso, r.fecha_solicitud,
                                r.grupo_asignado || '—', r.motivo_rechazo || '—']),
        anchos: [28, 10, 14, 22, 14, 22, 14, 20, 25],
      };
    case 'solicitudes':
      return {
        encabezados: ['Empresa', 'NIT', 'Tipo Entidad', 'Curso Solicitado', 'Estado', 'Fecha', 'N° Aspirantes'],
        datos:  filas.map(r => [r.empresa, r.nit, r.sector || '—', r.curso,
                                r.estado, r.fecha, Number(r.aspirantes)]),
        anchos: [26, 14, 16, 24, 14, 12, 14],
      };
    case 'grupos':
      return {
        encabezados: ['Grupo', 'Curso', 'Instructor', 'Estado', 'Cupo Máx.', 'Inscritos', 'Inicio', 'Fin', 'Lugar'],
        datos:  filas.map(r => [r.grupo, r.curso, r.instructor, r.estado,
                                Number(r.cupo_maximo), Number(r.inscritos),
                                r.inicio, r.fin, r.lugar || '—']),
        anchos: [24, 22, 22, 14, 10, 10, 12, 12, 18],
      };
    case 'empresas':
      return {
        encabezados: ['Empresa', 'NIT', 'Tipo Entidad', 'Email', 'Teléfono', 'Contacto', 'Cargo Contacto',
                      'Dirección', 'Ciudad', 'Departamento', 'Activo', 'Fecha Registro',
                      'Solicitudes', 'Aspirantes'],
        datos: filas.map(r => [r.nombre, r.nit, r.tipo_entidad, r.email, r.telefono || '—',
                               r.nombre_contacto || '—', r.cargo_contacto || '—',
                               r.direccion || '—', r.ciudad || '—', r.departamento || '—',
                               r.activo ? 'Sí' : 'No', r.fecha_registro,
                               Number(r.total_solicitudes), Number(r.total_aspirantes)]),
        anchos: [26, 14, 14, 26, 13, 20, 18, 24, 16, 16, 8, 14, 12, 12],
      };
    case 'aspirantes_empresa':
      return {
        encabezados: ['Primer Nombre', 'Segundo Nombre', 'Primer Apellido', 'Segundo Apellido',
                      'Tipo Doc.', 'N.° Documento', 'Email Aspirante', 'Teléfono Aspirante',
                      'Fecha Nacimiento', 'Estado', 'Curso Solicitado', 'Fecha Solicitud',
                      'Grupo Asignado', 'Empresa', 'NIT', 'Tipo Entidad', 'Email Empresa',
                      'Teléfono Empresa', 'Contacto', 'Cargo Contacto', 'Dirección', 'Ciudad', 'Departamento'],
        datos: filas.map(r => [r.nombre1 || '—', r.nombre2 || '—', r.apellido1 || '—', r.apellido2 || '—',
                               r.tipo_documento, r.numero_documento || '—',
                               r.email || '—', r.telefono || '—', r.fecha_nacimiento || '—',
                               r.estado, r.curso, r.fecha_solicitud,
                               r.grupo_asignado || '—', r.empresa, r.nit, r.tipo_entidad,
                               r.empresa_email, r.empresa_telefono || '—',
                               r.nombre_contacto || '—', r.cargo_contacto || '—',
                               r.direccion || '—', r.ciudad || '—', r.departamento || '—']),
        anchos: [16, 16, 16, 16, 10, 16, 24, 14, 14, 14, 22, 14, 20, 22, 14, 14, 24, 14, 20, 18, 24, 16, 16],
      };
    default:
      return null;
  }
}

async function construirExcelMensual(aspirantes, estadosRes, cursosRes, empresasRes, anio, mes) {
  const wb  = XLSX.utils.book_new();
  const ahora = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const periodo = `${MESES[mes]} ${anio}`;

  const encAsp = [
    'N°', 'Nombre Completo', 'Tipo Doc.', 'N° Documento', 'Correo',
    'Teléfono', 'Estado', 'Empresa', 'NIT', 'Tipo Entidad',
    'Curso Solicitado', 'Grupo Asignado', 'Fecha Registro', 'Motivo Rechazo',
  ];
  const anchosAsp = [4, 28, 9, 14, 26, 13, 13, 24, 14, 14, 24, 20, 13, 24];

  const tituloAsp = [{ v: `MAYZER · Aspirantes — ${periodo}`, t: 's', s: {
    font: { bold: true, sz: 14, color: { rgb: M.NARANJA }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];
  const metaAsp = [{ v: `Generado: ${ahora}  ·  ${aspirantes.length} aspirante${aspirantes.length !== 1 ? 's' : ''}  ·  SENA Palmira`, t: 's', s: {
    font: { sz: 8.5, color: { rgb: M.GRIS_META }, name: 'Calibri', italic: true },
  }}];

  const aoaAsp = [
    tituloAsp, metaAsp, [{ v: '', t: 's' }],
    encAsp.map(h => ({ v: h, t: 's', s: EST_HEADER })),
  ];

  aspirantes.forEach((a, ri) => {
    const alt = ri % 2 === 1;
    const S   = (v, num = false) => ({
      v: v ?? '',
      t: num ? 'n' : 's',
      s: num ? (alt ? EST_NUMERO_ALT : EST_NUMERO) : (alt ? EST_CELDA_ALT : EST_CELDA),
    });
    aoaAsp.push([
      S(ri + 1, true), S(a.nombre_completo), S(a.tipo_documento), S(a.numero_documento),
      S(a.email), S(a.telefono), S(a.estado_nombre),
      S(a.empresa), S(a.nit), S(a.tipo_entidad),
      S(a.curso_nombre), S(a.grupo_nombre || '—'),
      S(new Date(a.created_at).toLocaleDateString('es-CO')),
      S(a.motivo_rechazo || '—'),
    ]);
  });

  const wsAsp       = XLSX.utils.aoa_to_sheet(aoaAsp);
  wsAsp['!cols']    = anchosAsp.map(w => ({ wch: w }));
  wsAsp['!rows']    = [{ hpt: 22 }, { hpt: 14 }, { hpt: 5 }, { hpt: 22 }];
  wsAsp['!merges']  = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: encAsp.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: encAsp.length - 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsAsp, 'Aspirantes');

  const aoaStat = [
    [{ v: `MAYZER · Estadísticas — ${periodo}`, t: 's', s: {
      font: { bold: true, sz: 13, color: { rgb: M.NARANJA }, name: 'Calibri' },
    }}],
    [{ v: '', t: 's' }],
  ];

  const totalAsp = aspirantes.length;
  aoaStat.push(
    [{ v: 'RESUMEN GENERAL', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'left' } } }],
    [{ v: 'Total de aspirantes', t: 's', s: EST_CELDA }, { v: totalAsp, t: 'n', s: EST_NUMERO }],
    [{ v: '', t: 's' }]
  );

  aoaStat.push(
    [{ v: 'POR ESTADO', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'left' } } },
     { v: 'CANTIDAD', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'center' } } }],
  );
  estadosRes.forEach((e, ri) => {
    const alt = ri % 2 === 1;
    aoaStat.push([
      { v: e.estado, t: 's', s: alt ? EST_CELDA_ALT : EST_CELDA },
      { v: Number(e.total), t: 'n', s: alt ? EST_NUMERO_ALT : EST_NUMERO },
    ]);
  });
  aoaStat.push([{ v: '', t: 's' }]);

  aoaStat.push(
    [{ v: 'POR CURSO', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'left' } } },
     { v: 'ASPIRANTES', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'center' } } }],
  );
  cursosRes.forEach((c, ri) => {
    const alt = ri % 2 === 1;
    aoaStat.push([
      { v: c.curso, t: 's', s: alt ? EST_CELDA_ALT : EST_CELDA },
      { v: Number(c.total), t: 'n', s: alt ? EST_NUMERO_ALT : EST_NUMERO },
    ]);
  });
  aoaStat.push([{ v: '', t: 's' }]);

  aoaStat.push(
    [{ v: 'EMPRESAS (TOP 20)', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'left' } } },
     { v: 'NIT', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'center' } } },
     { v: 'ASPIRANTES', t: 's', s: { font: { bold: true, sz: 10, color: { rgb: M.BLANCO }, name: 'Calibri' }, fill: { fgColor: { rgb: M.NARANJA } }, alignment: { horizontal: 'center' } } }],
  );
  empresasRes.forEach((e, ri) => {
    const alt = ri % 2 === 1;
    aoaStat.push([
      { v: e.empresa, t: 's', s: alt ? EST_CELDA_ALT : EST_CELDA },
      { v: e.nit || '—',    t: 's', s: alt ? EST_CELDA_ALT : EST_CELDA },
      { v: Number(e.aspirantes), t: 'n', s: alt ? EST_NUMERO_ALT : EST_NUMERO },
    ]);
  });

  const wsStat     = XLSX.utils.aoa_to_sheet(aoaStat);
  wsStat['!cols']  = [{ wch: 34 }, { wch: 14 }, { wch: 12 }];
  wsStat['!merges']= [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, wsStat, 'Estadísticas');

  return wb;
}

module.exports = {
  construirLibroExcel,
  obtenerConfigExcel,
  construirExcelMensual,
};
