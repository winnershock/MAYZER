import s from './SeccionCurso.module.css';
export default function SeccionCurso({ cursoId, cursos, onChange }) {
  const seleccionado = cursos.find(x => String(x.id) === String(cursoId));

  return (
    <div className="fp-card">
      <div className="fp-card-title">Curso solicitado para los aspirantes</div>
      <div className="fp-field">
        <label>Seleccione el curso de formación TSA <span className="req">*</span></label>
        <select value={cursoId} onChange={e => onChange(e.target.value)}>
          <option value="">Seleccione el curso de formación TSA...</option>
          {cursos.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.intensidad_horaria}h)
            </option>
          ))}
        </select>
      </div>
      {seleccionado?.descripcion && (
        <div className={s['curso-info-box']}>
          <strong>Descripción:</strong> {seleccionado.descripcion}
          {seleccionado.requerimientos_inscripcion && (
            <><br /><strong>Requisitos:</strong> {seleccionado.requerimientos_inscripcion}</>
          )}
        </div>
      )}
    </div>
  );
}
