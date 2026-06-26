import { MESES, ANIOS_FILTRO, ASP_ESTADOS_SELECT, SOL_ESTADOS_SELECT, GRP_ESTADOS_SELECT, TIPO_ENTIDAD_INFO } from '../../constants/index.js';

/**
 * Barra de filtros unificada. Cada página declara qué campos necesita en
 * `campos` (en el orden en que deben aparecer) y conecta el estado con
 * `valores` + `onChange`. Así se evita duplicar la lógica/JSX de filtros
 * en cada página, sin forzar a todas las páginas a tener los mismos filtros.
 *
 * Campos soportados: aspirante, empresa, tipoEntidad, ciudad, anio, mes, curso, estadoGrupo, estado, estadoSolicitud
 *
 * - 'aspirante': una sola casilla que busca por nombre del aspirante o por
 *   número de cédula (si el texto es puramente numérico se busca por cédula,
 *   si tiene letras se busca por nombre). Clave en valores: `aspirante`.
 * - 'empresa': una sola casilla que busca por nombre de empresa o por NIT
 *   a la vez. Clave en valores: `empresa`.
 *
 * Props:
 *  - campos:    string[] -> qué inputs mostrar y en qué orden
 *  - valores:   objeto { aspirante, empresa, tipo_entidad, ciudad_id, anio, mes, curso_id, estado, estado_grupo, estado_solicitud }
 *  - onChange:  (clave, valor) => void
 *  - onLimpiar: () => void
 *  - cursos:    [{id, nombre}] -> requerido si se incluye 'curso'
 *  - ciudades:  [{id, nombre, departamento}] -> requerido si se incluye 'ciudad'
 */
export default function FiltrosBar({
  campos = [],
  valores = {},
  onChange = () => {},
  onLimpiar = () => {},
  cursos = [],
  ciudades = [],
  extra = null,
}) {
  const v = (clave, fallback = '') => valores[clave] ?? fallback;

  return (
    <div className="filters-bar">
      {campos.includes('aspirante') && (
        <div className="filter-group">
          <label>Aspirante</label>
          <input
            className="filter-input filter-search"
            placeholder="Nombre o número de cédula..."
            value={v('aspirante')}
            onChange={e => onChange('aspirante', e.target.value)}
          />
        </div>
      )}

      {campos.includes('empresa') && (
        <div className="filter-group">
          <label>Empresa</label>
          <input
            className="filter-input filter-search"
            placeholder="Nombre o NIT de la empresa..."
            value={v('empresa')}
            onChange={e => onChange('empresa', e.target.value)}
          />
        </div>
      )}

      {campos.includes('tipoEntidad') && (
        <div className="filter-group">
          <label>Tipo de solicitud</label>
          <select
            className="filter-input"
            value={v('tipo_entidad')}
            onChange={e => onChange('tipo_entidad', e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(TIPO_ENTIDAD_INFO).map(([clave, info]) => (
              <option key={clave} value={clave}>{info.label}</option>
            ))}
          </select>
        </div>
      )}

      {campos.includes('curso') && (
        <div className="filter-group">
          <label>Curso</label>
          <select
            className="filter-input"
            value={v('curso_id')}
            onChange={e => onChange('curso_id', e.target.value)}
          >
            <option value="">Todos los cursos</option>
            {cursos.map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      {campos.includes('ciudad') && (
        <div className="filter-group">
          <label>Ciudad</label>
          <select
            className="filter-input"
            value={v('ciudad_id')}
            onChange={e => onChange('ciudad_id', e.target.value)}
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map(c => <option key={c.id} value={String(c.id)}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      {campos.includes('estado') && (
        <div className="filter-group">
          <label>Estado</label>
          <select
            className="filter-input"
            value={v('estado')}
            onChange={e => onChange('estado', e.target.value)}
          >
            <option value="">Todos</option>
            {ASP_ESTADOS_SELECT.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
      )}

      {campos.includes('estadoSolicitud') && (
        <div className="filter-group">
          <label>Estado</label>
          <select
            className="filter-input"
            value={v('estado_solicitud')}
            onChange={e => onChange('estado_solicitud', e.target.value)}
          >
            <option value="">Todos</option>
            {SOL_ESTADOS_SELECT.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
      )}

      {campos.includes('estadoGrupo') && (
        <div className="filter-group">
          <label>Estado del grupo</label>
          <select
            className="filter-input"
            value={v('estado_grupo')}
            onChange={e => onChange('estado_grupo', e.target.value)}
          >
            <option value="">Todos</option>
            {GRP_ESTADOS_SELECT.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
        </div>
      )}

      {campos.includes('anio') && (
        <div className="filter-group">
          <label>Año</label>
          <select
            className="filter-input"
            value={v('anio')}
            onChange={e => onChange('anio', e.target.value)}
          >
            <option value="">Todos</option>
            {ANIOS_FILTRO.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}

      {campos.includes('mes') && (
        <div className="filter-group">
          <label>Mes</label>
          <select
            className="filter-input"
            value={v('mes')}
            onChange={e => onChange('mes', e.target.value)}
          >
            <option value="">Todos</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}

      <div className="filters-end">
        {extra}
        <button className="btn btn-outline btn-sm" onClick={onLimpiar}>Limpiar</button>
      </div>
    </div>
  );
}
