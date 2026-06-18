/**
 * middleware/auth.middleware.js
 * Responsabilidad : Autenticación JWT y control de acceso por rol.
 * Exporta         : autenticar, soloAdmin, soloSuperUsuario
 * Usado en        : Todos los routers protegidos.
 * Depende de      : config/db.js (pool, CAT)
 */
const jwt = require('jsonwebtoken');
const { pool, CAT } = require('../config/db');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No has iniciado sesión' });
    }
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);

    // ── Optimizado: si el JWT ya contiene id + rol_id + activo, no hace falta
    //    consultar la BD en cada request (ahorramos 1 query por llamada API).
    //    El accessToken caduca en 15 min; si el usuario se desactiva, la próxima
    //    renovación de token fallará correctamente en refreshToken (que sí valida activo).
    if (payload.id && payload.rol_id && payload.activo === true) {
      req.usuario = { id: payload.id, rol_id: payload.rol_id, activo: true };
      return next();
    }

    // Fallback: token sin payload completo (tokens emitidos antes de la optimización)
    const [rows] = await pool.execute(
      'SELECT id, nombre_completo, rol_id, activo FROM usuario WHERE id = ?',
      [payload.id]
    );
    if (!rows.length || !rows[0].activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no existe' });
    }
    req.usuario = rows[0];
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario?.rol_id !== CAT.rol.ADMIN) {
    return res.status(403).json({ error: 'Solo la administradora puede realizar esta acción' });
  }
  next();
}

function soloSuperUsuario(req, res, next) {
  if (req.usuario?.rol_id !== CAT.rol.SUPERUSUARIO) {
    return res.status(403).json({ error: 'Solo el Super Usuario puede realizar esta acción' });
  }
  next();
}

module.exports = { autenticar, soloAdmin, soloSuperUsuario };
