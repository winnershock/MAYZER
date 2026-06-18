/**
 * components/solicitudes/ModalSolicitud.jsx
 * Responsabilidad : Modal de detalle y cambio de estado de una solicitud de formación.
 * Exporta         : ModalSolicitud (default)
 * Usado en        : pages/admin/Solicitudes.jsx
 * Depende de      : services/index.js, hooks/useToast.jsx,
 *                   components/common/EstadoBadge.jsx, components/common/TipoEntidadBadge.jsx
 */

import { useState, useEffect } from 'react';
import { SolicitudService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import { SolEstadoBadge, AspEstadoBadge } from '../common/EstadoBadge.jsx';

import TipoEntidadBadge from '../common/TipoEntidadBadge.jsx';
import s from './ModalSolicitud.module.css';

export default function ModalSolicitud({ id, onClose, onUpdate }) {
  const [sol, setSol] = useState(null);
  const toast = useToast();

  useEffect(() => {
    SolicitudService.obtener(id).then(r => setSol(r.data)).catch(() => {});
  }, [id]);

  async function cambiarEstado(estado) {
    try {
      await SolicitudService.cambiarEstado(id, estado);
      toast('Estado actualizado correctamente', 'sena');
      onUpdate();
      onClose();
    } catch (e) {
      toast(e.response?.data?.error || 'Error al actualizar', 'danger');
    }
  }

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
