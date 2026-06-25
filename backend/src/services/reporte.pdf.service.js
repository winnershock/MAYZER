const PDFDocument = require('pdfkit');
const { etiquetaPeriodo } = require('../utils/formato.utils');

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

function crearDocumentoPDF(opciones = {}) {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true, ...opciones });
  doc._rowIndex = 0;
  return doc;
}

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

function pdfStatGrid(doc, stats) {
  const pageW    = doc.page.width;
  const margen   = 50;
  const gutter   = 10;
  const itemsPerRow = Math.min(stats.length, 4);

  for (let rowStart = 0; rowStart < stats.length; rowStart += itemsPerRow) {
    const fila  = stats.slice(rowStart, rowStart + itemsPerRow);
    const cols  = fila.length;
    const rowGutters = (cols - 1) * gutter;
    const rowCardW   = Math.floor((pageW - margen * 2 - rowGutters) / cols);
    const cardH = 54;
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

const PDF_MARGEN      = 50;
const PDF_HEADER_H    = 90;
const PDF_FOOTER_H    = 50;
const PDF_SECCION_H   = 24;
const PDF_FILA_LABEL  = 11;
const PDF_FILA_PAD    = 8;
const PDF_LINE_H      = 13;
const PDF_MIN_FILA_H  = PDF_FILA_LABEL + PDF_LINE_H + PDF_FILA_PAD;

function _estimarLineas(text, anchoDisponible, fontSize = 9) {
  if (!text || text.length === 0) return 1;
  const charsPerLine = Math.max(1, Math.floor(anchoDisponible / (fontSize * 0.62)));
  const parrafos = String(text).split('\n');
  let totalLineas = 0;
  for (const p of parrafos) {
    totalLineas += Math.max(1, Math.ceil(p.length / charsPerLine));
  }
  return Math.max(1, totalLineas);
}

function _checkPage(doc, cursor, necesario) {
  if (cursor.y + necesario > doc.page.height - PDF_FOOTER_H) {
    doc.addPage();
    cursor.y = PDF_MARGEN;
  }
}

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

  doc.rect(x1, y, W - PDF_MARGEN * 2, filaH).fill('#fafafa');

  doc.fillColor(COLOR.lightGray).fontSize(7).font('Helvetica')
     .text(String(etq1).toUpperCase(), x1, y + 3, { width: colW, lineBreak: false });
  doc.fillColor(COLOR.dark).fontSize(9).font('Helvetica-Bold')
     .text(text1, x1, y + PDF_FILA_LABEL, { width: colW });

  if (etq2 !== undefined) {
    doc.fillColor(COLOR.lightGray).fontSize(7).font('Helvetica')
       .text(String(etq2).toUpperCase(), x2, y + 3, { width: colW, lineBreak: false });
    doc.fillColor(COLOR.dark).fontSize(9).font('Helvetica-Bold')
       .text(text2, x2, y + PDF_FILA_LABEL, { width: colW });
  }

  cursor.y = y + filaH + 3;
  doc.fillColor(COLOR.dark);
}

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

  cursor.y = Math.max(doc.y, y + filaH) + 3;
  doc.fillColor(COLOR.dark);
}

function _alertaRechazo(doc, cursor, motivo) {
  const W    = doc.page.width;
  const colW = W - PDF_MARGEN * 2;
  const text = String(motivo);

  const lineas = _estimarLineas(text, colW - 16);
  const alto   = 10 + 14 + (lineas * PDF_LINE_H) + 10;
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

async function generarPdfAspirante(asp, extra) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data',  c  => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W      = doc.page.width;
    const cursor = { y: 0 };

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

    if (contacto) {
      _seccion(doc, cursor, 'CONTACTO DE EMERGENCIA');
      _fila2(doc, cursor,
        'Nombre',     contacto.nombre     || '—',
        'Parentesco', contacto.parentesco || '—'
      );
      _fila2(doc, cursor, 'Teléfono', contacto.telefono || '—');
    }

    if (laboral) {
      _seccion(doc, cursor, 'INFORMACIÓN LABORAL');
      _fila2(doc, cursor,
        'Cargo',           laboral.cargo           || '—',
        'Empresa laboral', laboral.empresa_nombre  || '—'
      );
      _fila2(doc, cursor, 'Tiempo en el cargo', laboral.tiempo_cargo || '—');
    }

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

module.exports = {
  COLOR,
  crearDocumentoPDF,
  pdfHeader,
  pdfSectionTitle,
  pdfTableRow,
  pdfCheckPageBreak,
  pdfStatGrid,
  pdfFooter,
  generarPdfAspirante,
};
