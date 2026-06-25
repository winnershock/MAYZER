import { useMemo, memo } from 'react';
import { useNavigate }   from 'react-router-dom';
import styles from './Inicio.module.css';
import { useAuth }               from '../../hooks/useAuth.jsx';
import { useResumenDashboard }   from '../../hooks/useResumenDashboard.jsx';
import Icon from '../../components/common/Icon.jsx';
import { SolEstadoBadge, GrpEstadoBadge } from '../../components/common/EstadoBadge.jsx';
import { formatearFecha } from '../../utils/fecha.js';

const StatCard = memo(function StatCard({ label, value, icon, color, bg, accent, sub, onClick }) {
  return (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="stat-accent" style={{ background: accent }} />
      <div className="stat-icon-wrap" style={{ background: bg }}>
        <Icon name={icon} size={20} color={color} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value ?? '–'}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
});

const SolicitudItem = memo(function SolicitudItem({ sol }) {
  return (
    <div className={styles['inicio-list-item']}>
      <div className={`${styles['inicio-list-icon']} ${styles['inicio-list-icon--sol']}`}>
        <Icon name="building" size={18} />
      </div>
      <div className={styles['inicio-list-info']}>
        <div className={styles['inicio-list-title']}>{sol.empresa_nombre}</div>
        <div className={styles['inicio-list-sub']}>
          {sol.curso_solicitado} · {sol.total_aspirantes} aspirante{sol.total_aspirantes !== 1 ? 's' : ''}
        </div>
      </div>
      <div className={styles['inicio-list-meta']}>
        <SolEstadoBadge estado={sol.estado} />
        <span className={styles['inicio-list-date']}>
          {formatearFecha(sol.created_at)}
        </span>
      </div>
    </div>
  );
});

const GrupoItem = memo(function GrupoItem({ g }) {
  return (
    <div className={styles['inicio-list-item']}>
      <div className={`${styles['inicio-list-icon']} ${styles['inicio-list-icon--grupo']}`}>
        <Icon name="users" size={18} />
      </div>
      <div className={styles['inicio-list-info']}>
        <div className={styles['inicio-list-title']}>{g.nombre}</div>
        <div className={styles['inicio-list-sub']}>
          {g.instructor_nombre} · {g.inscritos}/{g.cupo_maximo} inscritos
        </div>
      </div>
      <div className={styles['inicio-list-meta']}>
        <GrpEstadoBadge estado={g.estado} />
        <span className={styles['inicio-list-date']}>hasta {formatearFecha(g.fecha_fin)}</span>
      </div>
    </div>
  );
});

function buildStatCards(resumen, esInstructor, nav) {
  if (esInstructor) {
    return [
      {
        label: 'Mis grupos en curso',
        value: resumen?.grupos?.en_curso ?? 0,
        icon: 'users', color: 'var(--brand)', bg: 'var(--brand-muted)', accent: 'var(--brand)',
        sub: `${resumen?.grupos?.programados ?? 0} programados próximamente`,
        onClick: () => nav('/grupos'),
      },
      {
        label: 'Mis eventos',
        value: resumen?.eventos?.total ?? 0,
        icon: 'calendar', color: 'var(--blue)', bg: 'var(--blue-bg)', accent: 'var(--blue)',
        sub: 'Clases programadas',
        onClick: () => nav('/calendario'),
      },
      {
        label: 'Grupos finalizados',
        value: resumen?.grupos?.finalizados ?? 0,
        icon: 'check', color: 'var(--text-tertiary)', bg: 'var(--bg)', accent: 'var(--text-tertiary)',
        sub: 'Total histórico',
        onClick: null,
      },
    ];
  }
  return [
    {
      label: 'Solicitudes nuevas',
      value: resumen?.solicitudes?.pendientes ?? 0,
      icon: 'clipboard', color: 'var(--amber)', bg: 'var(--amber-bg)', accent: 'var(--amber)',
      sub: `De ${resumen?.solicitudes?.total ?? 0} totales`,
      onClick: () => nav('/solicitudes'),
    },
    {
      label: 'Aspirantes por revisar',
      value: resumen?.aspirantes?.pendientes ?? 0,
      icon: 'user', color: 'var(--blue)', bg: 'var(--blue-bg)', accent: 'var(--blue)',
      sub: `${resumen?.aspirantes?.pre_aprobados ?? 0} pre-aprobados listos`,
      onClick: () => nav('/aspirantes'),
    },
    {
      label: 'Grupos en curso',
      value: resumen?.grupos?.en_curso ?? 0,
      icon: 'users', color: 'var(--brand)', bg: 'var(--brand-muted)', accent: 'var(--brand)',
      sub: `${resumen?.grupos?.programados ?? 0} programados próximamente`,
      onClick: () => nav('/grupos'),
    },
  ];
}

export default function Inicio() {
  const { usuario, esAdmin, esSuperUsuario, esInstructor } = useAuth();
  const { resumen, solicitudes, grupos, cargando, error } = useResumenDashboard();
  const nav = useNavigate();

  const saludo = useMemo(() => {
    const hora = new Date().getHours();
    return hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  }, []);

  const fechaFormateada = useMemo(
    () => new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }),
    []
  );

  const statCards = useMemo(
    () => buildStatCards(resumen, esInstructor, nav),
    [resumen, esInstructor, nav]
  );

  const resumenSistema = useMemo(() => resumen ? [
    { label: 'Empresas registradas',  value: resumen.empresasTop?.length    ?? '–', color: 'var(--tsa-blue)' },
    { label: 'Aspirantes aprobados',  value: resumen.aspirantes?.asignados  ?? 0,   color: 'var(--brand)' },
    { label: 'Grupos finalizados',    value: resumen.grupos?.finalizados    ?? 0,   color: 'var(--text-tertiary)' },
    { label: 'Cursos disponibles',    value: resumen.cursosPopulares?.length ?? '–', color: 'var(--blue)' },
  ] : [], [resumen]);

  if (cargando) {
    return <div className="loading-wrap"><div className="spinner" /><p>Cargando panel...</p></div>;
  }

  if (error) {
    return (
      <div className={`empty-state ${styles['inicio-empty-lg']}`}>
        <div className="empty-icon"><Icon name="alert-circle" size={24} /></div>
        <div className="empty-text">No se pudo cargar el panel</div>
        <div className="empty-sub">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles['inicio-header']}>
        <div>
          <h1 className={styles['inicio-header-title']}>
            {saludo}, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className={styles['inicio-header-sub']}>
            {fechaFormateada} · SENA Sede Palmira
          </p>
        </div>
        <div className={styles['inicio-header-actions']}>
          {esAdmin && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => nav('/solicitudes')}>Ver solicitudes</button>
              <button className="btn btn-primary btn-sm" onClick={() => nav('/grupos')}>Ver grupos</button>
            </>
          )}
          {esSuperUsuario && (
            <button className="btn btn-sena btn-sm" onClick={() => nav('/administradores')}>Gestionar administradores</button>
          )}
          {esInstructor && (
            <button className="btn btn-outline btn-sm" onClick={() => nav('/calendario')}>Ver calendario</button>
          )}
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className={`section-two ${styles['inicio-section-two']}`}>
        {(esAdmin || esSuperUsuario) && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Solicitudes pendientes</span>
              <button className="btn btn-sm btn-outline" onClick={() => nav('/solicitudes')}>Ver todas →</button>
            </div>
            <div className={styles['inicio-card-body-flush']}>
              {solicitudes.length === 0 ? (
                <div className={`empty-state ${styles['inicio-empty-md']}`}>
                  <div className="empty-icon"><Icon name="clipboard" size={22} /></div>
                  <div className="empty-text">Sin solicitudes pendientes</div>
                  <div className="empty-sub">¡Todo al día!</div>
                </div>
              ) : solicitudes.map(s => <SolicitudItem key={s.id} sol={s} />)}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <span className="card-title">{esInstructor ? 'Mis grupos en curso' : 'Grupos en curso'}</span>
            <button className="btn btn-sm btn-outline" onClick={() => nav('/grupos')}>Ver todos →</button>
          </div>
          <div className={styles['inicio-card-body-flush']}>
            {grupos.length === 0 ? (
              <div className={`empty-state ${styles['inicio-empty-md']}`}>
                <div className="empty-icon"><Icon name="users" size={22} /></div>
                <div className="empty-text">Sin grupos activos ahora</div>
              </div>
            ) : grupos.map(g => <GrupoItem key={g.id} g={g} />)}
          </div>
        </div>
      </div>

      {(esAdmin || esSuperUsuario) && resumen && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resumen del sistema</span>
            <button className="btn btn-sm btn-outline" onClick={() => nav('/reportes')}>Ver reportes completos →</button>
          </div>
          <div className="card-body">
            <div className={`${styles['inicio-resumen-grid']} ${resumen.cursosPopulares?.length > 0 ? styles['inicio-resumen-grid--mb'] : ''}`}>
              {resumenSistema.map((item, i) => (
                <div key={i} className={styles['inicio-resumen-item']}>
                  <div className={styles['inicio-resumen-value']} style={{ color: item.color }}>{item.value}</div>
                  <div className={styles['inicio-resumen-label']}>{item.label}</div>
                </div>
              ))}
            </div>

            {resumen.cursosPopulares?.length > 0 && (
              <div>
                <div className={styles['inicio-cursos-title']}>
                  Cursos más solicitados
                </div>
                <div className="bar-chart">
                  {resumen.cursosPopulares.slice(0, 5).map((c, i) => {
                    const max = Math.max(...resumen.cursosPopulares.map(x => x.total), 1);
                    return (
                      <div key={i} className="bar-row">
                        <div className="bar-label">{c.curso_requerido}</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.total / max) * 100}%` }} /></div>
                        <div className="bar-val">{c.total}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
