/**
 * Archivo: controllers/reporte.controller.js  v1.0.0
 * Responsabilidad: Capa HTTP para reportes — valida parámetros, orquesta servicios,
 *                  construye documentos PDF/Excel/ZIP y envía la respuesta.
 * Conecta con: services/reporte.service.js, utils/db.utils.js, utils/formato.utils.js,
 *              pdfkit, xlsx-js-style, archiver.
 * Cambios v1.0.0:
 *   - CORREGIDO: crecimiento dinámico de contenedores en PDFs individuales.
 *   - CORREGIDO: wrapping y auto-height en _fila2 y _filaTodo.
 *   - CORREGIDO: resúmenes/conteos en PDF general ahora en grid horizontal (filas de 4).
 *   - CORREGIDO: _fila2 ya no trunca con ellipsis; permite salto de línea real.
 *   - MEJORADO: aprovechamiento de espacio vertical.
 *   - LIMPIADO: eliminados helpers y lógica de posicionamiento redundante.
 */

const path        = require('path');
const fs          = require('fs');
const PDFDocument = require('pdfkit');
const XLSX        = require('xlsx-js-style');
const archiver    = require('archiver');

const { construirFiltroPeriodo }         = require('../utils/db.utils');
const { etiquetaPeriodo, NOMBRES_MES: MESES } = require('../utils/formato.utils');
const ReporteData                        = require('../services/reporte.service');
const { pool }                           = require('../config/db');

// ── Directorio de uploads ──────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads/documentos');

// ── Colores corporativos Mayzer ────────────────────────────
const COLOR = {
  brand:      '#FF6719',
  brandDark:  '#CC5214',
  dark:       '#1a1a1a',
  gray:       '#555555',
  lightGray:  '#888888',
  light:      '#f7f7f7',
  lightBrand: '#FFF3EC',
  border:     '#e0e0e0',
  white:      '#FFFFFF',
  green:      '#059669',
  red:        '#DC2626',
  blue:       '#1D4ED8',
};

// ── Paleta Excel ───────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════
// ── Validación de parámetros ──────────────────────────────
// ══════════════════════════════════════════════════════════

function validarParamsExport(query) {
  const { anio, mes, tipo = 'aspirantes' } = query;
  if (!ReporteData.esTipoValido(tipo)) {
    return { ok: false, mensaje: `Tipo "${tipo}" no reconocido. Válidos: aspirantes, solicitudes, grupos.` };
  }
  if (anio !== undefined) {
    const n = Number(anio);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) return { ok: false, mensaje: `Parámetro "anio" inválido: ${anio}` };
  }
  if (mes !== undefined) {
    const n = Number(mes);
    if (!Number.isInteger(n) || n < 1 || n > 12) return { ok: false, mensaje: `"mes" debe ser 1-12.` };
    if (!anio) return { ok: false, mensaje: 'Se requiere "anio" cuando se especifica "mes".' };
  }
  return { ok: true, anio, mes, tipo };
}

// ══════════════════════════════════════════════════════════
// ── Helpers PDF — Reportes generales ─────────────────────
// ══════════════════════════════════════════════════════════

function pdfHeader(doc, titulo, subtitulo) {
  doc.rect(0, 0, doc.page.width, 80).fill(COLOR.brand);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
     .text('MAYZER', 50, 18, { continued: true })
     .fontSize(11).font('Helvetica')
     .text('  ·  Sistema de Gestión SENA Palmira', { baseline: 'middle' });
  doc.fontSize(11).font('Helvetica-Bold').text(titulo, 50, 45);
  doc.fontSize(9).font('Helvetica').text(subtitulo, 50, 60);
  doc.fillColor(COLOR.dark);
  doc.y = 100;
}

function pdfSectionTitle(doc, texto) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, doc.page.width - 100, 22).fill(COLOR.brand);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold').text(texto, 58, doc.y - 16);
  doc.fillColor(COLOR.dark);
  doc.y += 8;
}

/**
 * Calcula la altura necesaria para una fila de tabla según el texto más largo.
 */
function _calcRowH(cols, widths, fontSize) {
  const PAD_V   = 8;
  const LINE_H  = fontSize * 1.4;
  let maxLineas = 1;
  cols.forEach((col, i) => {
    const text       = String(col ?? '—');
    const colW       = Math.max(1, widths[i] - 8);
    const charsPerLn = Math.max(1, Math.floor(colW / (fontSize * 0.62)));
    const parrafos   = text.split('\n');
    let lineas = 0;
    for (const p of parrafos) lineas += Math.max(1, Math.ceil(p.length / charsPerLn));
    if (lineas > maxLineas) maxLineas = lineas;
  });
  return Math.max(18, Math.ceil(maxLineas * LINE_H) + PAD_V);
}

function pdfTableRow(doc, cols, widths, isHeader = false, yPos = null) {
  const y          = yPos !== null ? yPos : doc.y;
  const x0         = 50;
  const fontSize   = isHeader ? 8.5 : 8;
  const rowH       = isHeader ? 20 : _calcRowH(cols, widths, fontSize);
  const totalAncho = widths.reduce((a, b) => a + b, 0);

  if (isHeader) {
    doc.rect(x0, y, totalAncho, rowH).fill('#f0f0f0');
  } else if (doc._rowIndex % 2 === 0) {
    doc.rect(x0, y, totalAncho, rowH).fill('#fafafa');
  }

  let x = x0;
  cols.forEach((col, i) => {
    doc.rect(x, y, widths[i], rowH).stroke(COLOR.border);
    doc.fillColor(isHeader ? COLOR.dark : COLOR.gray)
       .fontSize(fontSize)
       .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
       .text(String(col ?? '—'), x + 4, y + 4, {
         width:     widths[i] - 8,
         lineBreak: !isHeader,
         ellipsis:  isHeader,
       });
    x += widths[i];
  });

  doc._rowIndex = (doc._rowIndex || 0) + 1;
  doc.y = y + rowH;
}

function pdfCheckPageBreak(doc, nextRowCols, nextRowWidths) {
  const estimado = nextRowCols ? _calcRowH(nextRowCols, nextRowWidths, 8) : 20;
  if (doc.y + estimado > doc.page.height - 80) {
    doc.addPage();
    doc.y = 60;
    doc._rowIndex = 0;
  }
}

/**
 * Dibuja un grid horizontal de tarjetas de estadísticas.
 * Hasta 4 por fila; si hay menos de 4, las distribuye igualmente.
 * Avanza doc.y tras el bloque completo.
 */
function pdfStatGrid(doc, stats) {
  const pageW    = doc.page.width;
  const margen   = 50;
  const gutter   = 10;
  const itemsPerRow = Math.min(stats.length, 4);
  const totalGutters = (itemsPerRow - 1) * gutter;
  const cardW    = Math.floor((pageW - margen * 2 - totalGutters) / itemsPerRow);
  const cardH    = 54;
  const y0       = doc.y;

  // Filas completas
  for (let rowStart = 0; rowStart < stats.length; rowStart += itemsPerRow) {
    const fila  = stats.slice(rowStart, rowStart + itemsPerRow);
    const cols  = fila.length;
    const rowGutters = (cols - 1) * gutter;
    const rowCardW   = Math.floor((pageW - margen * 2 - rowGutters) / cols);
    const y     = doc.y;

    fila.forEach((item, idx) => {
      const x = margen + idx * (rowCardW + gutter);
      doc.rect(x, y, rowCardW, cardH).fill(COLOR.light).stroke(COLOR.border);
      doc.fillColor(COLOR.brand).fontSize(20).font('Helvetica-Bold')
         .text(String(item.valor ?? 0), x + 6, y + 7, { width: rowCardW - 12, align: 'center', lineBreak: false });
      doc.fillColor(COLOR.lightGray).fontSize(7.5).font('Helvetica')
         .text(item.label, x + 4, y + 35, { width: rowCardW - 8, align: 'center', lineBreak: false });
    });

    doc.y = y + cardH + 8;
  }
}

function pdfFooter(doc, anio, mes) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    doc.fillColor('#aaa').fontSize(8).font('Helvetica')
       .text(
         `Mayzer – SENA Sede Palmira · Período: ${etiquetaPeriodo(anio, mes)} · Pág. ${i + 1} / ${pages.count}`,
         50, doc.page.height - 35,
         { align: 'center', width: doc.page.width - 100 }
       );
  }
}

// ══════════════════════════════════════════════════════════
// ── Motor de layout para PDF de expediente individual ────
// ══════════════════════════════════════════════════════════
//
// Principios:
//   1. cursor.y es la única fuente de verdad para posición vertical.
//   2. Cada función recibe cursor por referencia y lo avanza tras dibujar.
//   3. Auto-height real: se mide el texto ANTES de dibujar para calcular
//      la altura correcta del contenedor.
//   4. Nunca se usa ellipsis en campos con texto largo; se permite wrap.
//   5. Los saltos de página ocurren ANTES de dibujar, nunca después.
//
// ──────────────────────────────────────────────────────────

const PDF_MARGEN      = 50;
const PDF_HEADER_H    = 90;
const PDF_FOOTER_H    = 50;
const PDF_SECCION_H   = 24;
const PDF_FILA_LABEL  = 11;   // altura de la etiqueta pequeña
const PDF_FILA_PAD    = 8;    // padding vertical dentro de cada fila
const PDF_LINE_H      = 13;   // altura aproximada por línea de texto (font 9)
const PDF_MIN_FILA_H  = PDF_FILA_LABEL + PDF_LINE_H + PDF_FILA_PAD; // ~32

/**
 * Calcula cuántas líneas ocupará el texto dado el ancho disponible.
 * Usa una estimación conservadora de caracteres por línea.
 */
function _estimarLineas(text, anchoDisponible, fontSize = 9) {
  if (!text || text.length === 0) return 1;
  // Aproximación: ~6.2 chars por punto a fontSize=9 con Helvetica
  const charsPerLine = Math.max(1, Math.floor(anchoDisponible / (fontSize * 0.62)));
  // Contar saltos de línea explícitos también
  const parrafos = String(text).split('\n');
  let totalLineas = 0;
  for (const p of parrafos) {
    totalLineas += Math.max(1, Math.ceil(p.length / charsPerLine));
  }
  return Math.max(1, totalLineas);
}

/**
 * Comprueba si queda espacio para `necesario` puntos; si no, añade página.
 */
function _checkPage(doc, cursor, necesario) {
  if (cursor.y + necesario > doc.page.height - PDF_FOOTER_H) {
    doc.addPage();
    cursor.y = PDF_MARGEN;
  }
}

/**
 * Dibuja la barra de sección naranja con título.
 */
function _seccion(doc, cursor, titulo) {
  _checkPage(doc, cursor, PDF_SECCION_H + PDF_MIN_FILA_H);
  const W = doc.page.width;
  cursor.y += 10;
  doc.rect(PDF_MARGEN, cursor.y, W - PDF_MARGEN * 2, PDF_SECCION_H).fill(COLOR.brand);
  doc.fillColor(COLOR.white)
     .fontSize(9).font('Helvetica-Bold')
     .text(titulo, PDF_MARGEN + 8, cursor.y + 7, {
       width: W - PDF_MARGEN * 2 - 16,
       lineBreak: false,
     });
  cursor.y += PDF_SECCION_H + 6;
  doc.fillColor(COLOR.dark);
}

/**
 * Dibuja dos campos lado a lado con altura DINÁMICA.
 * Cada campo puede contener texto largo; la fila crece al alto del más alto.
 */
function _fila2(doc, cursor, etq1, val1, etq2, val2) {
  const W    = doc.page.width;
  const colW = (W - PDF_MARGEN * 2) / 2 - 8;
  const x1   = PDF_MARGEN;
  const x2   = PDF_MARGEN + colW + 16;

  const text1 = String(val1 ?? '—');
  const text2 = etq2 !== undefined ? String(val2 ?? '—') : '';

  const lineas1 = _estimarLineas(text1, colW);
  const lineas2 = etq2 !== undefined ? _estimarLineas(text2, colW) : 0;
  const maxLineas = Math.max(lineas1, lineas2, 1);

  const filaH = PDF_FILA_LABEL + (maxLineas * PDF_LINE_H) + PDF_FILA_PAD;
  _checkPage(doc, cursor, filaH);

  const y = cursor.y;

  // Fondo sutil
  doc.rect(x1, y, W - PDF_MARGEN * 2, filaH).fill('#fafafa');

  // Col 1
  doc.fillColor(COLOR.lightGray).fontSize(7).font('Helvetica')
     .text(String(etq1).toUpperCase(), x1, y + 3, { width: colW, lineBreak: false });
  doc.fillColor(COLOR.dark).fontSize(9).font('Helvetica-Bold')
     .text(text1, x1, y + PDF_FILA_LABEL, { width: colW });

  // Col 2
  if (etq2 !== undefined) {
    doc.fillColor(COLOR.lightGray).fontSize(7).font('Helvetica')
       .text(String(etq2).toUpperCase(), x2, y + 3, { width: colW, lineBreak: false });
    doc.fillColor(COLOR.dark).fontSize(9).font('Helvetica-Bold')
       .text(text2, x2, y + PDF_FILA_LABEL, { width: colW });
  }

  cursor.y = y + filaH + 3;
  doc.fillColor(COLOR.dark);
}

/**
 * Dibuja un campo de ancho completo con texto multi-línea y auto-height real.
 */
function _filaTodo(doc, cursor, etiqueta, valor) {
  const W    = doc.page.width;
  const colW = W - PDF_MARGEN * 2;
  const text = String(valor ?? '—');

  const lineas     = _estimarLineas(text, colW);
  const filaH      = PDF_FILA_LABEL + (lineas * PDF_LINE_H) + PDF_FILA_PAD + 4;
  _checkPage(doc, cursor, filaH);

  const y = cursor.y;

  doc.rect(PDF_MARGEN, y, colW, filaH).fill('#fafafa');

  doc.fillColor(COLOR.lightGray).fontSize(7).font('Helvetica')
     .text(String(etiqueta).toUpperCase(), PDF_MARGEN, y + 3, { width: colW, lineBreak: false });
  doc.fillColor(COLOR.dark).fontSize(9).font('Helvetica')
     .text(text, PDF_MARGEN, y + PDF_FILA_LABEL, { width: colW });

  // Usar doc.y real tras el render multi-línea para mayor exactitud
  cursor.y = Math.max(doc.y, y + filaH) + 3;
  doc.fillColor(COLOR.dark);
}

/**
 * Dibuja alerta de rechazo con fondo rojo claro y auto-height real.
 */
function _alertaRechazo(doc, cursor, motivo) {
  const W    = doc.page.width;
  const colW = W - PDF_MARGEN * 2;
  const text = String(motivo);

  const lineas = _estimarLineas(text, colW - 16);
  const alto   = 10 + 14 + (lineas * PDF_LINE_H) + 10; // label + texto + padding
  _checkPage(doc, cursor, alto + 8);

  cursor.y += 8;
  const y = cursor.y;

  doc.rect(PDF_MARGEN, y, colW, alto).fill('#FEF2F2').stroke('#FECACA');
  doc.fillColor(COLOR.red).fontSize(8).font('Helvetica-Bold')
     .text('MOTIVO DE RECHAZO:', PDF_MARGEN + 8, y + 7, { width: colW - 16, lineBreak: false });
  doc.fillColor(COLOR.dark).fontSize(9).font('Helvetica')
     .text(text, PDF_MARGEN + 8, y + 21, { width: colW - 16 });

  cursor.y = Math.max(doc.y, y + alto) + 8;
  doc.fillColor(COLOR.dark);
}

// ──────────────────────────────────────────────────────────

async function generarPdfAspirante(asp, extra) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data',  c  => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width;
    const cursor = { y: 0 };

    // ── Encabezado ────────────────────────────────────────
    doc.rect(0, 0, W, PDF_HEADER_H).fill(COLOR.brand);

    doc.fillColor(COLOR.white).fontSize(26).font('Helvetica-Bold')
       .text('MAYZER', PDF_MARGEN, 16, { lineBreak: false });
    doc.fontSize(8.5).font('Helvetica')
       .text('Sistema de Gestión de Certificaciones · Trabajo Seguro en Alturas',
             PDF_MARGEN, 48, { lineBreak: false });
    doc.text('SENA – Centro de Biotecnología Industrial · Sede Palmira',
             PDF_MARGEN, 62, { lineBreak: false });

    doc.rect(W - 148, 18, 98, 30).fill(COLOR.brandDark);
    doc.fillColor(COLOR.white).fontSize(9).font('Helvetica-Bold')
       .text('EXPEDIENTE', W - 148, 25, { width: 98, align: 'center', lineBreak: false });
    doc.fontSize(7).font('Helvetica')
       .text('ASPIRANTE', W - 148, 37, { width: 98, align: 'center', lineBreak: false });

    cursor.y = PDF_HEADER_H + 12;

    // ── Bloque nombre + estado ────────────────────────────
    // Calcular altura dinámica según longitud del nombre
    const nombreText  = asp.nombre_completo || '—';
    const docText     = `${asp.tipo_documento || ''} ${asp.numero_documento || ''}`.trim() || '—';
    const badgeW      = 100;
    const badgeX      = W - PDF_MARGEN - badgeW - 8;
    const nombreW     = badgeX - PDF_MARGEN - 18;
    const linNombre   = _estimarLineas(nombreText, nombreW, 15);
    const NOMBRE_H    = Math.max(52, linNombre * 18 + 24);

    doc.rect(PDF_MARGEN, cursor.y, W - PDF_MARGEN * 2, NOMBRE_H)
       .fill(COLOR.light).stroke(COLOR.border);

    const estadoColor = {
      PENDIENTE:    COLOR.blue,
      PRE_APROBADO: COLOR.brand,
      ASIGNADO:     COLOR.green,
      RECHAZADO:    COLOR.red,
    }[asp.estado_nombre] || COLOR.gray;

    doc.rect(badgeX, cursor.y + 14, badgeW, 22).fill(estadoColor);
    doc.fillColor(COLOR.white).fontSize(8).font('Helvetica-Bold')
       .text(asp.estado_nombre || '—', badgeX, cursor.y + 20,
             { width: badgeW, align: 'center', lineBreak: false });

    doc.fillColor(COLOR.dark).fontSize(15).font('Helvetica-Bold')
       .text(nombreText, PDF_MARGEN + 10, cursor.y + 9,
             { width: nombreW });

    doc.fillColor(COLOR.gray).fontSize(9).font('Helvetica')
       .text(docText, PDF_MARGEN + 10, cursor.y + 9 + linNombre * 18 + 2,
             { width: nombreW, lineBreak: false });

    cursor.y += NOMBRE_H + 10;

    // ── Sección: Datos Personales ─────────────────────────
    _seccion(doc, cursor, 'DATOS PERSONALES');
    _fila2(doc, cursor,
      'Fecha de nacimiento',
      asp.fecha_nacimiento ? new Date(asp.fecha_nacimiento).toLocaleDateString('es-CO') : '—',
      'Correo electrónico', asp.email || '—'
    );
    _fila2(doc, cursor,
      'Teléfono', asp.telefono || '—',
      'Fecha de registro',
      new Date(asp.created_at).toLocaleDateString('es-CO', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    );

    if (asp.motivo_rechazo) {
      _alertaRechazo(doc, cursor, asp.motivo_rechazo);
    }

    // ── Sección: Empresa y Formación ──────────────────────
    _seccion(doc, cursor, 'EMPRESA Y FORMACIÓN');
    _fila2(doc, cursor, 'Empresa', asp.empresa || '—', 'NIT', asp.nit || '—');
    _fila2(doc, cursor,
      'Tipo de entidad', asp.tipo_entidad || '—',
      'Correo empresa',  asp.email_empresa || '—'
    );
    _fila2(doc, cursor,
      'Curso solicitado', asp.curso_nombre || '—',
      'Grupo asignado',   asp.grupo_nombre || 'Sin asignar'
    );

    // ── Sección: Información Médica ───────────────────────
    const { medico, contacto, laboral } = extra;
    if (medico) {
      _seccion(doc, cursor, 'INFORMACIÓN MÉDICA');
      _fila2(doc, cursor,
        'EPS', medico.eps || '—',
        'ARL', medico.arl || '—'
      );
      _fila2(doc, cursor,
        'Tipo de sangre', medico.tipo_sangre || '—',
        'Altura (cm)',    medico.altura_cm    || '—'
      );
      if (medico.antecedentes) {
        _filaTodo(doc, cursor, 'Antecedentes médicos', medico.antecedentes);
      }
      if (medico.medicamentos) {
        _filaTodo(doc, cursor, 'Medicamentos actuales', medico.medicamentos);
      }
    }

    // ── Sección: Contacto de emergencia ───────────────────
    if (contacto) {
      _seccion(doc, cursor, 'CONTACTO DE EMERGENCIA');
      _fila2(doc, cursor,
        'Nombre',     contacto.nombre     || '—',
        'Parentesco', contacto.parentesco || '—'
      );
      _fila2(doc, cursor, 'Teléfono', contacto.telefono || '—');
    }

    // ── Sección: Información Laboral ──────────────────────
    if (laboral) {
      _seccion(doc, cursor, 'INFORMACIÓN LABORAL');
      _fila2(doc, cursor,
        'Cargo',           laboral.cargo           || '—',
        'Empresa laboral', laboral.empresa_nombre  || '—'
      );
      _fila2(doc, cursor, 'Tiempo en el cargo', laboral.tiempo_cargo || '—');
    }

    // ── Footer en todas las páginas ───────────────────────
    const pages = doc.bufferedPageRange();
    const ahora = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      const pH = doc.page.height;
      doc.rect(PDF_MARGEN, pH - 42, W - PDF_MARGEN * 2, 1).fill(COLOR.border);
      doc.fillColor('#aaa').fontSize(7.5).font('Helvetica')
         .text(
           `Mayzer · SENA Palmira · Expediente generado el ${ahora} · Pág. ${i + 1} / ${pages.count}`,
           PDF_MARGEN, pH - 34,
           { align: 'center', width: W - PDF_MARGEN * 2, lineBreak: false }
         );
    }

    doc.end();
  });
}

// ══════════════════════════════════════════════════════════
// ── Helpers Excel ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════

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
  const reporte = [{ v: `Reporte de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}  ·  Período: ${etiquetaPeriodo(anio, mes)}`, t: 's', s: {
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
  XLSX.utils.book_append_sheet(wb, ws, tipo.charAt(0).toUpperCase() + tipo.slice(1));
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
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════
// ── Excel mensual completo para ZIP ──────────────────────
// ══════════════════════════════════════════════════════════

async function construirExcelMensual(aspirantes, estadosRes, cursosRes, empresasRes, anio, mes) {
  const wb  = XLSX.utils.book_new();
  const ahora = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const periodo = `${MESES[mes]} ${anio}`;

  // ── Hoja 1: Lista de aspirantes ──────────────────────────
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

  // ── Hoja 2: Estadísticas ──────────────────────────────────
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

// ══════════════════════════════════════════════════════════
// ── Normalizar nombre de carpeta/archivo ──────────────────
// ══════════════════════════════════════════════════════════

function nombreSeguro(str) {
  return (str || 'Sin_Nombre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60);
}

// ══════════════════════════════════════════════════════════
// ── CONTROLADORES HTTP ────────────────────────────────────
// ══════════════════════════════════════════════════════════

// ── GET /api/reportes/resumen ─────────────────────────────
async function resumen(req, res) {
  const { anio, mes } = req.query;
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');

  try {
    const [[sol]]  = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(s.estado_id=1) AS pendientes, SUM(s.estado_id=2) AS en_revision,
              SUM(s.estado_id=3) AS aprobadas, SUM(s.estado_id=4) AS rechazadas
       FROM solicitud s WHERE s.deleted_at IS NULL ${fSol.filtro}`,
      fSol.params
    );
    const [[asp]]  = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(a.estado_id=1) AS pendientes, SUM(a.estado_id=2) AS pre_aprobados,
              SUM(a.estado_id=3) AS asignados, SUM(a.estado_id=4) AS rechazados
       FROM aspirante a WHERE 1=1 ${fAsp.filtro}`,
      fAsp.params
    );
    const [[grp]]  = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(g.estado_id=1) AS programados,
              SUM(g.estado_id=2) AS en_curso, SUM(g.estado_id=3) AS finalizados
       FROM grupo g WHERE g.deleted_at IS NULL ${fGrp.filtro}`,
      fGrp.params
    );
    const [cursos] = await pool.execute(
      `SELECT c.nombre AS curso_requerido, COUNT(a.id) AS total
       FROM aspirante a
       JOIN solicitud s ON a.solicitud_id = s.id
       JOIN curso     c ON s.curso_id     = c.id
       WHERE 1=1 ${fAsp.filtro}
       GROUP BY c.id ORDER BY total DESC LIMIT 5`,
      fAsp.params
    );
    const [empresas] = await pool.execute(
      `SELECT e.nombre, e.nit, COUNT(a.id) AS aspirantes
       FROM empresa    e
       JOIN solicitud  s ON s.empresa_id    = e.id
       JOIN aspirante  a ON a.solicitud_id  = s.id
       WHERE 1=1 ${fAsp.filtro}
       GROUP BY e.id ORDER BY aspirantes DESC LIMIT 8`,
      fAsp.params
    );

    res.json({
      solicitudes: sol, aspirantes: asp, grupos: grp,
      cursosPopulares: cursos, empresasTop: empresas,
      periodo: { anio: anio || 'Todos', mes: mes || 'Todos' },
    });
  } catch (e) {
    console.error('[reporte.resumen]', e.message);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
}

// ── GET /api/reportes/exportar/excel ─────────────────────
async function exportarExcel(req, res) {
  const val = validarParamsExport(req.query);
  if (!val.ok) return res.status(400).json({ error: val.mensaje });
  const { anio, mes, tipo } = val;

  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const consultasPorTipo = {
    aspirantes:  () => ReporteData.consultarAspirantes(fAsp.filtro, fAsp.params),
    solicitudes: () => ReporteData.consultarSolicitudes(fSol.filtro, fSol.params),
    grupos:      () => ReporteData.consultarGrupos(fGrp.filtro, fGrp.params),
  };

  try {
    const filas  = await consultasPorTipo[tipo]();
    const config = obtenerConfigExcel(tipo, filas);
    const wb     = construirLibroExcel(config.encabezados, config.datos, config.anchos, tipo, anio, mes);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false });
    const periodo = anio ? (mes ? `${String(mes).padStart(2, '0')}-${anio}` : anio) : 'completo';
    const nombre  = `Mayzer_${tipo}_${periodo}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (e) {
    console.error(`[reporte.exportarExcel tipo=${tipo}]`, e.message);
    res.status(500).json({ error: 'Error al exportar Excel.' });
  }
}

// ── GET /api/reportes/exportar/pdf ───────────────────────
async function exportarPDF(req, res) {
  const val = validarParamsExport(req.query);
  if (!val.ok) return res.status(400).json({ error: val.mensaje });
  const { anio, mes, tipo } = val;

  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const periodo = etiquetaPeriodo(anio, mes);

  try {
    const doc    = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const nombre = `Mayzer_${tipo}_${anio || 'general'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    doc.pipe(res);
    doc._rowIndex = 0;

    if (tipo === 'aspirantes') {
      const [filas, stats] = await Promise.all([
        ReporteData.consultarAspirantes(fAsp.filtro, fAsp.params),
        ReporteData.consultarEstadisticasAspirantes(fAsp.filtro, fAsp.params),
      ]);
      pdfHeader(doc, 'Reporte de Aspirantes', `Período: ${periodo} · ${filas.length} registros`);
      pdfStatGrid(doc, [
        { label: 'Total',         valor: stats.total          },
        { label: 'Pendientes',    valor: stats.pendientes     },
        { label: 'Pre-aprobados', valor: stats.pre_aprobados  },
        { label: 'Asignados',     valor: stats.asignados      },
      ]);
      doc.y += 8;
      pdfSectionTitle(doc, 'Listado de Aspirantes');
      const cols   = ['Nombre Completo', 'Doc.', 'Estado', 'Empresa', 'Curso', 'Fecha', 'Grupo'];
      const widths = [120, 40, 65, 90, 80, 55, 45];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        const rowCols = [r.nombre_completo, r.tipo_documento, r.estado,
                         r.empresa, r.curso, r.fecha_solicitud, r.grupo_asignado || '—'];
        pdfCheckPageBreak(doc, rowCols, widths);
        pdfTableRow(doc, rowCols, widths);
      }
    } else if (tipo === 'solicitudes') {
      const [filas, stats] = await Promise.all([
        ReporteData.consultarSolicitudes(fSol.filtro, fSol.params),
        ReporteData.consultarEstadisticasSolicitudes(fSol.filtro, fSol.params),
      ]);
      pdfHeader(doc, 'Reporte de Solicitudes', `Período: ${periodo} · ${filas.length} registros`);
      pdfStatGrid(doc, [
        { label: 'Total',      valor: stats.total      },
        { label: 'Pendientes', valor: stats.pendientes },
        { label: 'Aprobadas',  valor: stats.aprobadas  },
        { label: 'Rechazadas', valor: stats.rechazadas },
      ]);
      doc.y += 8;
      pdfSectionTitle(doc, 'Listado de Solicitudes');
      const cols   = ['Empresa', 'NIT', 'Curso Solicitado', 'Estado', 'Fecha', 'Aspirantes'];
      const widths = [120, 70, 130, 70, 60, 45];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        const rowCols = [r.empresa, r.nit, r.curso, r.estado, r.fecha, Number(r.aspirantes)];
        pdfCheckPageBreak(doc, rowCols, widths);
        pdfTableRow(doc, rowCols, widths);
      }
    } else if (tipo === 'grupos') {
      const [filas, stats] = await Promise.all([
        ReporteData.consultarGrupos(fGrp.filtro, fGrp.params),
        ReporteData.consultarEstadisticasGrupos(fGrp.filtro, fGrp.params),
      ]);
      pdfHeader(doc, 'Reporte de Grupos de Formación', `Período: ${periodo} · ${filas.length} grupos`);
      pdfStatGrid(doc, [
        { label: 'Total',       valor: stats.total       },
        { label: 'Programados', valor: stats.programados },
        { label: 'En Curso',    valor: stats.en_curso    },
        { label: 'Finalizados', valor: stats.finalizados },
      ]);
      doc.y += 8;
      pdfSectionTitle(doc, 'Listado de Grupos');
      const cols   = ['Grupo', 'Curso', 'Instructor', 'Estado', 'Cupo', 'Inscritos', 'Inicio', 'Fin'];
      const widths = [90, 90, 95, 60, 35, 45, 55, 55];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        const rowCols = [r.grupo, r.curso, r.instructor, r.estado,
                         r.cupo_maximo, Number(r.inscritos), r.inicio, r.fin];
        pdfCheckPageBreak(doc, rowCols, widths);
        pdfTableRow(doc, rowCols, widths);
      }
    }

    pdfFooter(doc, anio, mes);
    doc.end();
  } catch (e) {
    console.error(`[reporte.exportarPDF tipo=${tipo}]`, e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar PDF.' });
  }
}

// ── GET /api/reportes/aspirantes/:id/pdf ─────────────────
async function exportarPdfAspirante(req, res) {
  const { id } = req.params;
  try {
    const aspirantes = await ReporteData.consultarAspirantesDetalle(
      'AND a.id = ?',
      [id]
    );
    if (!aspirantes.length) {
      return res.status(404).json({ error: 'Aspirante no encontrado.' });
    }
    const asp    = aspirantes[0];
    const extra  = await ReporteData.consultarDatosComplementariosAspirante(asp.id);
    const buffer = await generarPdfAspirante(asp, extra);
    const nombre = `Expediente_${nombreSeguro(asp.nombre_completo)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  } catch (e) {
    console.error('[reporte.exportarPdfAspirante]', e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar PDF del aspirante.' });
  }
}

// ── GET /api/reportes/exportar/zip?anio=YYYY ─────────────
async function exportarZipAnual(req, res) {
  const { anio, mes } = req.query;

  if (!anio) {
    return res.status(400).json({ error: 'Se requiere el parámetro "anio".' });
  }
  const anioNum = Number(anio);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return res.status(400).json({ error: `Parámetro "anio" inválido: ${anio}` });
  }
  const mesNum = mes ? Number(mes) : null;
  if (mesNum !== null && (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12)) {
    return res.status(400).json({ error: `Parámetro "mes" inválido: ${mes}` });
  }

  try {
    let mesesAProcesar;
    if (mesNum) {
      mesesAProcesar = [mesNum];
    } else {
      mesesAProcesar = await ReporteData.consultarMesesConDatos(anioNum);
    }

    if (!mesesAProcesar.length) {
      return res.status(404).json({ error: 'No hay aspirantes registrados para el periodo seleccionado.' });
    }

    const periodoLabel = mesNum ? `${MESES[mesNum]}_${anioNum}` : String(anioNum);
    const nombreZip    = `Mayzer_Reporte_${periodoLabel}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreZip}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('[reporte.exportarZipAnual] archiver error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });

    const readmeContent = [
      `MAYZER — Reporte ${mesNum ? `${MESES[mesNum]} ${anioNum}` : `Año ${anioNum}`}`,
      `SENA – Centro de Biotecnología Industrial · Palmira, Valle del Cauca`,
      ``,
      `Generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
      ``,
      `ESTRUCTURA DEL ARCHIVO`,
      `═══════════════════════════════════════`,
      `${anioNum}/`,
      `  Mes_XX_Nombre/`,
      `    Aspirantes_Mes.xlsx      → Lista completa + estadísticas del mes`,
      `    Nombre_Apellido_ID/`,
      `      Expediente_Nombre.pdf  → Expediente profesional del aspirante`,
      `      Documento_Original.pdf → Documento adjunto al momento del registro`,
      ``,
      `MESES INCLUIDOS: ${mesesAProcesar.map(m => MESES[m]).join(', ')}`,
    ].join('\n');

    archive.append(readmeContent, { name: `${anioNum}/README.txt` });

    for (const mNum of mesesAProcesar) {
      const fMes = construirFiltroPeriodo(anioNum, mNum, 'a.created_at');

      const aspirantes = await ReporteData.consultarAspirantesDetalle(fMes.filtro, fMes.params);
      if (!aspirantes.length) continue;

      const [estadosRes, cursosRes, empresasRes] = await Promise.all([
        ReporteData.consultarResumenEstados(fMes.filtro, fMes.params),
        ReporteData.consultarResumenCursos(fMes.filtro, fMes.params),
        ReporteData.consultarResumenEmpresas(fMes.filtro, fMes.params),
      ]);

      const mesPad     = String(mNum).padStart(2, '0');
      const mesNombre  = MESES[mNum];
      const carpetaMes = `${anioNum}/Mes_${mesPad}_${mesNombre}`;

      const wb      = await construirExcelMensual(aspirantes, estadosRes, cursosRes, empresasRes, anioNum, mNum);
      const bufXlsx = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false });
      archive.append(bufXlsx, { name: `${carpetaMes}/Aspirantes_${mesNombre}_${anioNum}.xlsx` });

      for (const asp of aspirantes) {
        const extra      = await ReporteData.consultarDatosComplementariosAspirante(asp.id);
        const nombreAsp  = nombreSeguro(asp.nombre_completo);
        const carpetaAsp = `${carpetaMes}/${nombreAsp}_${asp.id}`;

        try {
          const bufPdf = await generarPdfAspirante(asp, extra);
          archive.append(bufPdf, { name: `${carpetaAsp}/Expediente_${nombreAsp}.pdf` });
        } catch (pdfErr) {
          console.error(`[ZIP] Error generando PDF aspirante ${asp.id}:`, pdfErr.message);
          archive.append(`Error al generar expediente: ${pdfErr.message}`, {
            name: `${carpetaAsp}/ERROR_expediente.txt`,
          });
        }

        if (asp.documento_pdf) {
          const rutaDoc = path.join(UPLOADS_DIR, asp.documento_pdf);
          if (fs.existsSync(rutaDoc)) {
            archive.file(rutaDoc, { name: `${carpetaAsp}/Documento_Original.pdf` });
          }
        }
      }
    }

    await archive.finalize();
    console.log(`[reporte.exportarZipAnual] ZIP ${periodoLabel} generado OK`);

  } catch (e) {
    console.error('[reporte.exportarZipAnual]', e.message, e.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar el ZIP. Revisa los logs del servidor.' });
    }
  }
}

module.exports = { resumen, exportarExcel, exportarPDF, exportarPdfAspirante, exportarZipAnual };
