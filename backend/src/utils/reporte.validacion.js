const ReporteData = require('../services/reporte.service');

function validarParamsExport(query) {
  const { anio, mes, tipo = 'aspirantes' } = query;

  if (!ReporteData.esTipoValido(tipo)) {
    return { ok: false, mensaje: `Tipo "${tipo}" no reconocido. Válidos: aspirantes, solicitudes, grupos, empresas.` };
  }

  if (anio !== undefined) {
    const n = Number(anio);
    if (!Number.isInteger(n) || n < 2000 || n > 2100) {
      return { ok: false, mensaje: `Parámetro "anio" inválido: ${anio}` };
    }
  }

  if (mes !== undefined) {
    const n = Number(mes);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      return { ok: false, mensaje: '"mes" debe ser 1-12.' };
    }
    if (!anio) {
      return { ok: false, mensaje: 'Se requiere "anio" cuando se especifica "mes".' };
    }
  }

  return { ok: true, anio, mes, tipo };
}

function validarParamsZip(query) {
  const { anio, mes } = query;

  if (!anio) {
    return { ok: false, mensaje: 'Se requiere el parámetro "anio".' };
  }
  const anioNum = Number(anio);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return { ok: false, mensaje: `Parámetro "anio" inválido: ${anio}` };
  }

  const mesNum = mes ? Number(mes) : null;
  if (mesNum !== null && (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12)) {
    return { ok: false, mensaje: `Parámetro "mes" inválido: ${mes}` };
  }

  return { ok: true, anioNum, mesNum };
}

module.exports = { validarParamsExport, validarParamsZip };
