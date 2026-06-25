const { pool }         = require('../config/db');
const { handleError }  = require('../utils/response.utils');
const { normalizarPaginacion, construirFiltroPeriodo } = require('../utils/db.utils');

async function listar(req, res) {
  try {
    const { buscar, nombre, nit, ciudad_id, anio, mes } = req.query;
    const params = [];
    let clausulaWhere = 'WHERE e.deleted_at IS NULL';

    // Compatibilidad retro: `buscar` sigue funcionando como nombre+NIT combinado.
    if (nombre) {
      clausulaWhere += ' AND e.nombre LIKE ?';
      params.push(`%${nombre}%`);
    }
    if (nit) {
      clausulaWhere += ' AND e.nit LIKE ?';
      params.push(`%${nit}%`);
    }
    if (ciudad_id) {
      clausulaWhere += ' AND e.ciudad_id = ?';
      params.push(Number(ciudad_id));
    }
    if (!nombre && !nit && buscar) {
      clausulaWhere += ' AND (e.nombre LIKE ? OR e.nit LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    // Año/mes: solo se listan empresas con al menos una solicitud en el periodo,
    // y los conteos de solicitudes/aspirantes quedan acotados al mismo periodo.
    const periodo = construirFiltroPeriodo(anio, mes, 's.created_at');
    const condicionJoinSolicitud = periodo.filtro
      ? `s.empresa_id = e.id ${periodo.filtro}`
      : 's.empresa_id = e.id';
    const paramsJoin = periodo.filtro ? periodo.params : [];
    if (periodo.filtro) {
      clausulaWhere += ` AND EXISTS (
        SELECT 1 FROM solicitud s2 WHERE s2.empresa_id = e.id ${periodo.filtro.replace(/\bs\./g, 's2.')}
      )`;
      params.push(...periodo.params);
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
      LEFT JOIN solicitud s  ON ${condicionJoinSolicitud}
      LEFT JOIN aspirante a  ON a.solicitud_id = s.id
      ${clausulaWhere}
      GROUP BY e.id
      ORDER BY e.nombre
      LIMIT ${limit} OFFSET ${offset}`;

    const paramsFinal = [...paramsJoin, ...params];

    const [filas]       = await pool.query(sqlListado, paramsFinal);
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
