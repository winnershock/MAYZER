/**
 * routes/usuario-admin.routes.js
 * Responsabilidad : Endpoints exclusivos del SuperUsuario para cuentas de administrador.
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/admin-usuarios
 * Depende de      : controllers/adminUsuario.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloSuperUsuario } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/adminUsuario.controller');

const router = express.Router();
router.use(autenticar, soloSuperUsuario);

router.get('/',                   ctrl.listar);
router.patch('/:id/activar',      ctrl.activar);
router.patch('/:id/desactivar',   ctrl.desactivar);

module.exports = router;
