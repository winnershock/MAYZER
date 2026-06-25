const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/correo.controller');

const router = express.Router();
router.use(autenticar, soloAdmin);

router.post('/enviar',   ctrl.enviar);
router.get('/historial', ctrl.historial);

module.exports = router;
