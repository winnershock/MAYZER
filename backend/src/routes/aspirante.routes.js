const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aspirante.controller');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');

router.use(autenticar, soloAdmin);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.verUno);
router.patch('/:id/pre-aprobar',   ctrl.preAprobar);
router.patch('/:id/rechazar',      ctrl.rechazar);
router.patch('/:id/asignar',       ctrl.asignarAGrupo);
router.patch('/:id/desasignar',    ctrl.desasignarDeGrupo);
router.patch('/:id/restablecer',   ctrl.restablecer);

module.exports = router;
