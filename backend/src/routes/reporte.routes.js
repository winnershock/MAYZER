/**
 * Archivo: routes/reporte.routes.js  v1.0.0
 * Responsabilidad: Rutas HTTP para reportes y exportaciones.
 * Conecta con: middleware/auth.middleware.js, controllers/reporte.controller.js
 *
 * Rutas disponibles:
 *   GET /resumen                    → KPIs y estadísticas del dashboard
 *   GET /exportar/excel             → Excel filtrado por tipo/año/mes
 *   GET /exportar/pdf               → PDF filtrado por tipo/año/mes
 *   GET /exportar/zip               → ZIP anual estructurado (incluido en v1.0)
 *   GET /aspirantes/:id/pdf         → PDF de expediente individual
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
