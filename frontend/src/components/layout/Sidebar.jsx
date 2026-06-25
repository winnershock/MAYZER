
import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import Icon from '../common/Icon.jsx';
import { NAV_ADMIN, NAV_INSTRUCTOR, NAV_SUPER, ROL_LABEL } from './navConfig.js';
import styles from './Sidebar.module.css';

const LS_KEY = 'sidebar_collapsed';

export default function Sidebar({ onLogout, mobileOpen = false, onCloseMobile }) {
  const { usuario, esAdmin, esInstructor } = useAuth();
  const nav = esAdmin ? NAV_ADMIN : esInstructor ? NAV_INSTRUCTOR : NAV_SUPER;

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === 'true'; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, String(collapsed)); }
    catch {}
  }, [collapsed]);

  const toggle = () => setCollapsed(c => !c);

  return (
    <>
      <div
        className={`${styles['mobile-overlay']}${mobileOpen ? ' ' + styles['mobile-overlay-visible'] : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={`${styles.sidebar}${collapsed ? ' ' + styles.collapsed : ''}${mobileOpen ? ' ' + styles['mobile-open'] : ''}`}
        aria-expanded={!collapsed}
      >
        <div className={styles['sidebar-logo']}>
          <div className={styles['logo-img-wrap']}>
            <img src="/logo-sena.svg" alt="SENA" />
          </div>
          <div className={styles['logo-texts']}>
            <div className={styles['logo-name']}>MAYZER</div>
            <div className={styles['logo-sub']}>SENA · Palmira</div>
            <div className={styles['tsa-badge']}>TSA 2025</div>
          </div>
          <button
            className={styles['btn-close-mobile']}
            onClick={onCloseMobile}
            aria-label="Cerrar menú"
            title="Cerrar menú"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <button
          className={styles['btn-toggle']}
          onClick={toggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} />
        </button>

        <nav className={styles['sidebar-nav']}>
          {nav.map(group => (
            <div key={group.group}>
              <div className={styles['nav-section-label']}>
                <span className={styles['label-text']}>{group.group}</span>
                <span className={styles['label-dot']} aria-hidden="true" />
              </div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `${styles['nav-item']}${isActive ? ' ' + styles.active : ''}`
                  }
                >
                  <span className={styles['nav-icon']}>
                    <Icon name={item.icon} size={15} />
                  </span>
                  <span className={styles['nav-label']}>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles['sidebar-user']}>
          <div
            className={styles['user-card']}
            title={collapsed ? `${usuario?.nombre?.split(' ')[0]} · ${ROL_LABEL[usuario?.rol_id] || 'Usuario'}` : undefined}
          >
            <div className={styles['user-avatar']}>
              {usuario?.nombre?.charAt(0)?.toUpperCase()}
            </div>
            <div className={styles['user-info']}>
              <div className={styles['user-name']}>{usuario?.nombre?.split(' ')[0]}</div>
              <div className={styles['user-role']}>{ROL_LABEL[usuario?.rol_id] || 'Usuario'}</div>
            </div>
            <button
              className={styles['btn-logout']}
              onClick={onLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon name="log-out" size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
