
export const C = {
  NARANJA:      'FF6719',
  NARANJA_OSC:  'CC5214',
  NARANJA_CLR:  'FFF3EC',
  NARANJA_MID:  'FFE0CC',
  BLANCO:       'FFFFFF',
  GRIS_TITLO:   '1E1E1E',
  GRIS_TEXTO:   '2D2D2D',
  GRIS_SEC:     '555555',
  GRIS_META:    '888888',
  GRIS_HEADER:  'F0F0F0',
  GRIS_BORDE:   'D4D4D4',
  GRIS_BORDE_L: 'EBEBEB',
  VERDE:        '059669',
  ROJO:         'DC2626',
  AZUL:         '2563EB',
};

const borde = (color = C.GRIS_BORDE) => ({
  top:    { style: 'thin', color: { rgb: color } },
  bottom: { style: 'thin', color: { rgb: color } },
  left:   { style: 'thin', color: { rgb: color } },
  right:  { style: 'thin', color: { rgb: color } },
});

const bordeLight = () => borde(C.GRIS_BORDE_L);

export const EST_HEADER_COL = {
  fill:      { fgColor: { rgb: C.NARANJA } },
  font:      { bold: true, color: { rgb: C.BLANCO }, sz: 9.5, name: 'Calibri' },
  border:    borde(C.NARANJA_OSC),
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const EST_CELDA = {
  font:      { sz: 9, color: { rgb: C.GRIS_TEXTO }, name: 'Calibri' },
  border:    bordeLight(),
  alignment: { vertical: 'center', wrapText: false },
};

const EST_CELDA_ALTERNA = {
  ...EST_CELDA,
  fill: { fgColor: { rgb: C.NARANJA_CLR } },
};

const EST_CELDA_NUM = {
  ...EST_CELDA,
  alignment: { horizontal: 'right', vertical: 'center' },
};

const EST_CELDA_NUM_ALTERNA = {
  ...EST_CELDA_ALTERNA,
  alignment: { horizontal: 'right', vertical: 'center' },
};

const EST_CELDA_CENTRO = {
  ...EST_CELDA,
  alignment: { horizontal: 'center', vertical: 'center' },
};

const EST_CELDA_CENTRO_ALTERNA = {
  ...EST_CELDA_ALTERNA,
  alignment: { horizontal: 'center', vertical: 'center' },
};

export const EST_LABEL = {
  font:      { bold: true, sz: 9, color: { rgb: C.GRIS_SEC }, name: 'Calibri' },
  fill:      { fgColor: { rgb: C.GRIS_HEADER } },
  border:    bordeLight(),
  alignment: { vertical: 'center' },
};

export const estValor = (bold = false, color = C.GRIS_TEXTO) => ({
  font:      { bold, sz: 9.5, color: { rgb: color }, name: 'Calibri' },
  border:    bordeLight(),
  alignment: { vertical: 'center' },
});

export const EST_TITULO = {
  font:      { bold: true, sz: 15, color: { rgb: C.NARANJA }, name: 'Calibri' },
  alignment: { horizontal: 'left', vertical: 'center' },
};

export const EST_SUBTITULO = {
  font:      { sz: 8.5, color: { rgb: C.GRIS_META }, name: 'Calibri', italic: true },
  alignment: { horizontal: 'left', vertical: 'center' },
};

export const EST_SECCION = {
  font:      { bold: true, sz: 10, color: { rgb: C.NARANJA }, name: 'Calibri' },
  fill:      { fgColor: { rgb: C.NARANJA_MID } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

export const VACIA = { v: '', t: 's' };

export function estCelda(v, ri, align = null) {
  const esNum = typeof v === 'number';
  const alterna = ri % 2 === 1;
  let base;
  if (esNum) {
    base = alterna ? EST_CELDA_NUM_ALTERNA : EST_CELDA_NUM;
  } else if (align === 'center') {
    base = alterna ? EST_CELDA_CENTRO_ALTERNA : EST_CELDA_CENTRO;
  } else {
    base = alterna ? EST_CELDA_ALTERNA : EST_CELDA;
  }
  return base;
}

function fechaGeneracion() {
  return new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function encabezadoMayzer(tituloReporte, infoExtra = '') {
  const ahora = fechaGeneracion();
  return [
    [{ v: `MAYZER · Trabajo Seguro en Alturas`, t: 's', s: EST_TITULO }],
    [{ v: `${tituloReporte}${infoExtra ? '  ·  ' + infoExtra : ''}`, t: 's', s: {
      font: { bold: true, sz: 10, color: { rgb: C.GRIS_TITLO }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' },
    }}],
    [{ v: `Generado: ${ahora}  ·  SENA Sede Industrial Palmira`, t: 's', s: EST_SUBTITULO }],
    [VACIA],
  ];
}
