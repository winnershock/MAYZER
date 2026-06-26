const { pool, CAT }            = require('../config/db');
const { descifrar, hashBusqueda } = require('../utils/crypto.utils');
const { enviarCorreo }         = require('../services/correo.service');
const { registrarAuditoria }   = require('../middleware/audit.middleware');
const { normalizarPaginacion, construirFiltroPeriodo } = require('../utils/db.utils');
const { formatearFechaCO }     = require('../utils/formato.utils');
const { notFoundSi, handleError } = require('../utils/response.utils');

const ETIQUETA_ESTADO = { 1: 'PENDIENTE', 2: 'PRE_APROBADO', 3: 'ASIGNADO', 4: 'RECHAZADO' };

function enviarCorreoBackground(payload) {
  setImmediate(async () => {
    try {
      await enviarCorreo(payload);
    } catch (err) {
      console.error('[correo:bg] Error al enviar correo en background:', err.message);
    }
  });
}

function descifrarAspirante(fila) {
  return {
    ...fila,
    numero_documento: descifrar(fila.numero_documento) || '',
    email:            descifrar(fila.email)            || '',
    telefono:         descifrar(fila.telefono)         || '',
    estado_proceso:   ETIQUETA_ESTADO[fila.estado_id]  || String(fila.estado_id),
  };
}

function descifrarMedico(filaMediaca) {
  if (!filaMediaca) return null;
  return {
    ...filaMediaca,
    eps:          descifrar(filaMediaca.eps)          || null,
    arl:          descifrar(filaMediaca.arl)          || null,
    antecedentes: descifrar(filaMediaca.antecedentes) || null,
    medicamentos: descifrar(filaMediaca.medicamentos) || null,
  };
}

async function listar(req, res) {
  try {
    const {
      buscar = '', estado = '', curso = '', curso_id = '', anio = '', mes = '',
      aspirante = '', empresa = '',
    } = req.query;
    const { limit, offset, pagina } = normalizarPaginacion(req.query);

    const params  = [];
    const filtros = [];

    if (estado) {
      const estadoId = CAT.aspEstado[estado];
      if (estadoId) { filtros.push('a.estado_id = ?'); params.push(estadoId); }
    }
    if (curso_id) { filtros.push('s.curso_id = ?'); params.push(Number(curso_id)); }
    else if (curso) { filtros.push('c.nombre LIKE ?'); params.push(`%${curso}%`); }

    // Aspirante: una sola casilla busca por nombre o por cédula.
    // Si el texto es puramente numérico se interpreta como número de
    // documento (comparación exacta por hash, ya que está cifrado);
    // si contiene letras se interpreta como nombre (LIKE).
    if (aspirante) {
      const esSoloNumeros = /^\d+$/.test(aspirante.trim());
      if (esSoloNumeros) {
        const hash = hashBusqueda(aspirante.trim());
        filtros.push('a.numero_documento_hash = ?');
        params.push(hash);
      } else {
        filtros.push('a.nombre_completo LIKE ?');
        params.push(`%${aspirante}%`);
      }
    }

    // Empresa: una sola casilla busca por nombre o por NIT a la vez.
    if (empresa) {
      filtros.push('(e.nombre LIKE ? OR e.nit LIKE ?)');
      params.push(`%${empresa}%`, `%${empresa}%`);
    }

    // Compatibilidad retro: `buscar` sigue combinando nombre de aspirante o empresa.
    if (!aspirante && !empresa && buscar) {
      filtros.push('(a.nombre_completo LIKE ? OR e.nombre LIKE ?)');
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    let clausulaWhere = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

    const periodo = construirFiltroPeriodo(anio, mes, 'a.created_at');
    if (periodo.filtro) {
      clausulaWhere = clausulaWhere
        ? `${clausulaWhere} ${periodo.filtro}`
        : `WHERE ${periodo.filtro.replace(/^AND /, '')}`;
      params.push(...periodo.params);
    }

    const fromBase = `
      FROM aspirante a
      JOIN solicitud        s  ON a.solicitud_id = s.id
      JOIN empresa          e  ON s.empresa_id   = e.id
      JOIN curso            c  ON s.curso_id     = c.id
      JOIN aspirante_estado ae ON a.estado_id    = ae.id
      ${clausulaWhere}`;

    const sqlListado = `
      SELECT SQL_CALC_FOUND_ROWS
             a.id, a.nombre1, a.nombre2, a.apellido1, a.apellido2, a.nombre_completo,
             a.tipo_documento, a.numero_documento, a.email, a.telefono,
             a.fecha_nacimiento, a.estado_id, a.motivo_rechazo, a.documento_pdf, a.created_at,
             ae.nombre AS estado_nombre,
             e.nombre  AS empresa, e.nit AS empresa_nit, e.tipo_entidad,
             c.nombre  AS curso_requerido,
             s.id      AS solicitud_id, s.curso_id
      ${fromBase}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const [filas]          = await pool.query(sqlListado, params);
    const [[{ total }]]    = await pool.query('SELECT FOUND_ROWS() AS total');

    res.json({
      aspirantes: filas.map(descifrarAspirante),
      total,
      pagina,
    });
  } catch (e) {
    handleError(res, e, 'listar aspirantes', 'Error al cargar aspirantes: ' + e.message);
  }
}

async function verUno(req, res) {
  try {
    const { id } = req.params;

    const [filas] = await pool.execute(
      `SELECT a.*,
              ae.nombre AS estado_nombre,
              e.nombre  AS empresa, e.email AS email_empresa, e.tipo_entidad,
              c.nombre  AS curso_nombre,
              g.nombre  AS nombre_grupo,
              i.grupo_id
       FROM aspirante a
       JOIN solicitud        s  ON a.solicitud_id = s.id
       JOIN empresa          e  ON s.empresa_id   = e.id
       JOIN curso            c  ON s.curso_id     = c.id
       JOIN aspirante_estado ae ON a.estado_id    = ae.id
       LEFT JOIN inscripcion i  ON i.aspirante_id = a.id
       LEFT JOIN grupo       g  ON i.grupo_id     = g.id
       WHERE a.id = ?`,
      [id]
    );
    if (notFoundSi(res, filas, 'Aspirante no encontrado')) return;

    const [filasMedico]   = await pool.execute(
      'SELECT * FROM aspirante_medico WHERE aspirante_id = ?', [id]
    );
    const [filasContacto] = await pool.execute(
      'SELECT * FROM aspirante_contacto_emergencia WHERE aspirante_id = ?', [id]
    );
    const [filasLaboral]  = await pool.execute(
      `SELECT al.*, emp.nombre AS empresa_nombre
       FROM aspirante_laboral al
       LEFT JOIN empresa emp ON al.empresa_id = emp.id
       WHERE al.aspirante_id = ?`,
      [id]
    );

    res.json({
      ...descifrarAspirante(filas[0]),
      medico:   descifrarMedico(filasMedico[0] || null),
      contacto: filasContacto[0] || null,
      laboral:  filasLaboral[0]  || null,
    });
  } catch (e) {
    handleError(res, e, 'verUno aspirante', 'Error al cargar aspirante');
  }
}

async function preAprobar(req, res) {
  const { id } = req.params;
  try {
    const [filas] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filas)) return;

    const aspirante = filas[0];
    if (aspirante.estado_id !== CAT.aspEstado.PENDIENTE) {
      return res.status(400).json({ error: 'El aspirante no está en estado pendiente' });
    }

    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.PRE_APROBADO, req.usuario.id, id]
    );

    // La notificación de pre-aprobación se envía al SOLICITANTE (empresa),
    // no al aspirante. El correo al aspirante solo ocurre al asignarlo a un grupo.
    const [[solicitante]] = await pool.execute(
      `SELECT e.id AS empresa_id, e.nombre AS empresa, e.email, e.nombre_contacto, c.nombre AS curso
       FROM solicitud s
       JOIN empresa e ON s.empresa_id = e.id
       JOIN curso   c ON s.curso_id   = c.id
       WHERE s.id = ?`,
      [aspirante.solicitud_id]
    );

    if (solicitante?.email) {
      enviarCorreoBackground({
        tipo: 'APROBACION_SOLICITANTE',
        destinatario: solicitante.email,
        datos: {
          nombre:         aspirante.nombre_completo,
          cursoRequerido: solicitante.curso,
          empresa:        solicitante.empresa,
          nombreContacto: solicitante.nombre_contacto || solicitante.empresa,
        },
        usuarioId: req.usuario.id,
        aspiranteId: id,
        empresaId: solicitante.empresa_id,
      });
    }

    setImmediate(() => {
      registrarAuditoria({
        tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
        usuarioId: req.usuario.id,
        datoAntes: { estado_id: 1 }, datoDespues: { estado_id: 2 }, req,
      }).catch(err => console.error('[auditoria:bg] preAprobar:', err.message));
    });

    if (!solicitante?.email) {
      return res.json({ mensaje: 'Aspirante pre-aprobado. El solicitante no tiene correo registrado.', correoEnviado: false, sinEmail: true });
    }
    res.json({ mensaje: 'Aspirante pre-aprobado. Se envió correo de notificación al solicitante.', correoEnviado: true });
  } catch (e) {
    handleError(res, e, 'preAprobar', 'Error al pre-aprobar aspirante');
  }
}

async function rechazar(req, res) {
  const { motivo } = req.body;
  const { id } = req.params;

  if (!motivo || motivo.trim().length < 10) {
    return res.status(400).json({ error: 'El motivo es obligatorio (mínimo 10 caracteres)' });
  }

  try {
    const [filas] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filas)) return;

    const aspirante = filas[0];
    const motivoLimpio = motivo.trim();
    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, motivo_rechazo = ?, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.RECHAZADO, motivoLimpio, req.usuario.id, id]
    );

    // La notificación de rechazo se envía al SOLICITANTE (empresa),
    // no al aspirante.
    const [[solicitante]] = await pool.execute(
      `SELECT e.id AS empresa_id, e.nombre AS empresa, e.email, e.nombre_contacto
       FROM solicitud s
       JOIN empresa e ON s.empresa_id = e.id
       WHERE s.id = ?`,
      [aspirante.solicitud_id]
    );

    if (solicitante?.email) {
      enviarCorreoBackground({
        tipo: 'RECHAZO_SOLICITANTE',
        destinatario: solicitante.email,
        datos: {
          nombre:         aspirante.nombre_completo,
          motivo:         motivoLimpio,
          empresa:        solicitante.empresa,
          nombreContacto: solicitante.nombre_contacto || solicitante.empresa,
        },
        usuarioId: req.usuario.id,
        aspiranteId: id,
        empresaId: solicitante.empresa_id,
      });
    }

    setImmediate(() => {
      registrarAuditoria({
        tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
        usuarioId: req.usuario.id,
        datoDespues: { estado_id: 4, motivo_rechazo: motivo }, req,
      }).catch(err => console.error('[auditoria:bg] rechazar:', err.message));
    });

    if (!solicitante?.email) {
      return res.json({ mensaje: 'Aspirante rechazado. El solicitante no tiene correo registrado.', correoEnviado: false, sinEmail: true });
    }
    res.json({ mensaje: 'Aspirante rechazado. Notificación enviada al solicitante.', correoEnviado: true });
  } catch (e) {
    handleError(res, e, 'rechazar', 'Error al rechazar aspirante');
  }
}

async function asignarAGrupo(req, res) {
  const { grupo_id } = req.body;
  const { id } = req.params;

  if (!grupo_id) return res.status(400).json({ error: 'Grupo requerido' });

  try {
    const [filasAspirante] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filasAspirante)) return;

    const aspirante = filasAspirante[0];
    if (aspirante.estado_id !== CAT.aspEstado.PRE_APROBADO) {
      return res.status(400).json({ error: 'El aspirante debe estar pre-aprobado para asignar' });
    }

    const [[grupo]] = await pool.execute(
      `SELECT g.id, g.nombre, g.cupo_maximo, g.fecha_inicio, g.fecha_fin,
              g.curso_id, g.estado_id,
              COUNT(i.id)       AS inscritos,
              l.nombre          AS lugar_nombre,
              u.nombre_completo AS instructor_nombre,
              c.nombre          AS curso_nombre,
              ev_first.hora_inicio,
              ev_first.hora_fin
       FROM grupo g
       LEFT JOIN inscripcion i   ON i.grupo_id      = g.id
       LEFT JOIN lugar       l   ON g.lugar_id      = l.id
       JOIN  instructor      ins ON g.instructor_id = ins.id
       JOIN  usuario         u   ON ins.usuario_id  = u.id
       JOIN  curso           c   ON g.curso_id      = c.id
       LEFT JOIN (
         SELECT grupo_id, hora_inicio, hora_fin
         FROM evento
         WHERE grupo_id = ?
         ORDER BY id ASC LIMIT 1
       ) ev_first ON ev_first.grupo_id = g.id
       WHERE g.id = ?
       GROUP BY g.id, g.nombre, g.cupo_maximo, g.fecha_inicio, g.fecha_fin,
                g.curso_id, g.estado_id, l.nombre, u.nombre_completo, c.nombre,
                ev_first.hora_inicio, ev_first.hora_fin`,
      [grupo_id, grupo_id]
    );
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });
    if (grupo.estado_id === CAT.grpEstado.FINALIZADO) {
      return res.status(400).json({ error: 'El grupo está finalizado y no admite nuevas asignaciones.' });
    }
    if (Number(grupo.inscritos) >= Number(grupo.cupo_maximo)) {
      return res.status(400).json({ error: 'El grupo ya no tiene cupos disponibles' });
    }

    const [[solicitud]] = await pool.execute(
      'SELECT curso_id FROM solicitud WHERE id = ?',
      [aspirante.solicitud_id]
    );
    if (solicitud && String(solicitud.curso_id) !== String(grupo.curso_id)) {
      const [[cursAsp]] = await pool.execute('SELECT nombre FROM curso WHERE id = ?', [solicitud.curso_id]);
      return res.status(400).json({
        error: `El aspirante solicitó el curso "${cursAsp?.nombre || 'desconocido'}" pero el grupo pertenece al curso "${grupo.curso_nombre}". No se puede asignar a un grupo de curso diferente.`,
      });
    }

    await pool.execute(
      'INSERT INTO inscripcion (aspirante_id, grupo_id, estado_id) VALUES (?, ?, ?)',
      [id, grupo_id, CAT.insEstado.INSCRITO]
    );
    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.ASIGNADO, req.usuario.id, id]
    );

    const emailDescifrado = descifrar(aspirante.email);
    const sinEmail = !emailDescifrado;

    if (emailDescifrado) {
      enviarCorreoBackground({
        tipo: 'ASIGNACION',
        destinatario: emailDescifrado,
        datos: {
          nombre:      aspirante.nombre_completo,
          curso:       grupo.curso_nombre,
          grupo:       grupo.nombre,
          instructor:  grupo.instructor_nombre,
          fechaInicio: formatearFechaCO(grupo.fecha_inicio),
          fechaFin:    formatearFechaCO(grupo.fecha_fin),
          horaInicio:  grupo.hora_inicio || 'Por confirmar',
          horaFin:     grupo.hora_fin    || 'Por confirmar',
          lugar:       grupo.lugar_nombre || 'SENA Sede Palmira',
        },
        usuarioId: req.usuario.id,
        aspiranteId: id,
      });
    }

    setImmediate(() => {
      registrarAuditoria({
        tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
        usuarioId: req.usuario.id,
        datoAntes: { estado_id: CAT.aspEstado.PRE_APROBADO },
        datoDespues: { estado_id: CAT.aspEstado.ASIGNADO, grupo_id }, req,
      }).catch(err => console.error('[auditoria:bg] asignarAGrupo:', err.message));
    });

    if (sinEmail) {
      return res.json({ mensaje: 'Aspirante asignado. El aspirante no tiene correo registrado.', correoEnviado: false, sinEmail: true });
    }
    res.json({ mensaje: 'Aspirante asignado. Se envió correo con información del curso.', correoEnviado: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El aspirante ya está inscrito en este grupo' });
    }
    handleError(res, e, 'asignarAGrupo', 'Error al asignar aspirante');
  }
}

async function desasignarDeGrupo(req, res) {
  const { id } = req.params;
  try {
    const [filas] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filas, 'Aspirante no encontrado')) return;

    const aspirante = filas[0];
    if (aspirante.estado_id !== CAT.aspEstado.ASIGNADO) {
      return res.status(400).json({ error: 'El aspirante no está asignado a ningún grupo' });
    }

    const [[inscripcion]] = await pool.execute(
      `SELECT g.estado_id
       FROM inscripcion i
       JOIN grupo g ON i.grupo_id = g.id
       WHERE i.aspirante_id = ?`,
      [id]
    );
    if (inscripcion && inscripcion.estado_id === CAT.grpEstado.FINALIZADO) {
      return res.status(400).json({ error: 'El grupo está finalizado y no admite cambios en sus aspirantes.' });
    }

    await pool.execute('DELETE FROM inscripcion WHERE aspirante_id = ?', [id]);

    await pool.execute(
      'UPDATE aspirante SET estado_id = ? WHERE id = ?',
      [CAT.aspEstado.PRE_APROBADO, id]
    );

    await registrarAuditoria({
      tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
      usuarioId: req.usuario.id,
      datoAntes: { estado_id: CAT.aspEstado.ASIGNADO },
      datoDespues: { estado_id: CAT.aspEstado.PRE_APROBADO }, req,
    });

    res.json({ mensaje: 'Aspirante desasignado del grupo correctamente.' });
  } catch (e) {
    handleError(res, e, 'desasignarDeGrupo', 'Error al desasignar aspirante');
  }
}

async function restablecer(req, res) {
  const { id } = req.params;
  try {
    const [filas] = await pool.execute(
      'SELECT id, estado_id, solicitud_id FROM aspirante WHERE id = ?',
      [id]
    );
    if (notFoundSi(res, filas, 'Aspirante no encontrado')) return;

    const aspirante = filas[0];
    if (aspirante.estado_id !== CAT.aspEstado.RECHAZADO) {
      return res.status(400).json({ error: 'Solo se pueden restablecer aspirantes en estado RECHAZADO' });
    }

    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, motivo_rechazo = NULL, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.PENDIENTE, req.usuario.id, id]
    );

    await registrarAuditoria({
      tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
      usuarioId: req.usuario.id,
      datoAntes:  { estado_id: CAT.aspEstado.RECHAZADO },
      datoDespues: { estado_id: CAT.aspEstado.PENDIENTE }, req,
    });
    res.json({ mensaje: 'Aspirante restablecido a estado PENDIENTE correctamente.' });
  } catch (e) {
    handleError(res, e, 'restablecer', 'Error al restablecer aspirante');
  }
}

module.exports = { listar, verUno, preAprobar, rechazar, asignarAGrupo, desasignarDeGrupo, restablecer };
