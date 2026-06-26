const { pool }         = require('../config/db');
const { handleError }  = require('../utils/response.utils');
const { normalizarPaginacion } = require('../utils/db.utils');

async function listar(req, res) {
  try {
    const { buscar, empresa, ciudad_id } = req.query;
    const params = [];
    let clausulaWhere = 'WHERE e.deleted_at IS NULL';

    // Una sola casilla busca por nombre o por NIT a la vez.
    const textoBusqueda = empresa || buscar;
    if (textoBusqueda) {
      clausulaWhere += ' AND (e.nombre LIKE ? OR e.nit LIKE ?)';
      params.push(`%${textoBusqueda}%`, `%${textoBusqueda}%`);
    }
    if (ciudad_id) {
      clausulaWhere += ' AND e.ciudad_id = ?';
      params.push(Number(ciudad_id));
    }

    const { limit, offset, pagina } = normalizarPaginacion(req.query);

    const sqlListado = `
      SELECT SQL_CALC_FOUND_ROWS
             e.id, e.nombre, e.nit, e.email, e.telefono, e.direccion,
             e.nombre_contacto, e.cargo_contacto, e.activo, e.tipo_entidad,
             ci.nombre AS ciudad, ci.departamento,
             COUNT(DISTINCT s.id) AS total_solicitudes,
             COUNT(DISTINCT a.id) AS total_aspirantes
      FROM empresa e
      LEFT JOIN ciudad    ci ON e.ciudad_id    = ci.id
      LEFT JOIN solicitud s  ON s.empresa_id   = e.id
      LEFT JOIN aspirante a  ON a.solicitud_id = s.id
      ${clausulaWhere}
      GROUP BY e.id
      ORDER BY e.nombre
      LIMIT ${limit} OFFSET ${offset}`;

    const [filas]       = await pool.query(sqlListado, params);
    const [[{ total }]] = await pool.query('SELECT FOUND_ROWS() AS total');

    res.json({ empresas: filas, total, pagina });
  } catch (e) {
    handleError(res, e, 'listar empresas', 'Error al cargar empresas');
  }
}

async function listarLugares(req, res) {
  try {
    const [filas] = await pool.execute('SELECT * FROM lugar WHERE activo = 1 ORDER BY nombre');
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listarLugares', 'Error al cargar lugares');
  }
}

async function listarCiudades(req, res) {
  try {
    const [filas] = await pool.execute('SELECT id, nombre, departamento FROM ciudad ORDER BY nombre');
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listarCiudades', 'Error al cargar ciudades');
  }
}

module.exports = { listar, listarLugares, listarCiudades };
