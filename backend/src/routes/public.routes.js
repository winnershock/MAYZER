/**
 * routes/public.routes.js
 * Responsabilidad : Endpoints públicos sin autenticación para el formulario externo.
 * Exporta         : router Express
 * Usado en        : routes/index.js  →  /api/public
 * Depende de      : controllers/public.controller.js, utils/upload.utils.js
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { upload } = require('../utils/upload.utils');
const ctrl = require('../controllers/public.controller');

const router = express.Router();

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes desde esta IP. Intenta en 1 hora.' },
});

router.get('/cursos',    ctrl.listarCursos);
router.get('/ciudades',  ctrl.listarCiudades);
router.post('/solicitud', formLimiter, upload.any(), ctrl.crearSolicitud);

module.exports = router;
