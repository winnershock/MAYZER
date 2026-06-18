/**
 * utils/excelEstilos.js
 * Responsabilidad : Estilos Excel centralizados con la identidad visual Mayzer.
 * Exporta         : C (paleta), FONT, ALIGN, BORDER, headerCell, subHeaderCell,
 *                   dataCell, altCell, totalCell, titleStyle
 * Usado en        : utils/informeGrupo.js, pages/admin/Reportes.jsx
 */

// ── Paleta de colores Mayzer ──────────────────────────────
export const C = {
  NARANJA:      'FF6719',  // Brand principal Mayzer
  NARANJA_OSC:  'CC5214',  // Naranja oscuro para bordes de header
  NARANJA_CLR:  'FFF3EC',  // Fondo naranja muy claro (filas alternas)
  NARANJA_MID:  'FFE0CC',  // Naranja medio (subtítulos)
  BLANCO:       'FFFFFF',
  GRIS_TITLO:   '1E1E1E',  // Texto títulos
  GRIS_TEXTO:   '2D2D2D',  // Texto principal
  GRIS_SEC:     '555555',  // Texto secundario
  GRIS_META:    '888888',  // Metadatos
  GRIS_HEADER:  'F0F0F0',  // Fondo header de info-section
  GRIS_BORDE:   'D4D4D4',  // Bordes generales
  GRIS_BORDE_L: 'EBEBEB',  // Bordes ligeros filas
  VERDE:        '059669',
  ROJO:         'DC2626',
  AZUL:         '2563EB',
};

// ── Estilo borde estándar ─────────────────────────────────
const borde = (color = C.GRIS_BORDE) => ({
  top:    { style: 'thin', color: { rgb: color } },
  bottom: { style: 'thin', color: { rgb: color } },
  left:   { style: 'thin', color: { rgb: color } },
  right:  { style: 'thin', color: { rgb: color } },
});

const bordeLight = () => borde(C.GRIS_BORDE_L);

// ── Estilos de encabezado de columna ─────────────────────
export const EST_HEADER_COL = {
  fill:      { fgColor: { rgb: C.NARANJA } },
  font:      { bold: true, color: { rgb: C.BLANCO }, sz: 9.5, name: 'Calibri' },
  border:    borde(C.NARANJA_OSC),
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

// ── Estilos de celda de datos ─────────────────────────────
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

// ── Estilos de ficha de info (label / valor) ──────────────
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

// ── Estilo título principal ───────────────────────────────
export const EST_TITULO = {
  font:      { bold: true, sz: 15, color: { rgb: C.NARANJA }, name: 'Calibri' },
  alignment: { horizontal: 'left', vertical: 'center' },
};

// ── Estilo subtítulo / metadata ───────────────────────────
export const EST_SUBTITULO = {
  font:      { sz: 8.5, color: { rgb: C.GRIS_META }, name: 'Calibri', italic: true },
  alignment: { horizontal: 'left', vertical: 'center' },
};

// ── Estilo separador de sección ───────────────────────────
export const EST_SECCION = {
  font:      { bold: true, sz: 10, color: { rgb: C.NARANJA }, name: 'Calibri' },
  fill:      { fgColor: { rgb: C.NARANJA_MID } },
  alignment: { horizontal: 'left', vertical: 'center' },
};

// ── Celda vacía ───────────────────────────────────────────
export const VACIA = { v: '', t: 's' };

// ── Helpers ───────────────────────────────────────────────

/**
 * Aplica el estilo correcto (normal / alterna / número) a una celda de datos.
 * @param {*} v      Valor de la celda
 * @param {number} ri Índice de fila (0-based, desde la primera fila de datos)
 * @param {'left'|'center'|'right'} align Alineación forzada (opcional)
 */
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

/**
 * Devuelve una fecha/hora de generación formateada para Colombia.
 */
function fechaGeneracion() {
  return new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Encabezado estándar Mayzer para cualquier hoja Excel.
 * Retorna [fila_titulo, fila_subtitulo, fila_vacia].
 */
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
