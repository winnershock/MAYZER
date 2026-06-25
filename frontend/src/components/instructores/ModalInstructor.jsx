import { useState } from 'react';
import { InstructorService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import { onChangeTelefono } from '../../utils/validaciones.js';
import s from './ModalInstructor.module.css';
const VACIO = {
  nombre_completo: '', email: '', nombre_usuario: '', contrasena: '',
  especialidad: '', experiencia_anios: 0, horas_maximas: 40, telefono: '',
  color: '', activo: true,
};

export default function ModalInstructor({ onClose, onDone, base, modo = 'crear' }) {
  const esEdicion = modo === 'editar';

  const [form, setForm] = useState(() => {
    if (!base) return { ...VACIO };
    return {
      nombre_completo:   base.nombre_completo  || '',
      email:             base.email            || '',
      nombre_usuario:    base.nombre_usuario   || '',
      contrasena:        '',
      especialidad:      base.especialidad     || '',
      experiencia_anios: base.experiencia_anios ?? 0,
      horas_maximas:     base.horas_maximas    || 40,
      telefono:          base.telefono         || '',
      color:             base.color            || '',
      activo:            base.activo !== false,
    };
  });

  const [cargando, setCargando] = useState(false);
  const toast = useToast();

  const cambiar = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  async function guardar() {
    if (!form.nombre_completo || !form.email) {
      toast('Nombre y email son obligatorios', 'warn');
      return;
    }
    if (!esEdicion && (!form.nombre_usuario || !form.contrasena)) {
      toast('Usuario y contraseña son obligatorios', 'warn');
      return;
    }
    setCargando(true);
    try {
      if (esEdicion) {
        await InstructorService.editar(base.id, form);
        toast('Instructor actualizado correctamente', 'sena');
      } else {
        await InstructorService.crear(form);
        toast('Instructor creado correctamente', 'sena');
      }
      onDone();
    } catch (e) {
      toast(e.response?.data?.error || 'Error al guardar', 'danger');
    } finally { setCargando(false); }
  }

  const titulo =
    esEdicion     ? `Editar instructor: ${base.nombre_completo}` :
                    'Agregar instructor';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-title">{titulo}</div>

        {esEdicion && (
          <div className={`alert alert-info ${s['alert-mb']}`}>
            Deja el campo <strong>contraseña</strong> vacío para no modificarla.
          </div>
        )}

        <div className="form-grid">
          <div className="form-group form-full">
            <label>Nombre completo <span className="required">*</span></label>
            <input name="nombre_completo" value={form.nombre_completo} onChange={cambiar}
              placeholder="Ej: Carlos Andrés Gómez" />
          </div>
          <div className="form-group">
            <label>Email institucional <span className="required">*</span></label>
            <input type="email" name="email" value={form.email} onChange={cambiar}
              placeholder="instructor@sena.edu.co" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: onChangeTelefono(e) }))}
              placeholder="3100000000" inputMode="numeric" maxLength={10} />
          </div>

          {esEdicion && (
            <div className="form-group">
              <label>Nombre de usuario</label>
              <input value={form.nombre_usuario} disabled readOnly
                className={s['input-readonly']} />
            </div>
          )}

          {!esEdicion && (
            <>
              <div className="form-group">
                <label>Usuario para login <span className="required">*</span></label>
                <input name="nombre_usuario" value={form.nombre_usuario} onChange={cambiar}
                  placeholder="carlos.gomez" />
              </div>
              <div className="form-group">
                <label>Contraseña inicial <span className="required">*</span></label>
                <input type="password" name="contrasena" value={form.contrasena} onChange={cambiar}
                  placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </div>
            </>
          )}

          {esEdicion && (
            <div className="form-group form-full">
              <label>Nueva contraseña <span className={s['label-opcional']}>(opcional)</span></label>
              <input type="password" name="contrasena" value={form.contrasena} onChange={cambiar}
                placeholder="Dejar vacío para no cambiar" autoComplete="new-password" />
            </div>
          )}

          <div className="form-group form-full">
            <label>Especialidad</label>
            <input name="especialidad" value={form.especialidad} onChange={cambiar}
              placeholder="Ej: Seguridad y Salud en el Trabajo" />
          </div>
          <div className="form-group">
            <label>Años de experiencia</label>
            <input type="number" name="experiencia_anios" value={form.experiencia_anios}
              onChange={cambiar} min="0" />
          </div>
          <div className="form-group">
            <label>Horas máximas semanales</label>
            <input type="number" name="horas_maximas" value={form.horas_maximas}
              onChange={cambiar} min="1" max="60" />
          </div>

          {esEdicion && (
            <div className={`form-group ${s['form-check-row']}`}>
              <label className={s['label-inline']}>
                <input type="checkbox" name="activo" checked={!!form.activo} onChange={cambiar}
                  className={s['input-check']} />
                Instructor activo
              </label>
            </div>
          )}
          <div className="form-group">
            <label>Color del instructor</label>
            <div className={s['color-row']}>
              <input
                type="color"
                name="color"
                value={form.color || '#4f8ef7'}
                onChange={cambiar}
                className={s['input-color']}
              />
              <span className={s['color-hint']}>
                {form.color || 'Sin color asignado'} — se usará en el calendario
              </span>
              {form.color && (
                <button
                  type="button"
                  className={s['btn-reset-color']}
                  onClick={() => setForm(p => ({ ...p, color: '' }))}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={cargando}>
            {cargando ? 'Guardando...' :
             esEdicion ? 'Guardar cambios' : 'Crear instructor'}
          </button>
        </div>
      </div>
    </div>
  );
}
