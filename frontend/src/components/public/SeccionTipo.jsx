/**
 * components/public/SeccionTipo.jsx
 * Responsabilidad : Selector de tipo de perfil (Empresa / Independiente / Grupo SENA).
 * Exporta         : SeccionTipo (default)
 * Usado en        : pages/public/FormPublico.jsx
 * Depende de      : constants/index.js, components/common/Icon.jsx
 */
import { TIPO_ENTIDAD_INFO } from '../../constants/index.js';
import Icon from '../common/Icon.jsx';

const ICONS = {
  empresa:      'building',
  'grupo SENA': 'book',
  persona:      'user',
};

export default function SeccionTipo({ tipoEntidad, onChange }) {
  return (
    <div className="fp-tipo-list">
      {Object.entries(TIPO_ENTIDAD_INFO).map(([key, info]) => (
        <button
          key={key}
          type="button"
          className={`fp-tipo-option${tipoEntidad === key ? ' selected' : ''}`}
          onClick={() => onChange(key)}
        >
          <div className="fp-tipo-icon"><Icon name={ICONS[key]} size={20} /></div>
          <div className="fp-tipo-text">
            <div className="fp-tipo-label">{info.label}</div>
            <div className="fp-tipo-desc">{info.desc}</div>
          </div>
          <div className="fp-tipo-check">
            <div className="fp-tipo-check-dot" />
          </div>
        </button>
      ))}
    </div>
  );
}
