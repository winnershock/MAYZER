import s from '../../pages/admin/Instructores.module.css';
import BarraHoras from './BarraHoras.jsx';
import Icon from '../common/Icon.jsx';

export default function ModalTodosInstructores({
  instructores,
  onEditar,
  onHistorial,
  onEliminar,
  onClose,
}) {
  const total = instructores.length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-lg ${s.modalSeleccion}`}>
        <div className="modal-title">Todos los instructores registrados</div>
        <p className={s.modalSeleccionSubtitle}>
          {total} instructor{total !== 1 ? 'es' : ''} en total — incluye quienes no tienen grupos en el mes seleccionado.
        </p>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Especialidad</th>
              <th className={s.colCentro}>Exp.</th>
              <th>Horas / máx.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {instructores.map(i => (
              <tr key={i.id}>
                <td><strong>{i.nombre_completo}</strong></td>
                <td className={s.celdaEmailSel}>{i.email}</td>
                <td className={s.celdaEspSel}>{i.especialidad || '–'}</td>
                <td className={s.celdaExp}>
                  {i.experiencia_anios} año{i.experiencia_anios !== 1 ? 's' : ''}
                </td>
                <td>
                  <BarraHoras
                    asignadas={Number(i.horas_asignadas) || 0}
                    maximas={Number(i.horas_maximas) || 40}
                  />
                </td>
                <td>
                  <div className={`td-actions ${s.tdAccionesSel}`}>
                    <button
                      title={i.color ? `Color: ${i.color} — clic para cambiar` : 'Sin color — clic para asignar'}
                      onClick={() => onEditar(i)}
                      className={s.colorSwatch}
                      style={{
                        background: i.color || 'var(--bg2)',
                        border: `2px solid ${i.color ? 'rgba(0,0,0,0.18)' : 'var(--border2)'}`,
                      }}
                    />
                    <button className="btn btn-sm btn-primary" onClick={() => onEditar(i)}>
                      <Icon name="edit" size={12} /> Editar
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => onHistorial(i)}>
                      <Icon name="clipboard" size={13} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => onEliminar(i)}>
                      <Icon name="trash" size={13} /> Desactivar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
