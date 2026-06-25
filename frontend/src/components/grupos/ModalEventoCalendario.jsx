import { useState, useEffect } from 'react';
import { EventoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import Icon from '../common/Icon.jsx';
import s from './ModalEventoCalendario.module.css';

const FORM_VACIO = {
  grupo_id: '', titulo: '', fecha_inicio: '', fecha_fin: '',
  hora_inicio: '08:00', hora_fin: '12:00', lugar_id: '', observaciones: '',
};

export default function ModalEventoCalendario({
  evento,
  grupos, lugares,
  onClose, onDone,
  fechaInicio = '',
  fechaFin    = '',
  fechasDiscontinuas = null,
}) {
  const esEdicion     = !!evento?.id;
  const esDiscontinuo = !esEdicion && Array.isArray(fechasDiscontinuas) && fechasDiscontinuas.length > 1;

  const [form, setForm] = useState(() => {
    if (esEdicion) {
      return { ...FORM_VACIO, ...evento,
        grupo_id: evento.grupo_id || '',
        lugar_id: evento.lugar_id || '' };
    }
    return { ...FORM_VACIO, fecha_inicio: fechaInicio, fecha_fin: fechaFin || fechaInicio };
  });

  const [cargando, setCargando] = useState(false);
  const toast = useToast();

  const cambiar = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (form.grupo_id && !esEdicion) {
      const g = grupos.find(x => String(x.id) === String(form.grupo_id));
      if (g) setForm(p => ({
        ...p,
        titulo:   `Clase – ${g.nombre}`,
        lugar_id: g.lugar_id || p.lugar_id,
      }));
    }
  }, [form.grupo_id]);

  async function guardar() {
    if (!form.grupo_id || !form.titulo || !form.fecha_inicio
        || !form.hora_inicio || !form.hora_fin) {
      toast('Completa todos los campos obligatorios', 'warn'); return;
    }
    if (!esDiscontinuo && form.fecha_fin < form.fecha_inicio) {
      toast('La fecha de fin no puede ser anterior al inicio', 'warn'); return;
    }
    if (form.hora_fin <= form.hora_inicio) {
      toast('La hora de fin debe ser posterior al inicio', 'warn'); return;
    }

    setCargando(true);
    try {
      if (esDiscontinuo) {
        for (const fecha of fechasDiscontinuas) {
          await EventoService.crear({
            grupo_id:     form.grupo_id,
            titulo:       form.titulo,
            fecha_inicio: fecha,
            fecha_fin:    fecha,
            hora_inicio:  form.hora_inicio,
            hora_fin:     form.hora_fin,
            lugar_id:     form.lugar_id    || null,
            observaciones: form.observaciones || null,
          });
        }
        toast(`${fechasDiscontinuas.length} clases programadas correctamente`, 'sena');
      } else {
        const payload = {
          grupo_id:     form.grupo_id,
          titulo:       form.titulo,
          fecha_inicio: form.fecha_inicio,
          fecha_fin:    form.fecha_fin,
          hora_inicio:  form.hora_inicio,
          hora_fin:     form.hora_fin,
          lugar_id:     form.lugar_id    || null,
          observaciones: form.observaciones || null,
        };
        if (esEdicion) await EventoService.actualizar(evento.id, payload);
        else           await EventoService.crear(payload);
        toast(esEdicion ? 'Clase actualizada' : 'Clase programada correctamente', 'sena');
      }
      onDone();
    } catch (e) {
      toast(e.response?.data?.error || 'Error al guardar', 'danger');
    } finally { setCargando(false); }
  }

  const diasRango = (() => {
    if (!form.fecha_inicio || !form.fecha_fin || esDiscontinuo) return 0;
    const a = new Date(form.fecha_inicio + 'T00:00:00');
    const b = new Date(form.fecha_fin    + 'T00:00:00');
    return Math.max(0, Math.round((b - a) / 86400000)) + 1;
  })();

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className={`modal-title ${s['modal-title-mb']}`}>
          {esEdicion ? 'Editar clase' : 'Programar nueva clase'}
        </div>

        {!esEdicion && (esDiscontinuo ? (
          <div className={s['indicator-brand']}>
            <Icon name="calendar" size={16} />
            <span>
              Días seleccionados: <strong>{fechasDiscontinuas.join(', ')}</strong>
              {' · '}Se creará <strong>una clase por cada día</strong>
            </span>
          </div>
        ) : form.fecha_inicio ? (
          <div
            className={s['indicator-base']}
            style={{
              background: diasRango > 1 ? 'var(--brand-light)' : 'var(--blue-bg)',
              border: `1px solid ${diasRango > 1 ? 'rgba(255,103,25,.25)' : 'var(--blue-border)'}`,
              color: diasRango > 1 ? 'var(--brand-text)' : 'var(--blue)',
            }}
          >
            <Icon name="calendar" size={16} />
            <span>
              {diasRango > 1
                ? <>Rango seleccionado: <strong>{form.fecha_inicio}</strong> → <strong>{form.fecha_fin}</strong> · <strong>{diasRango} días</strong></>
                : <>Día seleccionado: <strong>{form.fecha_inicio}</strong></>
              }
            </span>
          </div>
        ) : null)}

        <div className="form-grid">
          <div className="form-group form-full">
            <label>Grupo <span className="required">*</span></label>
            <select name="grupo_id" value={form.grupo_id} onChange={cambiar}>
              <option value="">-- Selecciona el grupo --</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.nombre} · {g.curso_nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group form-full">
            <label>Título <span className="required">*</span></label>
            <input
              name="titulo" value={form.titulo} onChange={cambiar}
              placeholder="Ej: Clase – Trabajo en Alturas G01"
            />
          </div>

          {!esDiscontinuo && <>
            <div className="form-group">
              <label>Fecha de inicio <span className="required">*</span></label>
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={cambiar} />
            </div>
            <div className="form-group">
              <label>Fecha de fin <span className="required">*</span></label>
              <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={cambiar} />
            </div>
          </>}

          <div className="form-group">
            <label>Hora de inicio <span className="required">*</span></label>
            <input type="time" name="hora_inicio" value={form.hora_inicio} onChange={cambiar} />
          </div>
          <div className="form-group">
            <label>Hora de fin <span className="required">*</span></label>
            <input type="time" name="hora_fin" value={form.hora_fin} onChange={cambiar} />
          </div>

          <div className="form-group form-full">
            <label>Lugar / Aula</label>
            <select name="lugar_id" value={form.lugar_id} onChange={cambiar}>
              <option value="">-- Sin especificar --</option>
              {lugares.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nombre}{l.capacidad ? ` (cap. ${l.capacidad})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group form-full">
            <label>Observaciones</label>
            <textarea
              name="observaciones" value={form.observaciones || ''} onChange={cambiar}
              placeholder="Notas para el instructor..."
              className={s['textarea-obs']}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={cargando}>
            {cargando
              ? 'Guardando...'
              : esEdicion
                ? 'Guardar cambios'
                : esDiscontinuo
                  ? `Programar ${fechasDiscontinuas.length} clases`
                  : diasRango > 1
                    ? `Programar (${diasRango} días)`
                    : 'Programar clase'}
          </button>
        </div>
      </div>
    </div>
  );
}
