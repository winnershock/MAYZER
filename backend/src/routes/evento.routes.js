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
