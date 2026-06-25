import { useState, useEffect } from 'react';
import s from './ModalDetalleGrupo.module.css';
import { GrupoService } from '../../services';
import { formatearFecha } from '../../utils/fecha.js';

export default function ModalDetalleGrupo({ grupoId, onClose }) {
  const [grupo, setGrupo] = useState(null);

  useEffect(() => {
    GrupoService.obtener(grupoId).then(r => setGrupo(r.data)).catch(() => {});
  }, [grupoId]);

  if (!grupo) return (
    <div className="modal-overlay">
      <div className="modal"><div className="loading-wrap"><div className="spinner" /></div></div>
    </div>
  );

  const campos = [
    ['Curso',      grupo.curso_nombre],
    ['Instructor', grupo.instructor_nombre],
    ['Inicio',     formatearFecha(grupo.fecha_inicio)],
    ['Fin',        formatearFecha(grupo.fecha_fin)],
    ['Lugar',      grupo.lugar_nombre || 'No especificado'],
    ['Cupo',       `${grupo.inscritos || 0} / ${grupo.cupo_maximo} inscritos`],
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-title">{grupo.nombre}</div>

        <div className={s['datos-grid']}>
          {campos.map(([k, v]) => (
            <div key={k} className={s['dato-box']}>
              <div className={s['dato-key']}>{k}</div>
              <div className={s['dato-val']}>{v || '–'}</div>
            </div>
          ))}
        </div>

        <div className={s['asp-seccion-titulo']}>
          Aspirantes inscritos ({grupo.aspirantes?.length || 0})
        </div>

        {!grupo.aspirantes?.length ? (
          <div className="alert alert-warn">Sin aspirantes asignados todavía.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Nombre</th><th>Curso</th><th>Estado inscripción</th></tr>
            </thead>
            <tbody>
              {grupo.aspirantes.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.nombre_completo}</strong></td>
                  <td>{a.curso_requerido}</td>
                  <td><span className="badge badge-sena">{a.estado}</span></td>
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
