/**
 * components/aspirantes/ModalDetalle.jsx
 * Responsabilidad : Modal de solo lectura con toda la información de un aspirante.
 * Exporta         : ModalDetalle (default)
 * Usado en        : pages/admin/Aspirantes.jsx
 * Depende de      : services/index.js, components/common/EstadoBadge.jsx,
 *                   components/common/Icon.jsx, constants/index.js, utils/fecha.js
 */
import { useState, useEffect } from 'react';
import { AspiranteService } from '../../services';
import { AspEstadoBadge } from '../common/EstadoBadge.jsx';
import Icon from '../common/Icon.jsx';
import { API_BASE } from '../../constants/index.js';
import { formatearFecha } from '../../utils/fecha.js';
import s from './ModalDetalle.module.css';

function Fila({ label, value, fullWidth }) {
  return (
    <div
      className={s['fila-row']}
      style={fullWidth ? { gridColumn: '1 / -1' } : undefined}
    >
      <span className={s['campo-label']}>{label}:</span>
      <span className={s['campo-valor']}>{value ?? '–'}</span>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div className={s.seccion}>
      <div className={s['seccion-titulo']}>{titulo}</div>
      <div className={s['campos-grid']}>
        {children}
      </div>
    </div>
  );
}

export default function ModalDetalle({ aspirante: aspiranteResumen, onClose }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    AspiranteService.verUno(aspiranteResumen.id)
      .then(r => setDatos(r.data))
      .catch(() => setError('No se pudieron cargar los datos completos.'))
      .finally(() => setCargando(false));
  }, [aspiranteResumen.id]);

  const a = datos || aspiranteResumen;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-lg ${s['modal-wide']}`}>
        <div className={`modal-title ${s['modal-title-row']}`}>
          <Icon name="user" size={18} />
          <span>{a.nombre_completo}</span>
          {datos && <AspEstadoBadge estado={datos.estado_proceso} />}
        </div>

        {cargando && <div className="loading-wrap"><div className="spinner" /></div>}
        {error    && <div className="alert alert-warn">{error}</div>}

        {!cargando && (
          <>
            <Seccion titulo="Identificación">
              <Fila label="Tipo documento"  value={a.tipo_documento} />
              <Fila label="N° documento"    value={a.numero_documento} />
              <Fila label="Nombre completo" value={a.nombre_completo} fullWidth />
              {a.fecha_nacimiento && (
                <Fila label="Fecha nacimiento" value={formatearFecha(a.fecha_nacimiento)} />
              )}
            </Seccion>

            <Seccion titulo="Contacto">
              <Fila label="Email"     value={a.email} />
              <Fila label="Teléfono"  value={a.telefono} />
            </Seccion>

            <Seccion titulo="Empresa y curso">
              <Fila label="Empresa"          value={a.empresa} />
              <Fila label="Curso solicitado" value={a.curso_requerido || a.curso_nombre} />
            </Seccion>

            {datos && (
              <>
                {datos.medico && (
                  <Seccion titulo="Datos médicos">
                    <Fila label="Tipo de sangre"  value={datos.medico.tipo_sangre} />
                    <Fila label="EPS"             value={datos.medico.eps} />
                    <Fila label="ARL"             value={datos.medico.arl} />
                    <Fila label="Antecedentes"    value={datos.medico.antecedentes} fullWidth />
                    <Fila label="Medicamentos"    value={datos.medico.medicamentos} fullWidth />
                  </Seccion>
                )}

                {datos.contacto && (
                  <Seccion titulo="Contacto de emergencia">
                    <Fila label="Nombre"      value={datos.contacto.nombre} />
                    <Fila label="Teléfono"    value={datos.contacto.telefono} />
                    {datos.contacto.telefono_emergencia2 && (
                      <Fila label="Teléfono 2" value={datos.contacto.telefono_emergencia2} />
                    )}
                    {datos.contacto.telefono_emergencia3 && (
                      <Fila label="Teléfono 3" value={datos.contacto.telefono_emergencia3} />
                    )}
                  </Seccion>
                )}

                {datos.laboral && (
                  <Seccion titulo="Datos laborales">
                    <Fila label="Nivel académico" value={datos.laboral.nivel_academico} />
                    <Fila label="Cargo"           value={datos.laboral.cargo} />
                    <Fila label="Área de trabajo" value={datos.laboral.area_trabajo} />
                    <Fila label="Sector"          value={datos.laboral.sector} />
                    <Fila label="Vinculación"     value={datos.laboral.vinculacion} />
                    {datos.laboral.empresa_nombre && (
                      <Fila label="Empresa laboral" value={datos.laboral.empresa_nombre} />
                    )}
                  </Seccion>
                )}

                {datos.nombre_grupo && (
                  <Seccion titulo="Asignación">
                    <Fila label="Grupo" value={datos.nombre_grupo} />
                    <Fila label="Curso" value={datos.curso_nombre} />
                  </Seccion>
                )}
              </>
            )}

            {(datos?.documento_pdf || a.documento_pdf) && (
              <div className={s['grupo-asignado']}>
                <a
                  href={API_BASE + '/uploads/documentos/' + (datos?.documento_pdf || a.documento_pdf)}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <Icon name="file-text" size={13} /> Ver documento PDF
                </a>
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
