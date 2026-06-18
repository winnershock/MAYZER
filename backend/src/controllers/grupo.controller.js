/**
 * controllers/grupo.controller.js
 * Responsabilidad : Gestión de grupos de formación con filtrado por instructor.
 * Exporta         : listar, verUno, crear, actualizar, eliminar
 * Usado en        : routes/grupo.routes.js
 * Depende de      : config/db.js (pool, CAT), controllers/instructor.controller.js,
 *                   utils/response.utils.js, utils/db.utils.js, utils/crypto.utils.js
 */
const { pool, CAT }            = require('../config/db');
const { registrarAsignacion }  = require('./instructor.controller');
const { notFoundSi, handleError } = require('../utils/response.utils');
const { construirFiltroPeriodo, normalizarPaginacion } = require('../utils/db.utils');
const { descifrar }               = require('../utils/crypto.utils');

// ── GET /api/grupos ───────────────────────────────────────
async function listar(req, res) {
  try {
    const { estado, curso, curso_id, anio, instructor_id } = req.query;
    const params = [];
    let clausulaWhere = 'WHERE g.deleted_at IS NULL';

    if (estado) {
      const estadoId = CAT.grpEstado[estado];
      if (estadoId) { clausulaWhere += ' AND g.estado_id = ?'; params.push(estadoId); }
    }
    // curso_id tiene precedencia (filtro por desplegable); curso es fallback legacy por nombre
    if (curso_id) {
      clausulaWhere += ' AND g.curso_id = ?';
      params.push(Number(curso_id));
    } else if (curso) {
      clausulaWhere += ' AND c.nombre LIKE ?';
      params.push(`%${curso}%`);
    }
    if (instructor_id) {
      clausulaWhere += ' AND ins.id = ?';
      params.push(Number(instructor_id));
    }

    // Rango de fechas → usa índice idx_grupo_fecha_inicio
    const periodoAnio = construirFiltroPeriodo(anio, null, 'g.fecha_inicio');
    if (periodoAnio.filtro) { clausulaWhere += ' ' + periodoAnio.filtro; params.push(...periodoAnio.params); }

    const { limit, offset, pagina } = normalizarPaginacion(req.query);

    const sqlListado = `
      SELECT SQL_CALC_FOUND_ROWS
             g.id, g.codigo, g.nombre, g.estado_id, g.cupo_maximo,
             ge.nombre AS estado,
             DATE_FORMAT(g.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
             DATE_FORMAT(g.fecha_fin,    '%Y-%m-%d') AS fecha_fin,
             l.nombre AS lugar, l.id AS lugar_id,
             g.curso_id,
             c.nombre AS curso_nombre, c.intensidad_horaria,
             u.nombre_completo AS instructor_nombre,
             ins.id AS instructor_id,
             ins.color AS instructor_color,
             COUNT(i.id) AS inscritos
      FROM grupo g
      JOIN grupo_estado ge ON g.estado_id    = ge.id
      JOIN curso        c  ON g.curso_id     = c.id
      JOIN instructor  ins ON g.instructor_id = ins.id
      JOIN usuario      u  ON ins.usuario_id  = u.id
      LEFT JOIN lugar   l  ON g.lugar_id     = l.id
      LEFT JOIN inscripcion i ON i.grupo_id  = g.id
      ${clausulaWhere}
      GROUP BY g.id ORDER BY g.fecha_inicio DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const [filas]       = await pool.query(sqlListado, params);
    const [[{ total }]] = await pool.query('SELECT FOUND_ROWS() AS total');

    res.json({ grupos: filas, total, pagina });
  } catch (e) {
    handleError(res, e, 'listar grupos', 'Error al cargar grupos');
  }
}

// ── GET /api/grupos/:id ───────────────────────────────────
async function verUno(req, res) {
  try {
    const [filasGrupo] = await pool.execute(
      `SELECT g.*, ge.nombre AS estado, c.nombre AS curso_nombre,
              u.nombre_completo AS instructor_nombre,
              l.nombre AS lugar_nombre, l.id AS lugar_id,
              COUNT(i.id) AS inscritos
       FROM grupo g
       JOIN grupo_estado ge ON g.estado_id    = ge.id
       JOIN curso        c  ON g.curso_id     = c.id
       JOIN instructor  ins ON g.instructor_id = ins.id
       JOIN usuario      u  ON ins.usuario_id  = u.id
       LEFT JOIN lugar   l  ON g.lugar_id     = l.id
       LEFT JOIN inscripcion i ON i.grupo_id  = g.id
       WHERE g.id = ? GROUP BY g.id`,
      [req.params.id]
    );
    if (notFoundSi(res, filasGrupo)) return;

    const [filasAspirantes] = await pool.execute(
      `SELECT a.id,
              a.nombre_completo,
              a.tipo_documento,
              a.numero_documento,
              a.email,
              a.telefono,
              c.nombre        AS curso_requerido,
              e.nombre        AS empresa,
              ie.nombre       AS estado,
              ins_e.nombre    AS inscripcion_estado
       FROM inscripcion   i
       JOIN aspirante     a    ON i.aspirante_id  = a.id
       JOIN solicitud     s    ON a.solicitud_id  = s.id
       JOIN empresa       e    ON s.empresa_id    = e.id
       JOIN curso         c    ON s.curso_id      = c.id
       JOIN inscripcion_estado ie ON i.estado_id  = ie.id
       LEFT JOIN aspirante_estado ins_e ON a.estado_id = ins_e.id
       WHERE i.grupo_id = ?`,
      [req.params.id]
    );

    const aspirantesDecifrados = filasAspirantes.map(a => ({
      ...a,
      numero_documento: descifrar(a.numero_documento) || '',
      email:            descifrar(a.email)            || '',
      telefono:         descifrar(a.telefono)         || '',
    }));

    res.json({ ...filasGrupo[0], aspirantes: aspirantesDecifrados });
  } catch (e) {
    handleError(res, e, 'verUno grupo', 'Error al cargar grupo');
  }
}


/**
 * Valida que cupo_maximo no supere la capacidad del lugar.
 * @param {object} conn - Conexión MySQL
 * @param {number|null} lugar_id
 * @param {number} cupo_maximo
 * @returns {string|null} Mensaje de error o null si es válido
 */
async function validarCapacidadLugar(conn, lugar_id, cupo_maximo) {
  if (!lugar_id) return null;
  const [[lugar]] = await conn.execute(
    'SELECT nombre, capacidad FROM lugar WHERE id = ?', [lugar_id]
  );
  if (!lugar) return null;
  if (lugar.capacidad && Number(cupo_maximo) > lugar.capacidad) {
    return `El cupo máximo (${cupo_maximo}) supera la capacidad del lugar "${lugar.nombre}" (${lugar.capacidad})`;
  }
  return null;
}

// ── POST /api/grupos ──────────────────────────────────────
async function crear(req, res) {
  const { nombre, codigo, curso_id, instructor_id, cupo_maximo = 30,
          fecha_inicio, fecha_fin, lugar_id, observaciones } = req.body;

  if (!nombre || !curso_id || !instructor_id || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validar capacidad del lugar
    const errorCapacidad = await validarCapacidadLugar(conn, lugar_id, cupo_maximo);
    if (errorCapacidad) {
      conn.release();
      return res.status(400).json({ error: errorCapacidad });
    }

    // Si el frontend no envía codigo, calcular el siguiente disponible
    let codigoFinal = codigo ? Number(codigo) : null;
    if (!codigoFinal) {
      const [[{ maxCodigo }]] = await conn.execute(
        'SELECT COALESCE(MAX(codigo), 0) AS maxCodigo FROM grupo'
      );
      codigoFinal = maxCodigo + 1;
    }

    const [resultado] = await conn.execute(
      `INSERT INTO grupo
         (codigo, nombre, curso_id, instructor_id, lugar_id, cupo_maximo, estado_id,
          fecha_inicio, fecha_fin, observaciones, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [codigoFinal, nombre, curso_id, instructor_id, lugar_id || null,
       cupo_maximo, CAT.grpEstado.PROGRAMADO, fecha_inicio, fecha_fin,
       observaciones || null, req.usuario.id]
    );
    await registrarAsignacion(conn, instructor_id, resultado.insertId, req.usuario.id);
    await conn.commit();
    res.status(201).json({ id: resultado.insertId, codigo: codigoFinal, mensaje: 'Grupo creado correctamente' });
  } catch (e) {
    await conn.rollback();
    handleError(res, e, 'crear grupo', 'Error al crear grupo');
  } finally { conn.release(); }
}

// ── PUT /api/grupos/:id ───────────────────────────────────
async function actualizar(req, res) {
  const { nombre, codigo, curso_id, instructor_id, cupo_maximo,
          fecha_inicio, fecha_fin, lugar_id, estado, observaciones } = req.body;
  const estadoId = CAT.grpEstado[estado] ?? CAT.grpEstado.PROGRAMADO;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE grupo
         SET codigo = ?, nombre = ?, curso_id = ?, instructor_id = ?, cupo_maximo = ?,
             fecha_inicio = ?, fecha_fin = ?, lugar_id = ?, estado_id = ?, observaciones = ?
       WHERE id = ?`,
      [codigo, nombre, curso_id, instructor_id, cupo_maximo,
       fecha_inicio, fecha_fin, lugar_id || null, estadoId, observaciones, req.params.id]
    );
    await registrarAsignacion(conn, instructor_id, req.params.id, req.usuario.id);
    await conn.commit();
    res.json({ mensaje: 'Grupo actualizado' });
  } catch (e) {
    await conn.rollback();
    handleError(res, e, 'actualizar grupo', 'Error al actualizar grupo');
  } finally { conn.release(); }
}

// ── DELETE /api/grupos/:id ────────────────────────────────
async function eliminar(req, res) {
  try {
    const [[{ totalAspirantes }]] = await pool.execute(
      'SELECT COUNT(*) AS totalAspirantes FROM inscripcion WHERE grupo_id = ?',
      [req.params.id]
    );
    if (totalAspirantes > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: el grupo tiene ${totalAspirantes} aspirante(s) asignado(s). Retíralos primero.`,
      });
    }
    await pool.execute('UPDATE grupo SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Grupo eliminado' });
  } catch (e) {
    handleError(res, e, 'eliminar grupo', 'Error al eliminar grupo');
  }
}

module.exports = { listar, verUno, crear, actualizar, eliminar };
