
import { useState, useEffect } from 'react';
import { SolicitudService } from '../../services';
import { SolEstadoBadge, AspEstadoBadge } from '../common/EstadoBadge.jsx';

import TipoEntidadBadge from '../common/TipoEntidadBadge.jsx';
import s from './ModalSolicitud.module.css';

export default function ModalSolicitud({ id, onClose }) {
  const [sol, setSol] = useState(null);

  useEffect(() => {
    SolicitudService.obtener(id).then(r => setSol(r.data)).catch(() => {});
  }, [id]);

  if (!sol) return (
    <div className="modal-overlay">
      <div className="modal"><div className="loading-wrap"><div className="spinner" /></div></div>
    </div>
  );

  const filas = [
    { k: 'Tipo de solicitud', render: () => <TipoEntidadBadge tipo={sol.tipo_entidad} /> },
    { k: 'Empresa',           render: () => sol.empresa_nombre },
    { k: 'NIT',               render: () => sol.nit },
    { k: 'Email',             render: () => sol.empresa_email },
    { k: 'Teléfono',          render: () => sol.empresa_telefono || '–' },
    { k: 'Curso',             render: () => sol.curso_solicitado },
    { k: 'Estado',            render: () => <SolEstadoBadge estado={sol.estado} /> },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-title">Solicitud #{sol.id}</div>

        <div className={s['datos-grid']}>
          {filas.map(({ k, render }) => (
            <div key={k} className={s['dato-cell']}>
              <span className={s['dato-label']}>{k}:</span>
              {render()}
            </div>
          ))}
        </div>

        {sol.aspirantes?.length > 0 && (
          <div className={s['aspirantes-wrap']}>
            <div className={s['aspirantes-title']}>Aspirantes ({sol.aspirantes.length})</div>
            <table className={s['asp-tabla']}>
              <thead>
                <tr><th>Nombre</th><th>Documento</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {sol.aspirantes.map(a => (
                  <tr key={a.id}>
                    <td>{a.nombre_completo}</td>
                    <td className={s['td-mono']}>{a.tipo_documento}</td>
                    <td><AspEstadoBadge estado={a.estado_proceso} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={`modal-actions ${s['modal-actions-wrap']}`}>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
