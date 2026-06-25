import { useState, useRef } from 'react';
import Icon from '../common/Icon.jsx';
import {
  TIPOS_DOC, TIPOS_SANGRE, NIVELES_ACADEMICOS,
  SECTORES,
} from '../../constants/index.js';
import { onChangeTelefono } from '../../utils/validaciones.js';
import s from './AspCard.module.css';

const GENEROS   = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decir'];
const ESTADOS_C = ['Soltero/a', 'Casado/a', 'Unión libre', 'Divorciado/a', 'Viudo/a'];

export default function AspCard({ asp, idx, onChange, onRemove, canRemove, pdfFile, onPdf }) {
  const [open, setOpen] = useState(idx === 0);
  const fileRef = useRef();

  const ch = (sec, field, val) => {
    if (sec === 'base') onChange(idx, field, val);
    else onChange(idx, `${sec}.${field}`, val);
  };

  const v  = f => asp[f]            ?? '';
  const vm = f => asp.medico?.[f]   ?? '';
  const vc = f => asp.contacto?.[f] ?? '';
  const vl = f => asp.laboral?.[f]  ?? '';

  const nombreCompleto = [asp.nombre1, asp.nombre2, asp.apellido1, asp.apellido2]
    .filter(Boolean).join(' ') || `Aspirante ${idx + 1}`;

  return (
    <div className="fp-asp-card">
      <div
        className={`fp-asp-header${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="fp-asp-num">{idx + 1}</div>
        <div className="fp-asp-info">
          <div className="fp-asp-name">{nombreCompleto}</div>
          {asp.tipo_documento && asp.numero_documento && (
            <div className="fp-asp-doc">{asp.tipo_documento}: {asp.numero_documento}</div>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            className={s['btn-eliminar']}
            onClick={e => { e.stopPropagation(); onRemove(idx); }}
            title="Quitar aspirante"
          ><Icon name="trash" size={15} /></button>
        )}
        <span className="fp-asp-chevron">▼</span>
      </div>

      {open && (
        <div className="fp-asp-body">

          <div className="fp-grid">
            <div className="fp-field">
              <label>Tipo de documento</label>
              <select value={v('tipo_documento')} onChange={e => ch('base', 'tipo_documento', e.target.value)}>
                {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label>Número de documento <span className="req">*</span></label>
              <input value={v('numero_documento')} onChange={e => ch('base', 'numero_documento', e.target.value)}
                placeholder="Ingrese el Número de documento del aspirante" />
            </div>
            <div className="fp-field">
              <label>Primer nombre <span className="req">*</span></label>
              <input value={v('nombre1')} onChange={e => ch('base', 'nombre1', e.target.value)}
                placeholder="Primer nombre del aspirante" />
            </div>
            <div className="fp-field">
              <label>Segundo nombre</label>
              <input value={v('nombre2')} onChange={e => ch('base', 'nombre2', e.target.value)}
                placeholder="Segundo nombre del aspirante" />
            </div>
            <div className="fp-field">
              <label>Primer apellido <span className="req">*</span></label>
              <input value={v('apellido1')} onChange={e => ch('base', 'apellido1', e.target.value)}
                placeholder="Primer apellido del aspirante" />
            </div>
            <div className="fp-field">
              <label>Segundo apellido</label>
              <input value={v('apellido2')} onChange={e => ch('base', 'apellido2', e.target.value)}
                placeholder="Segundo apellido del aspirante" />
            </div>
            <div className="fp-field">
              <label>Género</label>
              <select value={v('genero') || ''} onChange={e => ch('base', 'genero', e.target.value)}>
                <option value="">Genero</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label>Nivel educativo <span className="req">*</span></label>
              <select value={vl('nivel_academico')} onChange={e => ch('laboral', 'nivel_academico', e.target.value)}>
                <option value="">Elija el nivel educativo del aspirante</option>
                {NIVELES_ACADEMICOS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label>País de nacimiento</label>
              <input value={v('pais_nacimiento') || ''} onChange={e => ch('base', 'pais_nacimiento', e.target.value)}
                placeholder="País de nacimiento" />
            </div>
            <div className="fp-field">
              <label>Fecha de nacimiento <span className="req">*</span></label>
              <input type="date" value={v('fecha_nacimiento')} onChange={e => ch('base', 'fecha_nacimiento', e.target.value)} />
            </div>
            <div className="fp-field">
              <label>Sector</label>
              <select value={vl('sector')} onChange={e => ch('laboral', 'sector', e.target.value)}>
                <option value="">Sector</option>
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label>Área de trabajo</label>
              <input value={vl('area_trabajo')} onChange={e => ch('laboral', 'area_trabajo', e.target.value)}
                placeholder="Area de trabajo del aspirante" />
            </div>
            <div className="fp-field fp-grid-full">
              <label>Cargo del aspirante</label>
              <input value={vl('cargo')} onChange={e => ch('laboral', 'cargo', e.target.value)}
                placeholder="Cargo del aspirante" />
              <div className="fp-field-hint">
                Ejemplos: SISOMA, Salud Ocupacional, administrativo, operativo, mantenimiento etc.
              </div>
            </div>
            <div className="fp-field">
              <label>Número de teléfono <span className="req">*</span></label>
              <input value={v('telefono')} onChange={e => ch('base', 'telefono', onChangeTelefono(e))}
                placeholder="Número de teléfono del aspirante" inputMode="numeric" maxLength={10} />
            </div>
            <div className="fp-field">
              <label>Correo electrónico <span className="req">*</span></label>
              <input type="email" value={v('email')} onChange={e => ch('base', 'email', e.target.value)}
                placeholder="Correo electrónico del aspirante" />
            </div>
          </div>

          <div className="fp-section-label">Información de salud</div>
          <div className="fp-grid">
            <div className="fp-field">
              <label>Estado civil</label>
              <select value={v('estado_civil') || ''} onChange={e => ch('base', 'estado_civil', e.target.value)}>
                <option value="">Estado civil</option>
                {ESTADOS_C.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label>Tipo de sangre y RH</label>
              <select value={vm('tipo_sangre')} onChange={e => ch('medico', 'tipo_sangre', e.target.value)}>
                <option value="">Tipo de sangre y RH</option>
                {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="fp-field">
              <label>Alergias</label>
              <input value={vm('antecedentes')} onChange={e => ch('medico', 'antecedentes', e.target.value)}
                placeholder="Alergias" />
            </div>
            <div className="fp-field">
              <label>Consumo medicamentos</label>
              <input value={vm('medicamentos')} onChange={e => ch('medico', 'medicamentos', e.target.value)}
                placeholder="Consumo medicamentos" />
            </div>
            <div className="fp-field">
              <label>Lesiones recientes</label>
              <input value={v('lesiones') || ''} onChange={e => ch('base', 'lesiones', e.target.value)}
                placeholder="Lesiones recientes" />
            </div>
            <div className="fp-field">
              <label>Enfermedad actual</label>
              <input value={v('enfermedad') || ''} onChange={e => ch('base', 'enfermedad', e.target.value)}
                placeholder="Enfermedad actual" />
            </div>
            <div className="fp-field">
              <label>EPS</label>
              <input value={vm('eps')} onChange={e => ch('medico', 'eps', e.target.value)} placeholder="EPS" />
            </div>
            <div className="fp-field">
              <label>ARL</label>
              <input value={vm('arl')} onChange={e => ch('medico', 'arl', e.target.value)} placeholder="ARL" />
            </div>
            <div className="fp-field">
              <label>Pensión</label>
              <input value={v('pension') || ''} onChange={e => ch('base', 'pension', e.target.value)} placeholder="Pensión" />
            </div>
            <div className="fp-field">
              <label>Régimen especial</label>
              <input value={v('regimen') || ''} onChange={e => ch('base', 'regimen', e.target.value)} placeholder="Régimen especial" />
            </div>
          </div>

          <div className="fp-section-label">En caso de emergencia avisar a:</div>
          <div className="fp-grid">
            <div className="fp-field">
              <label>Nombre y apellidos del contacto <span className="req">*</span></label>
              <input value={vc('nombre')} onChange={e => ch('contacto', 'nombre', e.target.value)}
                placeholder="Nombre y apellidos del contacto" />
            </div>
            <div className="fp-field">
              <label>Teléfono del contacto <span className="req">*</span></label>
              <input value={vc('telefono')} onChange={e => ch('contacto', 'telefono', onChangeTelefono(e))}
                placeholder="Teléfono del contacto" inputMode="numeric" maxLength={10} />
            </div>
          </div>

          <div className="fp-section-label">Documento de identidad</div>
          <div className={`fp-pdf-zone${pdfFile ? ' active' : ''}`}>
            <div className="fp-pdf-icon"><Icon name={pdfFile ? 'check-circle' : 'file-text'} size={22} /></div>
            <div className="fp-pdf-info">
              <div className="fp-pdf-label">
                Documento de identidad PDF <span className={s['required-mark']}>*</span>
              </div>
              <div className="fp-pdf-sub">
                {pdfFile
                  ? `${pdfFile.name} (${(pdfFile.size / 1024).toFixed(1)} KB)`
                  : 'Cédula, pasaporte u otro documento de identidad (máx. 10 MB)'}
              </div>
            </div>
            <div className={s['file-actions']}>
              <input ref={fileRef} type="file" accept="application/pdf" className={s['hidden']}
                onChange={e => onPdf(idx, e.target.files[0] || null)} />
              <button type="button"
                className={s['btn-upload']}
                onClick={() => fileRef.current.click()}>
                {pdfFile ? 'Cambiar' : 'Subir PDF'}
              </button>
              {pdfFile && (
                <button type="button"
                  className={s['btn-remove']}
                  onClick={() => { onPdf(idx, null); fileRef.current.value = ''; }}>X</button>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
