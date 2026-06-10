/**
 * Archivo: routes/curso.routes.js
 * Responsabilidad: Definir endpoints HTTP para el catálogo de cursos.
 * Conecta con: controllers/curso.controller.js, middleware/auth.middleware.js
 * Nota: DELETE desactiva el curso (soft), no lo borra físicamente.
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/curso.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',               ctrl.listar);
router.post('/',              soloAdmin, ctrl.crear);
router.put('/:id',            soloAdmin, ctrl.actualizar);
router.delete('/:id',         soloAdmin, ctrl.desactivar);
router.patch('/:id/activar',  soloAdmin, ctrl.activar);

module.exports = router;
