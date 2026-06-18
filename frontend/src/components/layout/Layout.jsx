/**
 * components/layout/Layout.jsx
 * Responsabilidad : Shell de la aplicación — compone Sidebar + Topbar + Outlet.
 * Exporta         : Layout (default)
 * Usado en        : App.jsx (ruta raíz con autenticación)
 * Depende de      : hooks/useAuth.jsx, hooks/useToast.jsx, Sidebar.jsx, Topbar.jsx
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout() {
  const { logout } = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();

  async function handleLogout() {
    await logout();
    toast('Sesión cerrada correctamente', 'sena');
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
