const { pool, CAT }   = require('../config/db');
const { handleError } = require('../utils/response.utils');
const { construirFiltroPeriodo } = require('../utils/db.utils');

const ESTADOS_FINALES = [CAT.grpEstado.FINALIZADO, CAT.grpEstado.CANCELADO];

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

async function listar(req, res) {
  try {
    const { anio, mes } = req.query;
    const soloInactivos = req.query.inactivos === '1';
    let condicion = soloInactivos
      ? 'WHERE deleted_at IS NULL AND activo = 0'
      : 'WHERE deleted_at IS NULL AND activo = 1';

    const params = [];
    const periodo = construirFiltroPeriodo(anio, mes, 'created_at');
    if (periodo.filtro) {
      condicion += ' ' + periodo.filtro;
      params.push(...periodo.params);
    }

    const [filas] = await pool.execute(
      `SELECT id, nombre, descripcion, requerimientos_inscripcion,
              intensidad_horaria, certificable, activo, created_at
       FROM curso ${condicion} ORDER BY nombre`,
      params
    );

    const placeholders = ESTADOS_FINALES.map(() => '?').join(', ');
    const [filasBloqueados] = await pool.execute(
      `SELECT DISTINCT curso_id FROM grupo
       WHERE estado_id IN (${placeholders}) AND deleted_at IS NULL`,
      ESTADOS_FINALES
    );
    const idsBloqueados = new Set(filasBloqueados.map(f => f.curso_id));

    const cursosConBloqueo = filas.map(c => ({
      ...c,
      bloqueado: idsBloqueados.has(c.id),
    }));

    res.json(cursosConBloqueo);
  } catch (e) {
    handleError(res, e, 'listar cursos', 'Error al cargar cursos');
  }
}

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

async function actualizar(req, res) {
  const cursoId = req.params.id;
  const { nombre, descripcion, requerimientos_inscripcion, intensidad_horaria } = req.body;

  try {
    const [filaCurso] = await pool.execute(
      'SELECT id FROM curso WHERE id = ? AND deleted_at IS NULL',
      [cursoId]
    );
    if (filaCurso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

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
