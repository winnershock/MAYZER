const express = require('express');
const router = express.Router();
const { login, refreshToken, logout } = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', autenticar, logout);

module.exports = router;
