import { onChangeTelefono, onChangeNit } from '../../utils/validaciones.js';

export default function SeccionEmpresa({ tipoEntidad, empresa, ciudades, onChange }) {
  const esPersona   = tipoEntidad === 'persona';
  const esGrupoSENA = tipoEntidad === 'grupo SENA';

  const labelNombre = esPersona ? 'Nombre completo' : esGrupoSENA ? 'Nombre del grupo' : 'Nombre de la empresa';
  const labelNit    = esPersona ? 'Número de documento' : esGrupoSENA ? 'Número de ficha' : 'NIT';
  const phNombre    = esPersona ? 'Ej. Laura Gómez Pérez' : esGrupoSENA ? 'Ej. Grupo Mantenimiento Industrial' : 'Ej. Maizer S.A.S.';
  const phNit       = esPersona ? 'Ej. 1000123456' : esGrupoSENA ? 'Ej. 2887654' : 'Ej. 9001234567';

  return (
    <div className="fp-card">
      <div className="fp-card-title">
        Información de {esPersona ? 'la persona' : esGrupoSENA ? 'el grupo SENA' : 'la Empresa'}
      </div>
      <div className="fp-grid">
        <div className="fp-field">
          <label>{labelNombre} <span className="req">*</span></label>
          <input
            value={empresa.nombre}
            onChange={e => onChange('nombre', e.target.value)}
            placeholder={phNombre}
          />
        </div>
        <div className="fp-field">
          <label>Nombre del solicitante <span className="req">*</span></label>
          <input
            value={empresa.nombre_contacto}
            onChange={e => onChange('nombre_contacto', e.target.value)}
            placeholder="Ej. Laura Gómez"
          />
        </div>
        <div className="fp-field">
          <label>{labelNit} <span className="req">*</span></label>
          <input
            value={empresa.nit}
            onChange={e => onChange('nit', onChangeNit(e))}
            placeholder={phNit}
            inputMode="numeric"
            maxLength={16}
          />
        </div>
        <div className="fp-field">
          <label>Cupos requeridos</label>
          <input
            type="number"
            value={empresa.cupos || ''}
            onChange={e => onChange('cupos', e.target.value)}
            placeholder="Ej. 15"
            min="1"
          />
        </div>
        <div className="fp-field">
          <label>Correo electrónico del solicitante <span className="req">*</span></label>
          <input
            type="email"
            value={empresa.email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="correo@empresa.com.co"
          />
        </div>
        <div className="fp-field">
          <label>Número de celular o número telefónico <span className="req">*</span></label>
          <input
            value={empresa.telefono}
            onChange={e => onChange('telefono', onChangeTelefono(e))}
            placeholder="Ej. 3001234567"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <div className="fp-field fp-grid-full">
          <label>Dirección {esPersona ? 'de residencia' : 'de la empresa'}</label>
          <input
            value={empresa.direccion}
            onChange={e => onChange('direccion', e.target.value)}
            placeholder="Ej. Calle 100 # 15-20, Bogotá"
          />
        </div>
        <div className="fp-field">
          <label>Ciudad <span className="req">*</span></label>
          <select value={empresa.ciudad_id} onChange={e => onChange('ciudad_id', e.target.value)}>
            <option value="">— Seleccione ciudad —</option>
            {ciudades.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.departamento})</option>
            ))}
          </select>
        </div>
        {!esPersona && (
          <div className="fp-field">
            <label>Cargo del solicitante</label>
            <input
              value={empresa.cargo_contacto}
              onChange={e => onChange('cargo_contacto', e.target.value)}
              placeholder="Ej. Coordinador HSEQ"
            />
          </div>
        )}
      </div>
    </div>
  );
}
