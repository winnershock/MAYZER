const { pool, CAT }            = require('../config/db');
const { notFoundSi, handleError } = require('../utils/response.utils');

async function listar(req, res) {
  try {
    const [filas] = await pool.execute(
      `SELECT u.id, u.nombre_completo, u.nombre_usuario, u.email,
              u.activo, u.ultimo_login, u.created_at,
              r.nombre AS rol
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       WHERE u.rol_id = ?
       ORDER BY u.nombre_completo`,
      [CAT.rol.ADMIN]
    );
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listar adminUsuarios', 'Error al cargar administradores');
  }
}

async function verificarEsAdmin(res, id) {
  const [filas] = await pool.execute('SELECT id, rol_id FROM usuario WHERE id = ?', [id]);
  if (notFoundSi(res, filas, 'Usuario no encontrado')) return null;
  if (filas[0].rol_id !== CAT.rol.ADMIN) {
    res.status(403).json({ error: 'Solo se pueden gestionar cuentas de administrador' });
    return null;
  }
  return filas[0];
}

async function activar(req, res) {
  try {
    const usuario = await verificarEsAdmin(res, req.params.id);
    if (!usuario) return;
    await pool.execute('UPDATE usuario SET activo = 1 WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Cuenta activada correctamente' });
  } catch (e) {
    handleError(res, e, 'activar adminUsuario', 'Error al activar cuenta');
  }
}

async function desactivar(req, res) {
  try {
    const usuario = await verificarEsAdmin(res, req.params.id);
    if (!usuario) return;
    await pool.execute('UPDATE usuario SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Cuenta desactivada correctamente' });
  } catch (e) {
    handleError(res, e, 'desactivar adminUsuario', 'Error al desactivar cuenta');
  }
}

module.exports = { listar, activar, desactivar };
