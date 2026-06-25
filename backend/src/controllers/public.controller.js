const fs   = require('fs');
const { pool, CAT } = require('../config/db');
const { cifrar, hashBusqueda } = require('../utils/crypto.utils');
const { handleError } = require('../utils/response.utils');
const { MAX_ASPIRANTES, validarEmpresa, validarAspirante } = require('../utils/validacion.reglas');

async function listarCursos(req, res) {
  try {
    const [filas] = await pool.execute(
      `SELECT id, nombre, descripcion, intensidad_horaria, requerimientos_inscripcion
       FROM curso WHERE activo = 1 AND deleted_at IS NULL ORDER BY nombre`
    );
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listarCursos', 'Error al cargar cursos');
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

async function insertarAspirante(conn, aspirante, indice, pdfMap, solicitudId, empresaId) {
  const archivoPdf     = pdfMap[String(indice)];
  const nombreCompleto = [
    aspirante.nombre1?.trim(), aspirante.nombre2?.trim(),
    aspirante.apellido1?.trim(), aspirante.apellido2?.trim(),
  ].filter(Boolean).join(' ');

  const [resultadoAsp] = await conn.execute(
    `INSERT INTO aspirante
       (solicitud_id, nombre1, nombre2, apellido1, apellido2, nombre_completo,
        tipo_documento, numero_documento, numero_documento_hash, email, telefono, fecha_nacimiento, estado_id, documento_pdf)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      solicitudId,
      aspirante.nombre1.trim(), aspirante.nombre2?.trim() || '',
      aspirante.apellido1.trim(), aspirante.apellido2?.trim() || '',
      nombreCompleto,
      aspirante.tipo_documento || 'CC',
      cifrar(aspirante.numero_documento.trim()),
      hashBusqueda(aspirante.numero_documento.trim()),
      cifrar(aspirante.email.trim()),
      cifrar(aspirante.telefono.trim()),
      aspirante.fecha_nacimiento,
      CAT.aspEstado.PENDIENTE,
      archivoPdf.filename,
    ]
  );
  const aspiranteId = resultadoAsp.insertId;

  const med = aspirante.medico || {};
  await conn.execute(
    `INSERT INTO aspirante_medico (aspirante_id, tipo_sangre, eps, arl, antecedentes, medicamentos)
     VALUES (?,?,?,?,?,?)`,
    [
      aspiranteId,
      med.tipo_sangre   || null,
      med.eps           ? cifrar(med.eps)           : null,
      med.arl           ? cifrar(med.arl)           : null,
      med.antecedentes  ? cifrar(med.antecedentes)  : null,
      med.medicamentos  ? cifrar(med.medicamentos)  : null,
    ]
  );

  const contacto = aspirante.contacto || {};
  if (contacto.nombre?.trim()) {
    await conn.execute(
      `INSERT INTO aspirante_contacto_emergencia
         (aspirante_id, nombre, telefono, telefono_emergencia2, telefono_emergencia3)
       VALUES (?,?,?,?,?)`,
      [
        aspiranteId,
        contacto.nombre.trim(),
        contacto.telefono?.trim()             || '',
        contacto.telefono_emergencia2?.trim() || null,
        contacto.telefono_emergencia3?.trim() || null,
      ]
    );
  }

  const laboral = aspirante.laboral || {};
  if (laboral.nivel_academico) {
    await conn.execute(
      `INSERT INTO aspirante_laboral
         (aspirante_id, empresa_id, nivel_academico, cargo, area_trabajo, sector, vinculacion)
       VALUES (?,?,?,?,?,?,?)`,
      [
        aspiranteId, empresaId,
        laboral.nivel_academico,
        laboral.cargo       || null,
        laboral.area_trabajo || null,
        laboral.sector      || null,
        laboral.vinculacion || null,
      ]
    );
  }
}

async function crearSolicitud(req, res) {
  let parsed;
  try { parsed = JSON.parse(req.body.data || '{}'); }
  catch { return res.status(400).json({ error: 'Datos JSON inválidos' }); }

  const { empresa, curso_id, aspirantes, tipo_entidad = 'empresa' } = parsed;

  const errorEmpresa = validarEmpresa(empresa, tipo_entidad, aspirantes);
  if (errorEmpresa) return res.status(400).json({ error: errorEmpresa });
  if (!curso_id)             return res.status(400).json({ error: 'Selecciona el curso' });
  if (!aspirantes?.length)   return res.status(400).json({ error: 'Debe incluir al menos un aspirante' });
  if (aspirantes.length > MAX_ASPIRANTES) return res.status(400).json({ error: `Máximo ${MAX_ASPIRANTES} aspirantes` });

  const pdfMap = {};
  for (const archivo of (req.files || [])) {
    const coincidencia = archivo.fieldname.match(/^pdf_(\d+)$/);
    if (coincidencia) pdfMap[coincidencia[1]] = archivo;
  }

  for (let i = 0; i < aspirantes.length; i++) {
    const error = validarAspirante(aspirantes[i], i, pdfMap);
    if (error) return res.status(400).json({ error });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let empresaId;
    const [filasEmpresa] = await conn.execute('SELECT id FROM empresa WHERE nit = ?', [empresa.nit.trim()]);
    if (filasEmpresa.length) {
      empresaId = filasEmpresa[0].id;
      await conn.execute(
        `UPDATE empresa
           SET nombre=?, email=?, telefono=?, nombre_contacto=?, cargo_contacto=?,
               ciudad_id=?, direccion=?, tipo_entidad=?
         WHERE id=?`,
        [
          empresa.nombre.trim(), empresa.email.trim(), empresa.telefono || null,
          empresa.nombre_contacto || null, empresa.cargo_contacto || null,
          Number(empresa.ciudad_id), empresa.direccion || null, tipo_entidad, empresaId,
        ]
      );
    } else {
      const [resultado] = await conn.execute(
        `INSERT INTO empresa
           (nombre, nit, email, telefono, nombre_contacto, cargo_contacto, ciudad_id, direccion, tipo_entidad)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          empresa.nombre.trim(), empresa.nit.trim(), empresa.email.trim(),
          empresa.telefono || null, empresa.nombre_contacto || null, empresa.cargo_contacto || null,
          Number(empresa.ciudad_id), empresa.direccion || null, tipo_entidad,
        ]
      );
      empresaId = resultado.insertId;
    }

    const [resultadoSolicitud] = await conn.execute(
      'INSERT INTO solicitud (empresa_id, curso_id, num_aspirantes, estado_id) VALUES (?,?,?,?)',
      [empresaId, Number(curso_id), aspirantes.length, CAT.solEstado.PENDIENTE]
    );
    const solicitudId = resultadoSolicitud.insertId;

    for (let i = 0; i < aspirantes.length; i++) {
      await insertarAspirante(conn, aspirantes[i], i, pdfMap, solicitudId, empresaId);
    }

    await conn.commit();
    res.status(201).json({
      mensaje: '✅ Solicitud enviada correctamente. SENA Palmira revisará los datos y notificará por correo.',
      solicitud_id: solicitudId,
      empresa: empresa.nombre.trim(),
      aspirantes: aspirantes.length,
    });
  } catch (e) {
    await conn.rollback();
    for (const archivo of (req.files || [])) {
      try { fs.unlinkSync(archivo.path); } catch {}
    }
    handleError(res, e, 'crearSolicitud', 'Error al procesar la solicitud. Intenta de nuevo.');
  } finally {
    conn.release();
  }
}

module.exports = { listarCursos, listarCiudades, crearSolicitud };
