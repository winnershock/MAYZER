/**
 * routes/reporte.routes.js
 * Responsabilidad : Endpoints de reportes y exportaciones (PDF, Excel, ZIP).
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/reportes
 * Depende de      : controllers/reporte.controller.js, middleware/auth.middleware.js
 */

const express = require('express');
const { autenticar } = require('../middleware/auth.middleware');
const reporteCtrl = require('../controllers/reporte.controller');

const router = express.Router();
router.use(autenticar);

router.get('/resumen',              reporteCtrl.resumen);
router.get('/exportar/excel',       reporteCtrl.exportarExcel);
router.get('/exportar/pdf',         reporteCtrl.exportarPDF);
router.get('/exportar/zip',         reporteCtrl.exportarZipAnual);
router.get('/aspirantes/:id/pdf',   reporteCtrl.exportarPdfAspirante);

module.exports = router;
