/**
 * controllers/auth.controller.js
 * Responsabilidad : Autenticación de usuarios — login, logout y refresh de tokens JWT.
 * Exporta         : login, refreshToken, logout
 * Usado en        : routes/auth.routes.js
 * Depende de      : config/db.js (pool), middleware/audit.middleware.js, utils/response.utils.js
 */
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, CAT }          = require('../config/db');
const { registrarAuditoria } = require('../middleware/audit.middleware');
const { handleError }        = require('../utils/response.utils');

/**
 * Calcula el tiempo de bloqueo según intentos fallidos:
 *   1-2 intentos → sin bloqueo
 *   3 intentos   → 30 segundos
 *   4 intentos   → 1 minuto
 *   5+  intentos → 10 minutos
 */
function calcularBloqueo(intentos) {
  if (intentos <= 2) return null;
  if (intentos === 3) return new Date(Date.now() + 30 * 1000);
  if (intentos === 4) return new Date(Date.now() + 1 * 60 * 1000);
  return new Date(Date.now() + 10 * 60 * 1000);
}

function mensajeBloqueo(bloqueadoHasta) {
  const segundos = Math.ceil((bloqueadoHasta - Date.now()) / 1000);
  if (segundos < 60) return `Cuenta bloqueada. Intenta en ${segundos} segundos.`;
  const minutos = Math.ceil(segundos / 60);
  return `Cuenta bloqueada. Intenta en ${minutos} minuto${minutos !== 1 ? 's' : ''}.`;
}

// ── POST /api/auth/login ──────────────────────────────────
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

    // Bloqueo activo → rechazar sin revelar si la contraseña es correcta
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      return res.status(403).json({ error: mensajeBloqueo(new Date(usuario.bloqueado_hasta)) });
    }

    // Bloqueo expirado → resetear contador para que el ciclo empiece limpio
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) <= new Date()) {
      await pool.execute(
        'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
        [usuario.id]
      );
      usuario.intentos_fallidos = 0;
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      const intentos       = usuario.intentos_fallidos + 1;
      const bloqueadoHasta = calcularBloqueo(intentos);
      await pool.execute(
        'UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
        [intentos, bloqueadoHasta, usuario.id]
      );
      return res.status(401).json({
        error: bloqueadoHasta
          ? mensajeBloqueo(bloqueadoHasta)
          : `Contraseña incorrecta. Verifica tus datos.`,
      });
    }

    await pool.execute(
      'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = NOW() WHERE id = ?',
      [usuario.id]
    );

    // Limpieza de tokens obsoletos del usuario: revocados o ya expirados.
    // Se ejecuta en el login para evitar crecimiento indefinido de la tabla
    // sin necesidad de un proceso externo (cron). El impacto es mínimo porque
    // cada usuario suele tener pocos tokens activos.
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE usuario_id = ? AND (revocado = 1 OR expira_en <= NOW())',
      [usuario.id]
    );

    // ── Optimizado: incluir rol_id y activo en el payload para que
    //    auth.middleware pueda omitir la query a BD en cada request.
    const accessToken = jwt.sign(
      { id: usuario.id, rol_id: usuario.rol_id, activo: true },
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

    // Si es instructor, incluir su instructor_id para que el frontend pueda
    // solicitar al backend solo los grupos/eventos que le corresponden.
    let instructor_id = null;
    if (usuario.rol_id === CAT.rol.INSTRUCTOR) {
      const [[ins]] = await pool.execute(
        'SELECT id FROM instructor WHERE usuario_id = ? AND deleted_at IS NULL',
        [usuario.id]
      );
      instructor_id = ins?.id ?? null;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshTokenPlano, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 días
      path:     '/api/auth',
    });

    res.json({
      accessToken,
      usuario: {
        id:            usuario.id,
        nombre:        usuario.nombre_completo,
        rol:           usuario.rol_nombre,
        rol_id:        usuario.rol_id,
        instructor_id, // null para admin/superusuario
      },
    });
  } catch (e) {
    handleError(res, e, 'auth.login', 'Error interno del servidor');
  }
}

// ── POST /api/auth/refresh ────────────────────────────────
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

    const registro    = filas[0];
    const accessToken = jwt.sign(
      { id: registro.uid, rol_id: registro.rol_id, activo: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/auth/logout ─────────────────────────────────
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
