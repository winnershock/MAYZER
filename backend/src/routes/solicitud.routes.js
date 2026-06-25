const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/solicitud.controller');

const router = express.Router();
router.use(autenticar, soloAdmin);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.verUno);

module.exports = router;
