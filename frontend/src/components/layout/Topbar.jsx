/**
 * components/layout/Topbar.jsx
 * Responsabilidad : Barra superior con título de página y contexto de sede.
 * Exporta         : Topbar (default)
 * Usado en        : components/layout/Layout.jsx
 * Depende de      : components/layout/navConfig.js
 */
import { useLocation } from 'react-router-dom';
import { PAGE_TITLES } from './navConfig.js';
import styles from './Topbar.module.css';

export default function Topbar() {
  const location = useLocation();
  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Mayzer', sub: '' };

  return (
    <div className={styles.topbar}>
      <div className={styles['topbar-left']}>
        <div className={styles['topbar-breadcrumb']}>
          <div>
            <div className={styles['topbar-title']}>{pageInfo.title}</div>
            {pageInfo.sub && <div className={styles['topbar-sub']}>{pageInfo.sub}</div>}
          </div>
        </div>
      </div>
      <div className={styles['topbar-pill']}>
        <img src="/logo-sena.svg" alt="SENA" />
        <span>Sede Industrial Palmira</span>
      </div>
    </div>
  );
}
