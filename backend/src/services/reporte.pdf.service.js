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

module.exports = {
  COLOR,
  crearDocumentoPDF,
  pdfHeader,
  pdfSectionTitle,
  pdfTableRow,
  pdfCheckPageBreak,
  pdfStatGrid,
  pdfFooter,
};
