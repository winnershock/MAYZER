
import { useState, useEffect, useCallback } from 'react';
import { EmpresaService } from '../../services';
import Icon from '../../components/common/Icon.jsx';
import Paginador from '../../components/common/Paginador.jsx';
import FiltrosBar from '../../components/common/FiltrosBar.jsx';
import s from './Empresas.module.css';

const LIMITE = 25;
const CAMPOS_FILTRO = ['empresa', 'ciudad'];
const FILTROS_INICIAL = { empresa: '', ciudad_id: '' };

function FilaDetalle({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className={s.filaDetalle}>
      <span className={s.filaDetalleLabel}>{label}:</span>
      <span className={s.filaDetalleValor}>{value}</span>
    </div>
  );
}

function PanelDetalle({ empresa, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-lg ${s.modalDetalle}`}>
        <div className={`modal-title ${s.modalDetalleTitle}`}>
          <Icon name="building" size={18} />
          <span>{empresa.nombre}</span>
        </div>

        <div className={s.seccion}>
          <div className={s.seccionLabel}>Identificación</div>
          <div className={s.seccionGrid}>
            <FilaDetalle label="Nombre"       value={empresa.nombre} />
            <FilaDetalle label="NIT / Cédula" value={empresa.nit} />
            <FilaDetalle label="Tipo entidad" value={empresa.tipo_entidad} />
            <FilaDetalle label="Activo"       value={empresa.activo ? 'Sí' : 'No'} />
          </div>
        </div>

        <div className={s.seccion}>
          <div className={s.seccionLabel}>Contacto</div>
          <div className={s.seccionGrid}>
            <FilaDetalle label="Email"           value={empresa.email} />
            <FilaDetalle label="Teléfono"        value={empresa.telefono} />
            <FilaDetalle label="Nombre contacto" value={empresa.nombre_contacto} />
            <FilaDetalle label="Cargo contacto"  value={empresa.cargo_contacto} />
          </div>
        </div>

        <div className={s.seccion}>
          <div className={s.seccionLabel}>Ubicación</div>
          <div className={s.seccionGrid}>
            <FilaDetalle label="Ciudad"       value={empresa.ciudad} />
            <FilaDetalle label="Departamento" value={empresa.departamento} />
            <FilaDetalle label="Dirección"    value={empresa.direccion} />
          </div>
        </div>

        <div className={s.seccion}>
          <div className={s.seccionLabel}>Actividad en MAYZER</div>
          <div className={s.seccionGrid}>
            <FilaDetalle label="Total solicitudes" value={empresa.total_solicitudes} />
            <FilaDetalle label="Total aspirantes"  value={empresa.total_aspirantes} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pagina,   setPagina]   = useState(1);
  const [filtros,  setFiltros]  = useState(FILTROS_INICIAL);
  const [detalle,  setDetalle]  = useState(null);
  const [ciudades, setCiudades] = useState([]);

  const f = useCallback((k, v) => setFiltros(p => ({ ...p, [k]: v })), []);
  const limpiar = useCallback(() => setFiltros(FILTROS_INICIAL), []);

  useEffect(() => {
    EmpresaService.listarCiudades().then(r => setCiudades(r.data)).catch(() => {});
  }, []);

  const cargar = useCallback(() => {
    const t = setTimeout(() => {
      const params = { limit: LIMITE, page: pagina };
      if (filtros.empresa)   params.empresa   = filtros.empresa;
      if (filtros.ciudad_id) params.ciudad_id = filtros.ciudad_id;

      EmpresaService.listar(params)
        .then(r => {
          const data = r.data;
          if (Array.isArray(data)) {
            setEmpresas(data);
            setTotal(data.length);
          } else {
            setEmpresas(data.empresas || []);
            setTotal(data.total || 0);
          }
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [filtros, pagina]);

  useEffect(() => { setPagina(1); }, [filtros]);
  useEffect(() => cargar(), [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

  return (
    <div>
      <div className="page-header">
        <div>
          <p>Empresas registradas mediante el formulario público</p>
        </div>
        <a href="/solicitud" target="_blank" className="btn btn-outline"><Icon name="send" size={13} /> Abrir formulario público</a>
      </div>
      <FiltrosBar
        campos={CAMPOS_FILTRO}
        valores={filtros}
        onChange={f}
        onLimpiar={limpiar}
        ciudades={ciudades}
      />
      <div className="card">
        <div className="card-header">
          <span className="card-title">Directorio de empresas</span>
          <span className={s['total-registros']}>{total} registros</span>
        </div>
        <div className="table-wrap">
          {empresas.length===0 ? (
            <div className="empty-state"><div className="empty-icon"><Icon name="building" size={22} /></div><div className="empty-text">Sin empresas registradas</div></div>
          ) : (
            <table>
              <thead>
                <tr><th>Empresa</th><th>NIT</th><th>Email</th><th>Ciudad</th><th>Contacto</th><th>Solicitudes</th><th>Aspirantes</th><th>Detalle</th></tr>
              </thead>
              <tbody>
                {empresas.map(e=>(
                  <tr key={e.id}>
                    <td>
                      <strong>{e.nombre}</strong>
                      {e.direccion && <div className={s.direccion}>{e.direccion}</div>}
                    </td>
                    <td className={s.nit}>{e.nit}</td>
                    <td className={s.email}>{e.email}</td>
                    <td>{e.ciudad || '–'}</td>
                    <td className={s.contactoWrap}>
                      {e.nombre_contacto && <div>{e.nombre_contacto}</div>}
                      {e.cargo_contacto && <div className={s.cargo}>{e.cargo_contacto}</div>}
                    </td>
                    <td className={s.colCentro}><span className="badge badge-gray">{e.total_solicitudes}</span></td>
                    <td className={s.colCentro}><span className="badge badge-info">{e.total_aspirantes}</span></td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setDetalle(e)}
                      >
                        <Icon name="eye" size={13} /> Ver más
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          limite={LIMITE}
          onChange={setPagina}
        />
      </div>

      {detalle && (
        <PanelDetalle empresa={detalle} onClose={() => setDetalle(null)} />
      )}
    </div>
  );
}
