/**
 * routes/auth.routes.js
 * Responsabilidad : Endpoints de sesión (login, logout, refresh).
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/auth
 * Depende de      : controllers/auth.controller.js, middleware/auth.middleware.js
 */
// auth.routes.js
const express = require('express');
const router = express.Router();
const { login, refreshToken, logout, estadoBloqueo } = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/estado-bloqueo', estadoBloqueo);
router.post('/refresh', refreshToken);
router.post('/logout', autenticar, logout);

module.exports = router;
