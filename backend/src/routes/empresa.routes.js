/**
 * routes/empresa.routes.js
 * Responsabilidad : Endpoints de empresas y lugares/sedes.
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/empresas
 * Depende de      : controllers/empresa.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/empresa.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',       ctrl.listar);
router.get('/lugares', ctrl.listarLugares);

module.exports = router;
