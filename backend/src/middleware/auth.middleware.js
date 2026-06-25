const jwt = require('jsonwebtoken');
const { pool, CAT } = require('../config/db');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No has iniciado sesión' });
    }
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);

    if (payload.id && payload.rol_id && payload.activo === true) {
      // Tokens emitidos antes de este fix no traen instructor_id: se recupera
      // de BD para no romper sesiones activas ni dejar el campo en `undefined`
      // (mysql2 rechaza `undefined` como parámetro de un query preparado).
      let instructorId = payload.instructor_id ?? null;
      if (instructorId === null && payload.rol_id === CAT.rol.INSTRUCTOR) {
        const [[ins]] = await pool.execute(
          'SELECT id FROM instructor WHERE usuario_id = ? AND deleted_at IS NULL',
          [payload.id]
        );
        instructorId = ins?.id ?? null;
      }
      req.usuario = { id: payload.id, rol_id: payload.rol_id, activo: true, instructor_id: instructorId };
      return next();
    }

    const [rows] = await pool.execute(
      'SELECT id, nombre_completo, rol_id, activo FROM usuario WHERE id = ?',
      [payload.id]
    );
    if (!rows.length || !rows[0].activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no existe' });
    }
    let instructorId = null;
    if (rows[0].rol_id === CAT.rol.INSTRUCTOR) {
      const [[ins]] = await pool.execute(
        'SELECT id FROM instructor WHERE usuario_id = ? AND deleted_at IS NULL',
        [rows[0].id]
      );
      instructorId = ins?.id ?? null;
    }
    req.usuario = { ...rows[0], instructor_id: instructorId };
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
