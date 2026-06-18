/**
 * components/cursos/ModalCurso.jsx
 * Responsabilidad : Modal de creación y edición de cursos del catálogo.
 * Exporta         : ModalCurso (default)
 * Usado en        : pages/admin/Cursos.jsx
 * Depende de      : services/index.js, hooks/useToast.jsx
 */
import { useState } from 'react';
import { CursoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';

const VACIO = {
  nombre: '', descripcion: '', requerimientos_inscripcion: '',
  intensidad_horaria: 16,
};

export default function ModalCurso({ curso, onClose, onDone }) {
  const [form,     setForm]     = useState(curso || VACIO);
  const [cargando, setCargando] = useState(false);
  const toast = useToast();

  const cambiar = e => setForm(p => ({
    ...p,
    [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  async function guardar() {
    if (!form.nombre || !form.intensidad_horaria) {
      toast('Nombre e intensidad horaria son obligatorios', 'warn');
      return;
    }
    setCargando(true);
    try {
      if (curso) await CursoService.actualizar(curso.id, form);
      else       await CursoService.crear(form);
      toast(curso ? 'Curso actualizado' : 'Curso creado correctamente', 'sena');
      onDone();
    } catch (e) {
      // Mensaje específico cuando el backend bloquea por grupos finalizados
      const mensaje = e.response?.data?.error
        || (e.response?.data?.codigo === 'CURSO_BLOQUEADO'
            ? 'Este curso no puede editarse porque tiene grupos finalizados asociados.'
            : 'Error al guardar el curso');
      toast(mensaje, 'danger');
    } finally { setCargando(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-title">{curso ? 'Editar curso' : 'Agregar curso'}</div>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Nombre del curso <span className="required">*</span></label>
            <input name="nombre" value={form.nombre} onChange={cambiar} placeholder="Ej: Trabajo en Alturas" />
          </div>
          <div className="form-group">
            <label>Intensidad horaria (horas) <span className="required">*</span></label>
            <input type="number" name="intensidad_horaria" value={form.intensidad_horaria} onChange={cambiar} min="1" />
          </div>
          <div className="form-group form-full">
            <label>Descripción</label>
            <textarea name="descripcion" value={form.descripcion || ''} onChange={cambiar} placeholder="Descripción del contenido del curso..." />
          </div>
          <div className="form-group form-full">
            <label>Requisitos de inscripción</label>
            <textarea name="requerimientos_inscripcion" value={form.requerimientos_inscripcion || ''} onChange={cambiar} placeholder="Ej: Documento de identidad, EPS vigente, Apto médico..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={guardar} disabled={cargando}>
            {cargando ? 'Guardando...' : curso ? 'Guardar cambios' : 'Crear curso'}
          </button>
        </div>
      </div>
    </div>
  );
}
