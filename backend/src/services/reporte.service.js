const { pool }                  = require('../config/db');
const { descifrar }             = require('../utils/crypto.utils');

const TIPOS_VALIDOS = new Set(['aspirantes', 'solicitudes', 'grupos', 'empresas', 'aspirantes_empresa']);

function esTipoValido(tipo) {
  return TIPOS_VALIDOS.has(tipo);
}

async function consultarAspirantes(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT a.nombre_completo, a.tipo_documento,
            ae.nombre AS estado,
            e.nombre  AS empresa, e.nit,
            c.nombre  AS curso,
            DATE_FORMAT(a.created_at, '%d/%m/%Y') AS fecha_solicitud,
            g.nombre  AS grupo_asignado,
            a.motivo_rechazo
     FROM aspirante a
     JOIN aspirante_estado ae ON a.estado_id    = ae.id
     JOIN solicitud        s  ON a.solicitud_id = s.id
     JOIN empresa          e  ON s.empresa_id   = e.id
     JOIN curso            c  ON s.curso_id     = c.id
     LEFT JOIN inscripcion i  ON i.aspirante_id = a.id
     LEFT JOIN grupo       g  ON i.grupo_id     = g.id
     WHERE 1=1 ${filtro} ORDER BY a.created_at DESC`,
    params
  );
  return filas;
}

async function consultarSolicitudes(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT e.nombre AS empresa, e.nit, e.tipo_entidad AS sector,
            c.nombre AS curso,
            se.nombre AS estado,
            DATE_FORMAT(s.created_at, '%d/%m/%Y') AS fecha,
            COUNT(a.id) AS aspirantes
     FROM solicitud s
     JOIN empresa          e  ON s.empresa_id  = e.id
     JOIN curso            c  ON s.curso_id    = c.id
     JOIN solicitud_estado se ON s.estado_id   = se.id
     LEFT JOIN aspirante   a  ON a.solicitud_id = s.id
     WHERE s.deleted_at IS NULL ${filtro}
     GROUP BY s.id ORDER BY s.created_at DESC`,
    params
  );
  return filas;
}

async function consultarGrupos(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT g.nombre AS grupo, c.nombre AS curso,
            u.nombre_completo AS instructor, ge.nombre AS estado,
            g.cupo_maximo, COUNT(i.id) AS inscritos,
            DATE_FORMAT(g.fecha_inicio, '%d/%m/%Y') AS inicio,
            DATE_FORMAT(g.fecha_fin,    '%d/%m/%Y') AS fin,
            l.nombre AS lugar
     FROM grupo g
     JOIN grupo_estado ge ON g.estado_id     = ge.id
     JOIN curso        c  ON g.curso_id      = c.id
     JOIN instructor  ins ON g.instructor_id = ins.id
     JOIN usuario      u  ON ins.usuario_id  = u.id
     LEFT JOIN inscripcion i ON i.grupo_id   = g.id
     LEFT JOIN lugar      l  ON g.lugar_id   = l.id
     WHERE g.deleted_at IS NULL ${filtro}
     GROUP BY g.id ORDER BY g.created_at DESC`,
    params
  );
  return filas;
}

async function consultarEstadisticasAspirantes(filtro, params) {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(estado_id=1) AS pendientes,
            SUM(estado_id=2) AS pre_aprobados, SUM(estado_id=3) AS asignados,
            SUM(estado_id=4) AS rechazados
     FROM aspirante a WHERE 1=1 ${filtro}`,
    params
  );
  return stats;
}

async function consultarEstadisticasSolicitudes(filtro, params) {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(estado_id=1) AS pendientes,
            SUM(estado_id=3) AS aprobadas, SUM(estado_id=4) AS rechazadas
     FROM solicitud s WHERE deleted_at IS NULL ${filtro}`,
    params
  );
  return stats;
}

async function consultarEstadisticasGrupos(filtro, params) {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(estado_id=1) AS programados,
            SUM(estado_id=2) AS en_curso, SUM(estado_id=3) AS finalizados
     FROM grupo g WHERE deleted_at IS NULL ${filtro}`,
    params
  );
  return stats;
}

async function consultarAspirantesDetalle(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT
        a.id,
        a.nombre_completo,
        a.nombre1, a.nombre2, a.apellido1, a.apellido2,
        a.tipo_documento,
        a.numero_documento,
        a.email,
        a.telefono,
        a.fecha_nacimiento,
        a.estado_id,
        a.motivo_rechazo,
        a.documento_pdf,
        a.created_at,
        ae.nombre  AS estado_nombre,
        e.nombre   AS empresa, e.nit, e.tipo_entidad, e.email AS email_empresa,
        c.nombre   AS curso_nombre,
        s.id       AS solicitud_id,
        g.nombre   AS grupo_nombre,
        i.grupo_id,
        MONTH(a.created_at) AS mes_num,
        YEAR(a.created_at)  AS anio_num
     FROM aspirante a
     JOIN aspirante_estado ae ON a.estado_id    = ae.id
     JOIN solicitud        s  ON a.solicitud_id = s.id
     JOIN empresa          e  ON s.empresa_id   = e.id
     JOIN curso            c  ON s.curso_id     = c.id
     LEFT JOIN inscripcion i  ON i.aspirante_id = a.id
     LEFT JOIN grupo       g  ON i.grupo_id     = g.id
     WHERE 1=1 ${filtro} ORDER BY a.created_at ASC`,
    params
  );

  return filas.map(f => ({
    ...f,
    numero_documento: descifrar(f.numero_documento) || '',
    email:            descifrar(f.email)            || '',
    telefono:         descifrar(f.telefono)         || '',
  }));
}

async function consultarMesesConDatos(anio) {
  const anioNum = Number(anio);
  const [filas] = await pool.execute(
    `SELECT DISTINCT MONTH(created_at) AS mes
     FROM aspirante
     WHERE created_at >= ? AND created_at < ?
     ORDER BY mes ASC`,
    [`${anioNum}-01-01`, `${anioNum + 1}-01-01`]
  );
  return filas.map(f => f.mes);
}

async function consultarResumenEstados(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT ae.nombre AS estado, COUNT(*) AS total
     FROM aspirante a
     JOIN aspirante_estado ae ON a.estado_id = ae.id
     WHERE 1=1 ${filtro}
     GROUP BY ae.id, ae.nombre ORDER BY total DESC`,
    params
  );
  return filas;
}

async function consultarResumenCursos(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT c.nombre AS curso, COUNT(a.id) AS total
     FROM aspirante a
     JOIN solicitud s ON a.solicitud_id = s.id
     JOIN curso     c ON s.curso_id     = c.id
     WHERE 1=1 ${filtro}
     GROUP BY c.id, c.nombre ORDER BY total DESC`,
    params
  );
  return filas;
}

async function consultarResumenEmpresas(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT e.nombre AS empresa, e.nit, e.tipo_entidad, COUNT(a.id) AS aspirantes
     FROM aspirante a
     JOIN solicitud s ON a.solicitud_id = s.id
     JOIN empresa   e ON s.empresa_id   = e.id
     WHERE 1=1 ${filtro}
     GROUP BY e.id ORDER BY aspirantes DESC LIMIT 20`,
    params
  );
  return filas;
}

async function consultarEmpresasDetalle(filtro, params) {
  // filtro/params actúan sobre s.created_at (vía EXISTS) para acotar por periodo
  // sin distorsionar los conteos cuando no se filtra.
  const tieneFiltro = !!filtro;
  const where = tieneFiltro
    ? `WHERE e.deleted_at IS NULL AND EXISTS (
         SELECT 1 FROM solicitud s2 WHERE s2.empresa_id = e.id ${filtro.replace(/\bs\./g, 's2.')}
       )`
    : 'WHERE e.deleted_at IS NULL';
  const joinSolicitud = tieneFiltro ? `s.empresa_id = e.id ${filtro}` : 's.empresa_id = e.id';

  const [filas] = await pool.execute(
    `SELECT e.id, e.nombre, e.nit, e.tipo_entidad, e.email, e.telefono,
            e.nombre_contacto, e.cargo_contacto, e.direccion, e.activo,
            ci.nombre AS ciudad, ci.departamento,
            DATE_FORMAT(e.created_at, '%d/%m/%Y') AS fecha_registro,
            COUNT(DISTINCT s.id) AS total_solicitudes,
            COUNT(DISTINCT a.id) AS total_aspirantes
     FROM empresa e
     LEFT JOIN ciudad    ci ON e.ciudad_id    = ci.id
     LEFT JOIN solicitud s  ON ${joinSolicitud}
     LEFT JOIN aspirante a  ON a.solicitud_id = s.id
     ${where}
     GROUP BY e.id ORDER BY e.nombre`,
    tieneFiltro ? [...params, ...params] : params
  );
  return filas;
}

async function consultarAspirantesEmpresaDetalle(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT a.nombre_completo,
            a.nombre1, a.nombre2, a.apellido1, a.apellido2,
            a.tipo_documento, a.numero_documento,
            a.email, a.telefono,
            DATE_FORMAT(a.fecha_nacimiento, '%d/%m/%Y') AS fecha_nacimiento,
            ae.nombre AS estado,
            c.nombre  AS curso,
            DATE_FORMAT(a.created_at, '%d/%m/%Y') AS fecha_solicitud,
            g.nombre  AS grupo_asignado,
            e.nombre  AS empresa, e.nit, e.tipo_entidad,
            e.email AS empresa_email, e.telefono AS empresa_telefono,
            e.nombre_contacto, e.cargo_contacto, e.direccion,
            ci.nombre AS ciudad, ci.departamento
     FROM aspirante a
     JOIN aspirante_estado ae ON a.estado_id    = ae.id
     JOIN solicitud        s  ON a.solicitud_id = s.id
     JOIN empresa          e  ON s.empresa_id   = e.id
     JOIN curso            c  ON s.curso_id     = c.id
     LEFT JOIN ciudad      ci ON e.ciudad_id    = ci.id
     LEFT JOIN inscripcion i  ON i.aspirante_id = a.id
     LEFT JOIN grupo       g  ON i.grupo_id     = g.id
     WHERE 1=1 ${filtro} ORDER BY e.nombre, a.nombre_completo`,
    params
  );
  return filas.map(f => ({
    ...f,
    numero_documento: descifrar(f.numero_documento) || '',
    email:            descifrar(f.email)            || '',
    telefono:         descifrar(f.telefono)         || '',
  }));
}

module.exports = {
  esTipoValido,
  consultarAspirantes,
  consultarSolicitudes,
  consultarGrupos,
  consultarEmpresasDetalle,
  consultarAspirantesEmpresaDetalle,
  consultarEstadisticasAspirantes,
  consultarEstadisticasSolicitudes,
  consultarEstadisticasGrupos,
  consultarAspirantesDetalle,
  consultarMesesConDatos,
  consultarResumenEstados,
  consultarResumenCursos,
  consultarResumenEmpresas,
};
