import styles from './BarraHoras.module.css';

export default function BarraHoras({ asignadas, maximas }) {
  const pct   = maximas > 0 ? Math.min(100, Math.round((asignadas / maximas) * 100)) : 0;
  const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--amber)' : 'var(--brand)';

  return (
    <div className={styles['barra-horas']}>
      <div className={styles['barra-horas-labels']}>
        <span className={styles.asignadas} style={{ color }}>{asignadas}h asig.</span>
        <span>{maximas}h máx.</span>
      </div>
      <div className={styles['barra-horas-track']}>
        <div className={styles['barra-horas-fill']} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles['barra-horas-pct']}>{pct}%</div>
    </div>
  );
}
