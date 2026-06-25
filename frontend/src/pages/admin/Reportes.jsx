import { useState, useEffect, useCallback } from 'react';
import { ReporteService } from '../../services';
import Icon from '../../components/common/Icon.jsx';
import s from './Reportes.module.css';
import { useToast } from '../../hooks/useToast.jsx';
import { MESES, ANIOS_FILTRO } from '../../constants/index.js';
import { descargarArchivo, urlExportarReporte, nombreArchivoReporte } from '../../utils/descarga.js';

const MESES_LABELS = ['', ...MESES];

const TABLAS = [
  { key: 'aspirantes',         label: 'Aspirantes',           icon: 'users',     desc: 'Listado con estado, empresa y grupo asignado' },
  { key: 'solicitudes',        label: 'Solicitudes',          icon: 'clipboard', desc: 'Solicitudes por empresa con cantidad de aspirantes' },
  { key: 'grupos',             label: 'Grupos',                icon: 'book',      desc: 'Grupos de formación con instructor y ocupación' },
  { key: 'empresas',           label: 'Empresas',             icon: 'building',  desc: 'Directorio completo de empresas con contacto y ubicación' },
  { key: 'aspirantes_empresa', label: 'Aspirantes + Empresa', icon: 'users',     desc: 'Aspirantes con toda la información de su empresa' },
];

function BarChart({ items, keyLabel, keyVal, color = 'var(--brand)' }) {
  const max = Math.max(...(items?.map(x => Number(x[keyVal])) || [1]), 1);
  if (!items?.length) return <p className={s.barChartEmpty}>Sin datos en el periodo.</p>;
  return (
    <div className={s.barChartWrap}>
      {items.map((item, i) => (
        <div key={i} className={s.barChartRow}>
          <div className={s.barChartLabel} title={item[keyLabel]}>
            {item[keyLabel]}
          </div>
          <div className={s.barChartTrack}>
            <div
              className={s.barChartFill}
              style={{
                width: `${(Number(item[keyVal]) / max) * 100}%`,
                background: color,
              }}
            />
          </div>
          <div className={s.barChartVal}>{item[keyVal]}</div>
        </div>
      ))}
    </div>
  );
}

const TIPOS_SOLO_EXCEL = new Set(['empresas', 'aspirantes_empresa']);

function BotonesDescarga({ tabla, anio, mes, compact = false, toast }) {
  const [descargando, setDescargando] = useState(null);
  const soloExcel = TIPOS_SOLO_EXCEL.has(tabla);

  async function descargar(formato) {
    setDescargando(formato);
    try {
      await descargarArchivo(
        urlExportarReporte(tabla, anio, mes, formato === 'pdf' ? 'pdf' : 'excel'),
        nombreArchivoReporte(tabla, anio, mes, formato === 'pdf' ? 'pdf' : 'xlsx')
      );
    } catch {
      toast?.('Error al descargar reporte. Verifica el periodo seleccionado.', 'danger');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <div className={s.descargaWrap}>
      {!soloExcel && (
        <button
          className={`btn btn-ghost btn-sm ${s.btnDescargaPdf}`}
          style={{ minWidth: compact ? 0 : 70 }}
          disabled={!!descargando}
          onClick={() => descargar('pdf')}
          title="Descargar PDF"
        >
          {descargando === 'pdf'
            ? <span className={s.btnCargando}>...</span>
            : <><Icon name="pdf" size={13} />{!compact && ' PDF'}</>}
        </button>
      )}
      <button
        className={`btn btn-ghost btn-sm ${s.btnDescargaExcel}`}
        style={{ minWidth: compact ? 0 : 80 }}
        disabled={!!descargando}
        onClick={() => descargar('excel')}
        title="Descargar Excel"
      >
        {descargando === 'excel'
          ? <span className={s.btnCargando}>...</span>
          : <><Icon name="file-excel" size={13} />{!compact && ' Excel'}</>}
      </button>
    </div>
  );
}

export default function Reportes() {
  const [filtros,        setFiltros]        = useState({ anio: new Date().getFullYear(), mes: '' });
  const [datos,          setDatos]          = useState(null);
  const [cargando,       setCargando]       = useState(true);
  const [descargandoZip, setDescargandoZip] = useState(false);
  const toast = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { anio: filtros.anio };
      if (filtros.mes) params.mes = filtros.mes;
      const { data } = await ReporteService.resumen(params);
      setDatos(data);
    } catch {}
    finally { setCargando(false); }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const f = useCallback((k, v) => setFiltros(p => ({ ...p, [k]: v })), []);
  const periodo = filtros.mes
    ? `${MESES_LABELS[Number(filtros.mes)]} ${filtros.anio}`
    : `Año ${filtros.anio}`;

  async function descargarZip() {
    setDescargandoZip(true);
    try {
      await ReporteService.descargarZipAnual(filtros.anio, filtros.mes || null);
    } catch (err) {
      console.error('ZIP error:', err);
      toast('Error al generar el ZIP. Verifica que existan aspirantes en el periodo seleccionado.', 'danger');
    } finally {
      setDescargandoZip(false);
    }
  }

  const kpis = datos ? [
    {
      label: 'Solicitudes', value: datos.solicitudes?.total ?? 0,
      color: 'var(--blue)', icon: 'clipboard',
      sub: `${datos.solicitudes?.pendientes ?? 0} pend. · ${datos.solicitudes?.aprobadas ?? 0} aprobadas`,
    },
    {
      label: 'Aspirantes', value: datos.aspirantes?.total ?? 0,
      color: 'var(--brand)', icon: 'users',
      sub: `${datos.aspirantes?.asignados ?? 0} asignados · ${datos.aspirantes?.rechazados ?? 0} rechazados`,
    },
    {
      label: 'Grupos', value: datos.grupos?.total ?? 0,
      color: '#9333ea', icon: 'book',
      sub: `${datos.grupos?.en_curso ?? 0} en curso · ${datos.grupos?.finalizados ?? 0} finalizados`,
    },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p className={s.subtituloPeriodo}>Periodo activo: <strong>{periodo}</strong></p>
        </div>
        <button
          className="btn btn-outline"
          disabled={descargandoZip}
          onClick={descargarZip}
          title={`Descargar ZIP del periodo: ${periodo}`}
        >
          <Icon name="zip" size={14} />
          {descargandoZip ? ' Generando...' : ' Exportar ZIP'}
        </button>
      </div>

      <div className={`filters-bar ${s.filtersBar}`}>
        <div className="filter-group">
          <label>Año</label>
          <select className="filter-input" value={filtros.anio} onChange={e => f('anio', Number(e.target.value))}>
            {ANIOS_FILTRO.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Mes <span className={s.labelOpcional}>(opcional)</span></label>
          <select className="filter-input" value={filtros.mes} onChange={e => f('mes', e.target.value)}>
            <option value="">Todos los meses</option>
            {MESES_LABELS.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        {filtros.mes && (
          <button className="btn btn-ghost btn-sm" onClick={() => f('mes', '')}>
            <Icon name="x" size={12} /> Ver año completo
          </button>
        )}
      </div>

      {cargando ? (
        <div className="loading-wrap"><div className="spinner" /><p>Generando reporte...</p></div>
      ) : !datos ? (
        <div className="alert alert-warn">No se pudieron cargar los datos del periodo.</div>
      ) : (
        <>
          <div className="stat-grid">
            {kpis.map((k, i) => (
              <div key={i} className="stat-card">
                <div className="stat-accent" style={{ background: k.color }} />
                <div className={s.kpiIconWrap}>
                  <div
                    className={s.kpiIconCircle}
                    style={{ background: `color-mix(in srgb, ${k.color} 12%, white)` }}
                  >
                    <Icon name={k.icon} size={18} color={k.color} />
                  </div>
                  <span className="stat-label">{k.label}</span>
                </div>
                <div className="stat-value" style={{ color: k.color }}>{k.value}</div>
                <div className="stat-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="section-two">
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <Icon name="chart" size={14} /> Cursos más solicitados
                </span>
                <BotonesDescarga tabla="solicitudes" anio={filtros.anio} mes={filtros.mes} compact toast={toast} />
              </div>
              <div className="card-body">
                <BarChart
                  items={datos.cursosPopulares}
                  keyLabel="curso_requerido"
                  keyVal="total"
                  color="var(--brand)"
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <Icon name="building" size={14} /> Empresas con más aspirantes
                </span>
                <BotonesDescarga tabla="aspirantes" anio={filtros.anio} mes={filtros.mes} compact toast={toast} />
              </div>
              <div className="card-body">
                <BarChart
                  items={datos.empresasTop}
                  keyLabel="nombre"
                  keyVal="aspirantes"
                  color="var(--blue)"
                />
              </div>
            </div>
          </div>

          <div className={`card ${s.cardMarginTop}`}>
            <div className="card-header">
              <span className="card-title">
                <Icon name="users" size={14} /> Aspirantes por estado
              </span>
              <BotonesDescarga tabla="aspirantes" anio={filtros.anio} mes={filtros.mes} toast={toast} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th className={s.thRight}>Cantidad</th>
                    <th className={s.thRight}>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Pendiente',    datos.aspirantes?.pendientes,    'badge-warn'],
                    ['Pre-aprobado', datos.aspirantes?.pre_aprobados, 'badge-info'],
                    ['Asignado',     datos.aspirantes?.asignados,     'badge-sena'],
                    ['Rechazado',    datos.aspirantes?.rechazados,    'badge-danger'],
                  ].map(([label, cant, cls]) => (
                    <tr key={label}>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td className={s.tdRight}>{cant ?? 0}</td>
                      <td className={s.tdRightMuted}>
                        {datos.aspirantes?.total
                          ? Math.round(((cant ?? 0) / datos.aspirantes.total) * 100)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                  <tr className={s.filaTotal}>
                    <td>TOTAL</td>
                    <td className={s.filaTotalTd}>{datos.aspirantes?.total ?? 0}</td>
                    <td className={s.filaTotalTd}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={`card ${s.cardMarginTop}`}>
            <div className="card-header">
              <span className="card-title">
                <Icon name="download" size={14} /> Descargar reportes individuales
              </span>
              <span className={s.periodoInline}>Periodo: {periodo}</span>
            </div>
            <div className="card-body">
              <div className={s.descargaGrid}>
                {TABLAS.map(tabla => (
                  <div key={tabla.key} className={s.descargaItem}>
                    <div className={s.descargaItemInfo}>
                      <div className={s.descargaIconCircle}>
                        <Icon name={tabla.icon} size={16} color="var(--brand)" />
                      </div>
                      <div>
                        <div className={s.descargaItemNombre}>{tabla.label}</div>
                        <div className={s.descargaItemDesc}>{tabla.desc}</div>
                      </div>
                    </div>
                    <BotonesDescarga tabla={tabla.key} anio={filtros.anio} mes={filtros.mes} toast={toast} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
