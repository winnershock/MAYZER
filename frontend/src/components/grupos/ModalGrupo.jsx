/**
 * components/grupos/ModalGrupo.jsx
 * Responsabilidad : Modal de creación y edición de grupos de formación.
 * Exporta         : ModalGrupo (default)
 * Usado en        : pages/admin/Grupos.jsx
 * Depende de      : services/index.js, hooks/useToast.jsx
 */

import { useState, useEffect } from 'react';
import { GrupoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import s from './ModalGrupo.module.css';

const FORM_VACIO = {
  nombre:'', curso_id:'', instructor_id:'', cupo_maximo:30,
  fecha_inicio:'', fecha_fin:'', lugar_id:'',
  observaciones:'', estado:'PROGRAMADO',
};

export default function ModalGrupo({ grupo, cursos, instructores, lugares, onClose, onDone }) {
  const [form, setForm] = useState(() => {
    if (grupo) {
      return {
        ...FORM_VACIO, ...grupo,
        curso_id:     String(grupo.curso_id     || ''),
        instructor_id: String(grupo.instructor_id || ''),
        lugar_id:      String(grupo.lugar_id      || ''),
        estado: grupo.estado || 'PROGRAMADO',
      };
    }
    return { ...FORM_VACIO };
  });
  const [siguienteNumero, setSiguienteNumero] = useState(1);
  const [cargando, setCargando] = useState(false);
  const toast = useToast();
  const cambiar = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  // Al abrir en modo crear, calcular siguiente número desde g.codigo
  useEffect(() => {
    if (!grupo) {
      GrupoService.listar({ limit: 500 }).then(r => {
        const raw  = r.data;
        const lista = Array.isArray(raw) ? raw : (raw?.grupos ?? []);
        const max = lista.reduce((acc, g) => Math.max(acc, Number(g.codigo) || 0), 0);
        setSiguienteNumero(max + 1);
      }).catch(() => {});
    }
  }, [grupo]);

  async function guardar() {
    const nombre = (form.nombre || '').trim();
    if (!nombre || !form.curso_id || !form.instructor_id || !form.fecha_inicio || !form.fecha_fin) {
      toast('Completa todos los campos obligatorios', 'warn'); return;
    }
    if (form.fecha_fin < form.fecha_inicio) {
      toast('La fecha de fin no puede ser antes del inicio', 'warn'); return;
    }
    const codigo = grupo ? grupo.codigo : siguienteNumero;
    const payload = { ...form, nombre, codigo };
    setCargando(true);
    try {
      if (grupo) {
        await GrupoService.actualizar(grupo.id, payload);
        toast('Grupo actualizado correctamente', 'sena');
      } else {
        await GrupoService.crear(payload);
        toast('Grupo creado correctamente', 'sena');
      }
      onDone?.();
      onClose();
    } catch (e) {
      toast(e.response?.data?.error || 'Error al guardar', 'danger');
    } finally { setCargando(false); }
  }

  const codigoMostrar = grupo ? grupo.codigo : siguienteNumero;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-title">{grupo ? 'Editar grupo' : 'Nuevo grupo'}</div>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Nombre del grupo <span className="required">*</span></label>
            <div className={s['nombre-row']}>
              <span className={s['codigo-prefix']}>
                Grupo {codigoMostrar} —
              </span>
              <input
                name="nombre"
                value={form.nombre}
                onChange={cambiar}
                placeholder="Ej: ADS 2025"
                className={s['nombre-input']}
              />
            </div>
            <small className={s['form-hint']}>
              Se guardará como: código <strong>{codigoMostrar}</strong>, nombre <strong>{form.nombre || '…'}</strong>
            </small>
          </div>
          <div className="form-group">
            <label>Curso <span className="required">*</span></label>
            <select name="curso_id" value={form.curso_id} onChange={cambiar}>
              <option value="">-- Selecciona el curso --</option>
              {cursos.map(c=><option key={c.id} value={String(c.id)}>{c.nombre} ({c.intensidad_horaria}h)</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Instructor <span className="required">*</span></label>
            <select name="instructor_id" value={form.instructor_id} onChange={cambiar}>
              <option value="">-- Selecciona el instructor --</option>
              {instructores.map(i=><option key={i.id} value={String(i.id)}>{i.nombre_completo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fecha inicio <span className="required">*</span></label>
            <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={cambiar}/>
          </div>
          <div className="form-group">
            <label>Fecha fin <span className="required">*</span></label>
            <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={cambiar}/>
          </div>
          <div className="form-group">
            <label>Cupo máximo</label>
            <input type="number" name="cupo_maximo" value={form.cupo_maximo} onChange={cambiar} min="1" max="100"/>
          </div>
          <div className="form-group">
            <label>Lugar</label>
            <select name="lugar_id" value={form.lugar_id} onChange={cambiar}>
              <option value="">-- Sin lugar asignado --</option>
              {lugares.map(l=><option key={l.id} value={String(l.id)}>{l.nombre}</option>)}
            </select>
          </div>
          {grupo && (
            <div className="form-group">
              <label>Estado</label>
              <select name="estado" value={form.estado} onChange={cambiar}>
                {['PROGRAMADO','EN_CURSO','FINALIZADO'].map(s=>(
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group form-full">
            <label>Observaciones</label>
            <textarea name="observaciones" value={form.observaciones||''} onChange={cambiar} rows={2} placeholder="Notas adicionales..."/>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={cargando}>
            {cargando ? 'Guardando...' : grupo ? 'Guardar cambios' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}
