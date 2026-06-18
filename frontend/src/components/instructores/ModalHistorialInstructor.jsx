/**
 * components/instructores/ModalHistorialInstructor.jsx
 * Responsabilidad : Modal de historial de asignaciones de grupos de un instructor.
 * Exporta         : ModalHistorialInstructor (default)
 * Usado en        : pages/admin/Instructores.jsx
 * Depende de      : components/common/EstadoBadge.jsx, components/common/Icon.jsx,
 *                   utils/fecha.js
 */
import s from '../../pages/admin/Instructores.module.css';
import { GrpEstadoBadge } from '../common/EstadoBadge.jsx';
import Icon from '../common/Icon.jsx';
import { formatearFecha, formatearFechaHora } from '../../utils/fecha.js';

export default function ModalHistorialInstructor({
  instructor,
  historial,
  cargando,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-lg ${s.modalHistorial}`}>
        <div className="modal-title">Historial — {instructor.nombre_completo}</div>

        {cargando ? (
          <div className="loading-wrap"><div className="spinner" /><p>Cargando...</p></div>
        ) : historial.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="calendar" size={22} /></div>
            <div className="empty-text">Sin asignaciones registradas</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha asignación</th>
                <th>Grupo</th>
                <th>Curso</th>
                <th>Período</th>
                <th>Estado</th>
                <th>Asignado por</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id}>
                  <td className={s.histFecha}>
                    {formatearFechaHora(h.fecha_asignacion)}
                  </td>
                  <td className={s.histNombre}>{h.grupo_nombre}</td>
                  <td className={s.histCurso}>{h.curso_nombre}</td>
                  <td className={s.histFechaRango}>
                    {formatearFecha(h.fecha_inicio)} → {formatearFecha(h.fecha_fin)}
                  </td>
                  <td><GrpEstadoBadge estado={h.grupo_estado} /></td>
                  <td className={s.histHoras}>{h.asignado_por_nombre || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
