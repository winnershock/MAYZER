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
 * Sistema de bloqueo progresivo por nivel de penalización:
 *   Nivel 0 → sin bloqueo (hasta 2 intentos fallidos)
 *   Nivel 1 → 30 segundos  (al llegar a 3 intentos)
 *   Nivel 2 → 1 minuto     (siguiente ciclo)
 *   Nivel 3 → 5 minutos
 *   Nivel 4 → 10 minutos
 *   Nivel 5+ → 24 horas (reinicia todo al expirar)
 *
 * Cada ciclo: 3 intentos fallidos activan bloqueo del nivel actual,
 * el nivel sube, y al expirar el bloqueo el contador vuelve a 0.
 */
const TIEMPOS_BLOQUEO_MS = [
  30 * 1000,          // nivel 1: 30 segundos
  1  * 60 * 1000,     // nivel 2: 1 minuto
  5  * 60 * 1000,     // nivel 3: 5 minutos
  10 * 60 * 1000,     // nivel 4: 10 minutos
  24 * 60 * 60 * 1000,// nivel 5+: 24 horas
];
const INTENTOS_POR_CICLO = 3;
const NIVEL_MAXIMO       = TIEMPOS_BLOQUEO_MS.length; // 5

function calcularBloqueo(nivel) {
  if (nivel < 1) return null;
  const idx = Math.min(nivel - 1, TIEMPOS_BLOQUEO_MS.length - 1);
  return new Date(Date.now() + TIEMPOS_BLOQUEO_MS[idx]);
}

function mensajeBloqueo(bloqueadoHasta) {
  const ms = new Date(bloqueadoHasta) - Date.now();
  const totalSegundos = Math.ceil(ms / 1000);
  if (totalSegundos < 60) return `Demasiados intentos. Intenta en ${totalSegundos} segundo${totalSegundos !== 1 ? 's' : ''}.`;
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  if (minutos < 60) {
    return segundos > 0
      ? `Demasiados intentos. Intenta en ${minutos} min ${segundos} seg.`
      : `Demasiados intentos. Intenta en ${minutos} minuto${minutos !== 1 ? 's' : ''}.`;
  }
  const horas = Math.ceil(totalSegundos / 3600);
  return `Cuenta bloqueada por ${horas} hora${horas !== 1 ? 's' : ''}. Intenta más tarde.`;
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

    const ahora = new Date();

    // Bloqueo activo → rechazar, devolver tiempo restante para el frontend
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora) {
      return res.status(403).json({
        error:          mensajeBloqueo(usuario.bloqueado_hasta),
        bloqueadoHasta: usuario.bloqueado_hasta,
      });
    }

    // Bloqueo expirado → resetear contador e intentos del ciclo
    // Si era nivel máximo (24h), también resetear el nivel de penalización
    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) <= ahora) {
      const nivelActual   = usuario.nivel_bloqueo || 0;
      const esNivelMaximo = nivelActual >= NIVEL_MAXIMO;
      await pool.execute(
        'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL, nivel_bloqueo = ? WHERE id = ?',
        [esNivelMaximo ? 0 : nivelActual, usuario.id]
      );
      usuario.intentos_fallidos = 0;
      usuario.nivel_bloqueo     = esNivelMaximo ? 0 : nivelActual;
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      const intentosCiclo = usuario.intentos_fallidos + 1;
      let bloqueadoHasta  = null;
      let nuevoNivel      = usuario.nivel_bloqueo || 0;

      if (intentosCiclo >= INTENTOS_POR_CICLO) {
        // Alcanzó el límite del ciclo → bloquear y subir nivel
        nuevoNivel    = Math.min(nuevoNivel + 1, NIVEL_MAXIMO);
        bloqueadoHasta = calcularBloqueo(nuevoNivel);
      }

      await pool.execute(
        'UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = ?, nivel_bloqueo = ? WHERE id = ?',
        [intentosCiclo, bloqueadoHasta, nuevoNivel, usuario.id]
      );

      const intentosRestantes = INTENTOS_POR_CICLO - intentosCiclo;
      return res.status(401).json({
        error: bloqueadoHasta
          ? mensajeBloqueo(bloqueadoHasta)
          : `Contraseña incorrecta. ${intentosRestantes} intento${intentosRestantes !== 1 ? 's' : ''} antes del bloqueo.`,
        bloqueadoHasta: bloqueadoHasta || null,
        intentosRestantes: bloqueadoHasta ? 0 : intentosRestantes,
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
