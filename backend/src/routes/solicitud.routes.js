/**
 * routes/solicitud.routes.js
 * Responsabilidad : Endpoints de solicitudes de formación.
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/solicitudes
 * Depende de      : controllers/solicitud.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/solicitud.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',                 ctrl.listar);
router.get('/:id',              ctrl.verUno);
router.patch('/:id/estado', soloAdmin, ctrl.actualizarEstado);

module.exports = router;
