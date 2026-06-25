import { useLocation } from 'react-router-dom';
import Icon from '../common/Icon.jsx';
import { PAGE_TITLES } from './navConfig.js';
import styles from './Topbar.module.css';

export default function Topbar({ onOpenMobileMenu }) {
  const location = useLocation();
  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Mayzer', sub: '' };

  return (
    <div className={styles.topbar}>
      <div className={styles['topbar-left']}>
        <button
          className={styles['btn-menu-mobile']}
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú de navegación"
          title="Abrir menú"
        >
          <Icon name="menu" size={20} />
        </button>
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
