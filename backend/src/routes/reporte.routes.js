
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const reporteCtrl = require('../controllers/reporte.controller');

const router = express.Router();

// Exclusivo para instructores: ZIP con expedientes solo de SUS grupos.
// Va antes del router.use(soloAdmin) porque no debe exigir rol Admin.
router.get('/exportar/zip-mis-grupos', autenticar, reporteCtrl.exportarZipMisGrupos);

// ZIP de un solo grupo (botón en la tabla de Grupos). Accesible a cualquier
// autenticado; el controlador valida que el instructor solo descargue su propio grupo.
router.get('/exportar/zip-grupo',       autenticar, reporteCtrl.exportarZipGrupo);

router.use(autenticar, soloAdmin);

router.get('/resumen',              reporteCtrl.resumen);
router.get('/exportar/excel',       reporteCtrl.exportarExcel);
router.get('/exportar/pdf',         reporteCtrl.exportarPDF);
router.get('/exportar/zip',         reporteCtrl.exportarZipAnual);
router.get('/aspirantes/:id/pdf',   reporteCtrl.exportarPdfAspirante);

module.exports = router;
