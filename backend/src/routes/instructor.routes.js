const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/instructor.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',                   ctrl.listar);
router.post('/',    soloAdmin,    ctrl.crear);
router.get('/:id/historial', soloAdmin, ctrl.historial);
router.put('/:id',  soloAdmin,    ctrl.editar);
router.delete('/:id', soloAdmin,  ctrl.desactivar);

module.exports = router;
