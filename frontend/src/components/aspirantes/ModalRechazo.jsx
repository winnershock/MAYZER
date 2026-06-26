
import { useState } from 'react';
import { AspiranteService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import s from './ModalRechazo.module.css';

export default function ModalRechazo({ aspirante, onClose, onDone }) {
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const toast = useToast();

  async function enviar() {
    if (motivo.trim().length < 10) { toast('El motivo debe tener al menos 10 caracteres', 'warn'); return; }
    setCargando(true);
    try {
      const { data } = await AspiranteService.rechazar(aspirante.id, motivo);
      if (data?.correoError) {
        toast('Aspirante rechazado, pero hubo un error al enviar el correo: ' + data.correoError, 'warn');
      } else if (data?.sinEmail) {
        toast('Aspirante rechazado. El solicitante no tiene correo registrado, no se envió notificación.', 'warn');
      } else {
        toast('Aspirante rechazado. Se envió correo de notificación al solicitante.', 'sena');
      }
      onDone();
    } catch (e) {
      toast(e.response?.data?.error || 'Error al rechazar', 'danger');
    } finally { setCargando(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Rechazar aspirante</div>
        <div className={`alert alert-warn ${s['alert-mb']}`}>
          Rechazando a <strong>{aspirante.nombre_completo}</strong>. Se enviará un correo automático con el motivo al solicitante.
        </div>
        <div className="form-group">
          <label>Motivo del rechazo <span className="required">*</span></label>
          <textarea value={motivo} onChange={e=>setMotivo(e.target.value)}
            placeholder="Explique el motivo (ej: documentación incompleta, no cumple requisitos de edad...)"
            className={s['textarea-motivo']}/>
          <small className={s['contador']}>{motivo.length} caracteres (mínimo 10)</small>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={enviar} disabled={cargando}>
            {cargando ? 'Enviando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  );
}
