/**
 * routes/evento.routes.js
 * Responsabilidad : Endpoints de eventos y clases del calendario.
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/eventos
 * Depende de      : controllers/evento.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/evento.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',       ctrl.listar);
router.post('/',      soloAdmin, ctrl.crear);
router.put('/:id',    soloAdmin, ctrl.actualizar);
router.delete('/:id', soloAdmin, ctrl.eliminar);

module.exports = router;
