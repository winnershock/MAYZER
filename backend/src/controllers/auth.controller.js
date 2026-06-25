const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, CAT }          = require('../config/db');
const { registrarAuditoria } = require('../middleware/audit.middleware');
const { handleError }        = require('../utils/response.utils');

async function login(req, res) {
  const { nombre_usuario, contrasena } = req.body;
  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const [filas] = await pool.execute(
      `SELECT u.*, r.nombre AS rol_nombre
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       WHERE u.nombre_usuario = ? AND u.activo = 1`,
      [nombre_usuario.trim()]
    );
    if (!filas.length) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = filas[0];

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    await pool.execute(
      'UPDATE usuario SET ultimo_login = NOW() WHERE id = ?',
      [usuario.id]
    );

    await pool.execute(
      'DELETE FROM refresh_tokens WHERE usuario_id = ? AND (revocado = 1 OR expira_en <= NOW())',
      [usuario.id]
    );

    let instructor_id = null;
    if (usuario.rol_id === CAT.rol.INSTRUCTOR) {
      const [[ins]] = await pool.execute(
        'SELECT id FROM instructor WHERE usuario_id = ? AND deleted_at IS NULL',
        [usuario.id]
      );
      instructor_id = ins?.id ?? null;
    }

    const accessToken = jwt.sign(
      { id: usuario.id, rol_id: usuario.rol_id, activo: true, instructor_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshTokenPlano = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash  = crypto.createHash('sha256').update(refreshTokenPlano).digest('hex');
    const tokenExpira       = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    await pool.execute(
      'INSERT INTO refresh_tokens (usuario_id, token_hash, expira_en, ip_origen, user_agent) VALUES (?,?,?,?,?)',
      [
        usuario.id,
        refreshTokenHash,
        tokenExpira,
        req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        req.headers['user-agent']?.substring(0, 500),
      ]
    );

    await registrarAuditoria({
      tabla: 'usuario', operacion: 'LOGIN',
      registroId: usuario.id, usuarioId: usuario.id, req,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshTokenPlano, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/api/auth',
    });

    res.json({
      accessToken,
      usuario: {
        id:            usuario.id,
        nombre:        usuario.nombre_completo,
        rol:           usuario.rol_nombre,
        rol_id:        usuario.rol_id,
        instructor_id,
      },
    });
  } catch (e) {
    handleError(res, e, 'auth.login', 'Error interno del servidor');
  }
}

async function refreshToken(req, res) {
  const tokenRecibido = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!tokenRecibido) return res.status(400).json({ error: 'Token requerido' });

  try {
    const tokenHash = crypto.createHash('sha256').update(tokenRecibido).digest('hex');
    const [filas] = await pool.execute(
      `SELECT rt.*, u.id AS uid, u.rol_id, u.nombre_completo, u.activo
       FROM refresh_tokens rt
       JOIN usuario u ON rt.usuario_id = u.id
       WHERE rt.token_hash = ? AND rt.revocado = 0 AND rt.expira_en > NOW()`,
      [tokenHash]
    );

    if (!filas.length || !filas[0].activo) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const registro = filas[0];

    let instructor_id = null;
    if (registro.rol_id === CAT.rol.INSTRUCTOR) {
      const [[ins]] = await pool.execute(
        'SELECT id FROM instructor WHERE usuario_id = ? AND deleted_at IS NULL',
        [registro.uid]
      );
      instructor_id = ins?.id ?? null;
    }

    const accessToken = jwt.sign(
      { id: registro.uid, rol_id: registro.rol_id, activo: true, instructor_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
}

async function logout(req, res) {
  const tokenRecibido = req.cookies?.refreshToken || req.body?.refreshToken;
  res.clearCookie('refreshToken', { path: '/api/auth' });
  if (tokenRecibido) {
    const tokenHash = crypto.createHash('sha256').update(tokenRecibido).digest('hex');
    await pool.execute('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [tokenHash]);
  }
  await registrarAuditoria({
    tabla: 'usuario', operacion: 'LOGOUT',
    usuarioId: req.usuario?.id, req,
  });
  res.json({ mensaje: 'Sesión cerrada' });
}

module.exports = { login, refreshToken, logout };
