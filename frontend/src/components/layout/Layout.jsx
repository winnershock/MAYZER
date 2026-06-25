
import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function Layout() {
  const { logout } = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    toast('Sesión cerrada correctamente', 'sena');
    navigate('/login');
  }

  return (
    <div className="app-layout">
      <Sidebar
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="main-area">
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
