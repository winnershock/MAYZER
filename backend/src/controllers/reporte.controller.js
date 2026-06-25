
const XLSX     = require('xlsx-js-style');
const archiver = require('archiver');

const { construirFiltroPeriodo }              = require('../utils/db.utils');
const { etiquetaPeriodo, NOMBRES_MES: MESES } = require('../utils/formato.utils');
const { validarParamsExport, validarParamsZip } = require('../utils/reporte.validacion');
const ReporteData = require('../services/reporte.service');
const { pool, CAT } = require('../config/db');

const {
  crearDocumentoPDF,
  pdfHeader,
  pdfSectionTitle,
  pdfTableRow,
  pdfCheckPageBreak,
  pdfStatGrid,
  pdfFooter,
  generarPdfAspirante,
} = require('../services/reporte.pdf.service');

const {
  construirLibroExcel,
  obtenerConfigExcel,
} = require('../services/reporte.excel.service');

const {
  nombreSeguro,
  generarReadmeZip,
  procesarMesParaZip,
  procesarGruposParaZip,
  generarReadmeZipInstructor,
} = require('../services/reporte.zip.service');

async function resumen(req, res) {
  const { anio, mes } = req.query;
  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');

  try {
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
      aspirantes: asp, grupos: grp,
      cursosPopulares: cursos, empresasTop: empresas,
      periodo: { anio: anio || 'Todos', mes: mes || 'Todos' },
    });
  } catch (e) {
    console.error('[reporte.resumen]', e.message);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
}

async function exportarExcel(req, res) {
  const val = validarParamsExport(req.query);
  if (!val.ok) return res.status(400).json({ error: val.mensaje });
  const { anio, mes, tipo } = val;

  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const consultasPorTipo = {
    aspirantes:         () => ReporteData.consultarAspirantes(fAsp.filtro, fAsp.params),
    solicitudes:        () => ReporteData.consultarSolicitudes(fSol.filtro, fSol.params),
    grupos:             () => ReporteData.consultarGrupos(fGrp.filtro, fGrp.params),
    empresas:           () => ReporteData.consultarEmpresasDetalle(fSol.filtro, fSol.params),
    aspirantes_empresa: () => ReporteData.consultarAspirantesEmpresaDetalle(fAsp.filtro, fAsp.params),
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

async function exportarPDF(req, res) {
  const val = validarParamsExport(req.query);
  if (!val.ok) return res.status(400).json({ error: val.mensaje });
  const { anio, mes, tipo } = val;

  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const periodo = etiquetaPeriodo(anio, mes);

  try {
    const doc    = crearDocumentoPDF();
    const nombre = `Mayzer_${tipo}_${anio || 'general'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    doc.pipe(res);

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

async function exportarZipAnual(req, res) {
  const val = validarParamsZip(req.query);
  if (!val.ok) return res.status(400).json({ error: val.mensaje });
  const { anioNum, mesNum } = val;

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

    archive.append(generarReadmeZip(anioNum, mesNum, mesesAProcesar), {
      name: `${anioNum}/README.txt`,
    });

    // Excel consolidados del periodo completo, en la raíz del ZIP (no por mes).
    const fSolPeriodo = construirFiltroPeriodo(anioNum, mesNum, 's.created_at');
    const fAspPeriodo = construirFiltroPeriodo(anioNum, mesNum, 'a.created_at');

    const [filasEmpresas, filasAspEmpresa] = await Promise.all([
      ReporteData.consultarEmpresasDetalle(fSolPeriodo.filtro, fSolPeriodo.params),
      ReporteData.consultarAspirantesEmpresaDetalle(fAspPeriodo.filtro, fAspPeriodo.params),
    ]);

    if (filasEmpresas.length) {
      const cfgEmp = obtenerConfigExcel('empresas', filasEmpresas);
      const wbEmp  = construirLibroExcel(cfgEmp.encabezados, cfgEmp.datos, cfgEmp.anchos, 'empresas', anioNum, mesNum);
      archive.append(XLSX.write(wbEmp, { type: 'buffer', bookType: 'xlsx', bookSST: false }), {
        name: `${anioNum}/Excel_Empresas_${periodoLabel}.xlsx`,
      });
    }

    if (filasAspEmpresa.length) {
      const cfgAE = obtenerConfigExcel('aspirantes_empresa', filasAspEmpresa);
      const wbAE  = construirLibroExcel(cfgAE.encabezados, cfgAE.datos, cfgAE.anchos, 'aspirantes_empresa', anioNum, mesNum);
      archive.append(XLSX.write(wbAE, { type: 'buffer', bookType: 'xlsx', bookSST: false }), {
        name: `${anioNum}/Excel_Aspirantes_Empresa_${periodoLabel}.xlsx`,
      });
    }

    for (const mNum of mesesAProcesar) {
      await procesarMesParaZip(archive, anioNum, mNum);
    }

    await archive.finalize();
    console.info(`[reporte] ZIP ${periodoLabel} generado OK`);

  } catch (e) {
    console.error('[reporte.exportarZipAnual]', e.message, e.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar el ZIP. Revisa los logs del servidor.' });
    }
  }
}

async function exportarZipMisGrupos(req, res) {
  const val = validarParamsZip(req.query);
  if (!val.ok) return res.status(400).json({ error: val.mensaje });
  const { anioNum, mesNum } = val;

  if (req.usuario.rol_id !== CAT.rol.INSTRUCTOR) {
    return res.status(403).json({ error: 'Este endpoint es exclusivo para instructores. Usa /exportar/zip si eres administradora.' });
  }
  if (!req.usuario.instructor_id) {
    return res.status(403).json({ error: 'Tu usuario no tiene un perfil de instructor asociado.' });
  }

  try {
    const fGrp = construirFiltroPeriodo(anioNum, mesNum, 'g.fecha_inicio');
    const [grupos] = await pool.execute(
      `SELECT g.id FROM grupo g
       WHERE g.deleted_at IS NULL AND g.instructor_id = ? ${fGrp.filtro}`,
      [req.usuario.instructor_id, ...fGrp.params]
    );

    if (!grupos.length) {
      return res.status(404).json({ error: 'No tienes grupos asignados en el periodo seleccionado.' });
    }

    const gruposIds   = grupos.map(g => g.id);
    const periodoLabel = mesNum ? `${MESES[mesNum]}_${anioNum}` : String(anioNum);
    const nombreZip    = `Mayzer_MisGrupos_${periodoLabel}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreZip}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('[reporte.exportarZipMisGrupos] archiver error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });

    const totalAspirantes = await procesarGruposParaZip(archive, anioNum, mesNum, gruposIds);

    archive.append(generarReadmeZipInstructor(anioNum, mesNum, totalAspirantes, gruposIds.length), {
      name: 'README.txt',
    });

    await archive.finalize();
    console.info(`[reporte] ZIP de grupos del instructor ${req.usuario.id} (${periodoLabel}) generado OK`);
  } catch (e) {
    console.error('[reporte.exportarZipMisGrupos]', e.message, e.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar el ZIP de tus grupos. Revisa los logs del servidor.' });
    }
  }
}

async function exportarZipGrupo(req, res) {
  const { grupo_id } = req.query;
  if (!grupo_id || !Number.isInteger(Number(grupo_id))) {
    return res.status(400).json({ error: 'Parámetro "grupo_id" requerido y debe ser numérico.' });
  }

  try {
    const [[grupo]] = await pool.execute(
      `SELECT g.id, g.nombre, g.instructor_id, g.fecha_inicio,
              MONTH(g.fecha_inicio) AS mes, YEAR(g.fecha_inicio) AS anio
       FROM grupo g WHERE g.id = ? AND g.deleted_at IS NULL`,
      [Number(grupo_id)]
    );
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado.' });

    const esAdmin = req.usuario.rol_id === CAT.rol.ADMIN;
    if (!esAdmin && grupo.instructor_id !== req.usuario.instructor_id) {
      return res.status(403).json({ error: 'No tienes permiso para descargar el reporte de este grupo.' });
    }

    const nombreZip = `Mayzer_${nombreSeguro(grupo.nombre)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreZip}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    archive.on('error', (err) => {
      console.error('[reporte.exportarZipGrupo] archiver error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });

    const totalAspirantes = await procesarGruposParaZip(archive, grupo.anio, grupo.mes, [grupo.id]);

    archive.append(generarReadmeZipInstructor(grupo.anio, grupo.mes, totalAspirantes, 1), {
      name: 'README.txt',
    });

    await archive.finalize();
    console.info(`[reporte] ZIP del grupo ${grupo.id} generado OK (usuario ${req.usuario.id})`);
  } catch (e) {
    console.error('[reporte.exportarZipGrupo]', e.message, e.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar el ZIP del grupo.' });
    }
  }
}

module.exports = {
  resumen, exportarExcel, exportarPDF, exportarPdfAspirante,
  exportarZipAnual, exportarZipMisGrupos, exportarZipGrupo,
};
