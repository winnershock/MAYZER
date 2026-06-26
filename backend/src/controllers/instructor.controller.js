const bcrypt = require('bcryptjs');
const { pool, CAT }           = require('../config/db');
const { handleError } = require('../utils/response.utils');

async function listar(req, res) {
  try {
    const { anio, mes } = req.query;
    // Si se recibe un período, las horas asignadas se acotan a los eventos
    // cuyo rango de fechas se solape con ese mes (igual que la columna
    // "Grupos" ya hace en el frontend con solapaCon()). Sin período, se
    // mantiene el total histórico acumulado (comportamiento por defecto).
    let condicionPeriodo = '';
    const paramsPeriodo = [];
    if (anio && mes) {
      condicionPeriodo = 'AND ev.fecha_inicio <= LAST_DAY(?) AND ev.fecha_fin >= ?';
      const mesNum = String(mes).padStart(2, '0');
      paramsPeriodo.push(`${anio}-${mesNum}-01`, `${anio}-${mesNum}-01`);
    }

    const [filas] = await pool.execute(
      `SELECT ins.id, ins.especialidad, ins.experiencia_anios, ins.horas_maximas, ins.activo, ins.telefono, ins.color,
              u.id AS usuario_id, u.nombre_completo, u.nombre_usuario, u.email,
              COUNT(DISTINCT ga.id)                               AS grupos_activos,
              COALESCE(SUM(TIMESTAMPDIFF(HOUR, ev.hora_inicio, ev.hora_fin)), 0) AS horas_asignadas
       FROM instructor ins
       JOIN usuario u ON ins.usuario_id = u.id
       LEFT JOIN grupo ga ON ga.instructor_id = ins.id AND ga.estado_id IN (1,2) AND ga.deleted_at IS NULL
       LEFT JOIN grupo gh ON gh.instructor_id = ins.id AND gh.deleted_at IS NULL
       LEFT JOIN evento ev ON ev.grupo_id = gh.id ${condicionPeriodo}
       WHERE ins.deleted_at IS NULL
       GROUP BY ins.id
       ORDER BY u.nombre_completo`,
      paramsPeriodo
    );

    const esPrivilegiado = req.usuario.rol_id === CAT.rol.ADMIN || req.usuario.rol_id === CAT.rol.SUPERUSUARIO;
    const resultado = esPrivilegiado
      ? filas
      : filas.map(f => ({ id: f.id, nombre_completo: f.nombre_completo, color: f.color }));

    res.json(resultado);
  } catch (e) {
    handleError(res, e, 'listar instructores', 'Error al listar instructores');
  }
}

async function crear(req, res) {
  const {
    nombre_completo, email, nombre_usuario, contrasena,
    especialidad, experiencia_anios = 0, horas_maximas = 40, telefono, color,
  } = req.body;

  if (!nombre_completo || !email || !nombre_usuario || !contrasena) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (contrasena.trim().length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const passwordHash = await bcrypt.hash(contrasena, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [resultUsuario] = await conn.execute(
      'INSERT INTO usuario (nombre_completo, nombre_usuario, email, contrasena_hash, rol_id) VALUES (?,?,?,?,?)',
      [nombre_completo, nombre_usuario, email, passwordHash, CAT.rol.INSTRUCTOR]
    );
    await conn.execute(
      'INSERT INTO instructor (usuario_id, especialidad, experiencia_anios, horas_maximas, telefono, color) VALUES (?,?,?,?,?,?)',
      [resultUsuario.insertId, especialidad || null, experiencia_anios, horas_maximas, telefono || null, color || null]
    );
    await conn.commit();
    res.status(201).json({ mensaje: 'Instructor creado' });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Usuario o email ya existe' });
    handleError(res, e, 'crear instructor', 'Error al crear instructor');
  } finally { conn.release(); }
}

async function editar(req, res) {
  const { id } = req.params;
  const {
    nombre_completo, email, telefono,
    especialidad, experiencia_anios, horas_maximas,
    contrasena, color,
  } = req.body;

  if (!nombre_completo || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios' });
  }
  if (contrasena && contrasena.trim().length > 0 && contrasena.trim().length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [filasInstructor] = await conn.execute(
      'SELECT ins.id, ins.usuario_id FROM instructor ins WHERE ins.id = ? AND ins.deleted_at IS NULL',
      [id]
    );
    if (!filasInstructor.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Instructor no encontrado' });
    }

    const { usuario_id } = filasInstructor[0];

    await conn.execute(
      'UPDATE usuario SET nombre_completo = ?, email = ? WHERE id = ?',
      [nombre_completo, email, usuario_id]
    );

    if (contrasena && contrasena.trim().length >= 8) {
      const hash = await bcrypt.hash(contrasena.trim(), 12);
      await conn.execute('UPDATE usuario SET contrasena_hash = ? WHERE id = ?', [hash, usuario_id]);
    }

    // El estado activo/inactivo del instructor se gestiona únicamente con
    // el botón "Desactivar" (soft-delete + bloqueo de login). La edición ya
    // no admite cambiarlo de forma independiente, para evitar dos nociones
    // de "activo" que puedan quedar desincronizadas entre sí.
    await conn.execute(
      `UPDATE instructor
         SET telefono = ?, especialidad = ?, experiencia_anios = ?, horas_maximas = ?,
             color = COALESCE(?, color)
       WHERE id = ?`,
      [
        telefono       || null,
        especialidad   || null,
        experiencia_anios ?? 0,
        horas_maximas  ?? 40,
        color !== undefined ? (color || null) : null,
        id,
      ]
    );

    await conn.commit();
    res.json({ mensaje: 'Instructor actualizado' });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email ya existe en otro usuario' });
    handleError(res, e, 'editar instructor', 'Error al actualizar instructor');
  } finally { conn.release(); }
}

async function historial(req, res) {
  try {
    const { id } = req.params;

    const [filasHistorial] = await pool.execute(
      `SELECT
         h.id, h.fecha_asignacion, h.nota,
         g.id AS grupo_id, g.nombre AS grupo_nombre,
         g.fecha_inicio, g.fecha_fin,
         c.nombre AS curso_nombre,
         ge.nombre AS grupo_estado,
         u.nombre_completo AS asignado_por_nombre
       FROM instructor_grupo_historial h
       JOIN grupo        g  ON h.grupo_id     = g.id
       JOIN curso        c  ON g.curso_id     = c.id
       JOIN grupo_estado ge ON g.estado_id    = ge.id
       LEFT JOIN usuario u  ON h.asignado_por = u.id
       WHERE h.instructor_id = ?
       ORDER BY h.fecha_asignacion DESC`,
      [id]
    );

    if (filasHistorial.length > 0) return res.json(filasHistorial);

    const [filasGrupos] = await pool.execute(
      `SELECT
         g.id AS id,
         g.created_at AS fecha_asignacion,
         NULL AS nota,
         g.id AS grupo_id, g.nombre AS grupo_nombre,
         g.fecha_inicio, g.fecha_fin,
         c.nombre AS curso_nombre,
         ge.nombre AS grupo_estado,
         NULL AS asignado_por_nombre
       FROM grupo g
       JOIN curso        c  ON g.curso_id  = c.id
       JOIN grupo_estado ge ON g.estado_id = ge.id
       WHERE g.instructor_id = ? AND g.deleted_at IS NULL
       ORDER BY g.created_at DESC`,
      [id]
    );

    if (filasGrupos.length > 0) {
      const conn = await pool.getConnection();
      try {
        const placeholders = filasGrupos.map(() => '(?, ?, ?)').join(', ');
        const valores = filasGrupos.flatMap(g => [id, g.grupo_id, g.fecha_asignacion]);
        await conn.execute(
          `INSERT IGNORE INTO instructor_grupo_historial (instructor_id, grupo_id, fecha_asignacion) VALUES ${placeholders}`,
          valores
        );
      } finally { conn.release(); }
    }

    res.json(filasGrupos);
  } catch (e) {
    handleError(res, e, 'historial instructor', 'Error al cargar historial');
  }
}

async function registrarAsignacion(conn, instructorId, grupoId, usuarioId) {
  try {
    const [existe] = await conn.execute(
      'SELECT id FROM instructor_grupo_historial WHERE instructor_id = ? AND grupo_id = ?',
      [instructorId, grupoId]
    );
    if (!existe.length) {
      await conn.execute(
        'INSERT INTO instructor_grupo_historial (instructor_id, grupo_id, asignado_por) VALUES (?,?,?)',
        [instructorId, grupoId, usuarioId || null]
      );
    }
  } catch (e) {
    console.warn('registrarAsignacion historial (no crítico):', e.message);
  }
}

async function desactivar(req, res) {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [filasInstructor] = await conn.execute(
      'SELECT id, usuario_id FROM instructor WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (!filasInstructor.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Instructor no encontrado' });
    }

    const [filasGruposActivos] = await conn.execute(
      `SELECT COUNT(*) AS total FROM grupo
       WHERE instructor_id = ? AND estado_id IN (1,2) AND deleted_at IS NULL`,
      [id]
    );
    if (filasGruposActivos[0].total > 0) {
      await conn.rollback();
      return res.status(400).json({
        error: `No se puede desactivar: el instructor tiene ${filasGruposActivos[0].total} grupo(s) en estado "Programado" o "En Curso". Reasígnalo primero.`,
      });
    }

    const ahora = new Date();
    await conn.execute('UPDATE instructor SET deleted_at = ? WHERE id = ?', [ahora, id]);
    await conn.execute('UPDATE usuario SET activo = FALSE WHERE id = ?', [filasInstructor[0].usuario_id]);

    await conn.commit();
    res.json({ mensaje: 'Instructor desactivado correctamente' });
  } catch (e) {
    await conn.rollback();
    handleError(res, e, 'desactivar instructor', 'Error al desactivar instructor');
  } finally { conn.release(); }
}

module.exports = { listar, crear, editar, historial, desactivar, registrarAsignacion };
