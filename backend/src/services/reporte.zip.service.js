const path     = require('path');
const fs       = require('fs');
const XLSX     = require('xlsx-js-style');

const { construirFiltroPeriodo }   = require('../utils/db.utils');
const { NOMBRES_MES: MESES }       = require('../utils/formato.utils');
const ReporteData                  = require('./reporte.service');
const { construirExcelMensual }    = require('./reporte.excel.service');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/documentos');

function cederEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function nombreSeguro(str) {
  return (str || 'Sin_Nombre')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60);
}

function generarReadmeZip(anioNum, mesNum, mesesAProcesar) {
  return [
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
    `      Documento_Original.pdf → Documento adjunto al momento del registro`,
    ``,
    `MESES INCLUIDOS: ${mesesAProcesar.map(m => MESES[m]).join(', ')}`,
  ].join('\n');
}

async function procesarMesParaZip(archive, anioNum, mNum) {
  const fMes = construirFiltroPeriodo(anioNum, mNum, 'a.created_at');

  const aspirantes = await ReporteData.consultarAspirantesDetalle(fMes.filtro, fMes.params);
  if (!aspirantes.length) return;

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
    const nombreAsp  = nombreSeguro(asp.nombre_completo);
    const carpetaAsp = `${carpetaMes}/${nombreAsp}_${asp.id}`;

    if (asp.documento_pdf) {
      const rutaDoc = path.join(UPLOADS_DIR, asp.documento_pdf);
      if (fs.existsSync(rutaDoc)) {
        archive.file(rutaDoc, { name: `${carpetaAsp}/Documento_Original.pdf` });
      }
    }

    await cederEventLoop();
  }
}

async function procesarGruposParaZip(archive, anioNum, mesNum, gruposIds) {
  if (!gruposIds.length) return 0;

  // El scoping real es "pertenece a uno de estos grupos" (vía inscripción).
  // No se filtra además por a.created_at: el aspirante puede haberse
  // registrado en un mes distinto al de inicio del grupo, y aun así debe
  // incluirse en el ZIP de ese grupo. anio/mes solo se usan para nombrar
  // carpetas/archivos del paquete.
  const placeholders = gruposIds.map(() => '?').join(', ');
  const filtro = `AND i.grupo_id IN (${placeholders})`;
  const params = [...gruposIds];

  const aspirantes = await ReporteData.consultarAspirantesDetalle(filtro, params);
  if (!aspirantes.length) return 0;

  const periodoLabel = mesNum ? `Mes_${String(mesNum).padStart(2, '0')}_${MESES[mesNum]}_${anioNum}` : String(anioNum);
  const carpetaBase  = `Mis_Grupos_${periodoLabel}`;

  // Agrupar por grupo para organizar el ZIP por carpeta de grupo.
  const porGrupo = new Map();
  for (const asp of aspirantes) {
    const clave = asp.grupo_nombre || 'Sin_Grupo';
    if (!porGrupo.has(clave)) porGrupo.set(clave, []);
    porGrupo.get(clave).push(asp);
  }

  for (const [nombreGrupo, lista] of porGrupo) {
    const carpetaGrupo = `${carpetaBase}/${nombreSeguro(nombreGrupo)}`;

    const [estadosRes, cursosRes] = await Promise.all([
      Promise.resolve(resumenPorClave(lista, 'estado_nombre')),
      Promise.resolve(resumenPorClave(lista, 'curso_nombre')),
    ]);
    const empresasRes = resumenEmpresas(lista);

    const wb      = await construirExcelMensual(lista, estadosRes, cursosRes, empresasRes, anioNum, mesNum || lista[0]?.mes_num);
    const bufXlsx = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false });
    archive.append(bufXlsx, { name: `${carpetaGrupo}/Aspirantes_${nombreSeguro(nombreGrupo)}.xlsx` });

    for (const asp of lista) {
      const nombreAsp  = nombreSeguro(asp.nombre_completo);
      const carpetaAsp = `${carpetaGrupo}/${nombreAsp}_${asp.id}`;

      if (asp.documento_pdf) {
        const rutaDoc = path.join(UPLOADS_DIR, asp.documento_pdf);
        if (fs.existsSync(rutaDoc)) {
          archive.file(rutaDoc, { name: `${carpetaAsp}/Documento_Original.pdf` });
        }
      }

      await cederEventLoop();
    }
  }

  return aspirantes.length;
}

function resumenPorClave(lista, clave) {
  const conteo = new Map();
  for (const item of lista) {
    const k = item[clave] || '—';
    conteo.set(k, (conteo.get(k) || 0) + 1);
  }
  const campoLabel = clave === 'estado_nombre' ? 'estado' : 'curso';
  return [...conteo.entries()].map(([k, total]) => ({ [campoLabel]: k, total }));
}

function resumenEmpresas(lista) {
  const conteo = new Map();
  for (const item of lista) {
    const key = item.empresa || '—';
    if (!conteo.has(key)) conteo.set(key, { empresa: key, nit: item.nit || '—', aspirantes: 0 });
    conteo.get(key).aspirantes++;
  }
  return [...conteo.values()];
}

function generarReadmeZipInstructor(anioNum, mesNum, totalAspirantes, totalGrupos) {
  return [
    `MAYZER — Reporte de mis grupos ${mesNum ? `${MESES[mesNum]} ${anioNum}` : `Año ${anioNum}`}`,
    `SENA – Centro de Biotecnología Industrial · Palmira, Valle del Cauca`,
    ``,
    `Generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
    ``,
    `Este reporte incluye únicamente los grupos asignados al instructor que lo generó.`,
    ``,
    `RESUMEN`,
    `═══════════════════════════════════════`,
    `Grupos incluidos: ${totalGrupos}`,
    `Aspirantes incluidos: ${totalAspirantes}`,
  ].join('\n');
}

module.exports = {
  nombreSeguro,
  generarReadmeZip,
  procesarMesParaZip,
  procesarGruposParaZip,
  generarReadmeZipInstructor,
};
