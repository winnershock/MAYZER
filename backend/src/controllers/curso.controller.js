/**
 * controllers/curso.controller.js
 * Responsabilidad : CRUD del catálogo de cursos (los cursos nunca se eliminan físicamente).
 * Exporta         : listar, crear, actualizar, desactivar, activar
 * Usado en        : routes/curso.routes.js
 * Depende de      : config/db.js (pool, CAT), utils/response.utils.js
 */
const { pool, CAT }   = require('../config/db');
const { handleError } = require('../utils/response.utils');

// Estados de grupo que bloquean la edición del curso
const ESTADOS_FINALES = [CAT.grpEstado.FINALIZADO, CAT.grpEstado.CANCELADO];

/**
 * Verifica si un curso tiene grupos en estado final (finalizado o cancelado).
 * @param {number} cursoId
 * @returns {Promise<boolean>}
 */
async function tieneGruposFinalizados(cursoId) {
  const placeholders = ESTADOS_FINALES.map(() => '?').join(', ');
  const [filas] = await pool.execute(
    `SELECT 1 FROM grupo
     WHERE curso_id = ? AND estado_id IN (${placeholders}) AND deleted_at IS NULL
     LIMIT 1`,
    [cursoId, ...ESTADOS_FINALES]
  );
  return filas.length > 0;
}

// ── GET /api/cursos ───────────────────────────────────────
async function listar(req, res) {
  try {
    // Por defecto solo cursos activos; ?todos=1 incluye inactivos (uso interno/reportes)
    const soloActivos = req.query.todos !== '1';
    const condicion = soloActivos
      ? 'WHERE deleted_at IS NULL AND activo = 1'
      : 'WHERE deleted_at IS NULL';

    const [filas] = await pool.execute(
      `SELECT id, nombre, descripcion, requerimientos_inscripcion,
              intensidad_horaria, certificable, activo, created_at
       FROM curso ${condicion} ORDER BY nombre`
    );

    // Anotar cada curso con si tiene grupos finalizados (para que el frontend bloquee el botón editar)
    const cursosConBloqueo = await Promise.all(
      filas.map(async (c) => ({
        ...c,
        bloqueado: await tieneGruposFinalizados(c.id),
      }))
    );

    res.json(cursosConBloqueo);
  } catch (e) {
    handleError(res, e, 'listar cursos', 'Error al cargar cursos');
  }
}

// ── POST /api/cursos ──────────────────────────────────────
async function crear(req, res) {
  const { nombre, descripcion, requerimientos_inscripcion, intensidad_horaria } = req.body;
  if (!nombre || !intensidad_horaria) {
    return res.status(400).json({ error: 'Nombre e intensidad horaria son obligatorios' });
  }
  try {
    const [resultado] = await pool.execute(
      `INSERT INTO curso
         (nombre, descripcion, requerimientos_inscripcion, intensidad_horaria, certificable, created_by)
       VALUES (?,?,?,?,1,?)`,
      [nombre, descripcion || null, requerimientos_inscripcion || null, intensidad_horaria, req.usuario.id]
    );
    res.status(201).json({ id: resultado.insertId, mensaje: 'Curso creado' });
  } catch (e) {
    handleError(res, e, 'crear curso', 'Error al crear curso');
  }
}

// ── PUT /api/cursos/:id ───────────────────────────────────
async function actualizar(req, res) {
  const cursoId = req.params.id;
  const { nombre, descripcion, requerimientos_inscripcion, intensidad_horaria } = req.body;

  try {
    // Validar que el curso exista y no esté eliminado
    const [filaCurso] = await pool.execute(
      'SELECT id FROM curso WHERE id = ? AND deleted_at IS NULL',
      [cursoId]
    );
    if (filaCurso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Bloquear edición si tiene grupos finalizados
    const bloqueado = await tieneGruposFinalizados(cursoId);
    if (bloqueado) {
      return res.status(409).json({
        error: 'Este curso no puede editarse porque tiene grupos finalizados asociados.',
        codigo: 'CURSO_BLOQUEADO',
      });
    }

    await pool.execute(
      `UPDATE curso
         SET nombre = ?, descripcion = ?, requerimientos_inscripcion = ?, intensidad_horaria = ?
       WHERE id = ?`,
      [nombre, descripcion, requerimientos_inscripcion, intensidad_horaria, cursoId]
    );
    res.json({ mensaje: 'Curso actualizado' });
  } catch (e) {
    handleError(res, e, 'actualizar curso', 'Error al actualizar curso');
  }
}

// ── DELETE /api/cursos/:id  →  DESACTIVAR (soft) ──────────
// Los cursos nunca se eliminan físicamente. Esta ruta desactiva el curso.
async function desactivar(req, res) {
  const cursoId = req.params.id;
  try {
    const [filaCurso] = await pool.execute(
      'SELECT id, activo FROM curso WHERE id = ? AND deleted_at IS NULL',
      [cursoId]
    );
    if (filaCurso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    if (!filaCurso[0].activo) {
      return res.status(409).json({ error: 'El curso ya está desactivado' });
    }

    await pool.execute(
      'UPDATE curso SET activo = 0 WHERE id = ?',
      [cursoId]
    );
    res.json({ mensaje: 'Curso desactivado correctamente' });
  } catch (e) {
    handleError(res, e, 'desactivar curso', 'Error al desactivar curso');
  }
}

// ── PATCH /api/cursos/:id/activar ─────────────────────────
async function activar(req, res) {
  const cursoId = req.params.id;
  try {
    const [filaCurso] = await pool.execute(
      'SELECT id, activo FROM curso WHERE id = ? AND deleted_at IS NULL',
      [cursoId]
    );
    if (filaCurso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    if (filaCurso[0].activo) {
      return res.status(409).json({ error: 'El curso ya está activo' });
    }

    await pool.execute(
      'UPDATE curso SET activo = 1 WHERE id = ?',
      [cursoId]
    );
    res.json({ mensaje: 'Curso activado correctamente' });
  } catch (e) {
    handleError(res, e, 'activar curso', 'Error al activar curso');
  }
}

module.exports = { listar, crear, actualizar, desactivar, activar };
