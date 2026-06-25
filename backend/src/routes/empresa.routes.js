const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/empresa.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',        soloAdmin, ctrl.listar);
router.get('/lugares', ctrl.listarLugares);
router.get('/ciudades', ctrl.listarCiudades);

module.exports = router;
