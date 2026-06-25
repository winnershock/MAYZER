import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { ToastProvider }         from './hooks/useToast.jsx';
import { Toaster }               from 'sonner';
import { ROL }                   from './constants/index.js';

import Layout      from './components/layout/Layout.jsx';
import LoginPage   from './pages/auth/Login.jsx';
import FormPublico from './pages/public/FormPublico.jsx';

const SplashScreen    = lazy(() => import('./components/splash/SplashScreen.jsx'));
const Inicio          = lazy(() => import('./pages/admin/Inicio.jsx'));
const Solicitudes     = lazy(() => import('./pages/admin/Solicitudes.jsx'));
const Aspirantes      = lazy(() => import('./pages/admin/Aspirantes.jsx'));
const Grupos          = lazy(() => import('./pages/admin/Grupos.jsx'));
const Cursos          = lazy(() => import('./pages/admin/Cursos.jsx'));
const Instructores    = lazy(() => import('./pages/admin/Instructores.jsx'));
const Calendario      = lazy(() => import('./pages/admin/Calendario.jsx'));
const Reportes        = lazy(() => import('./pages/admin/Reportes.jsx'));
const Empresas        = lazy(() => import('./pages/admin/Empresas.jsx'));
const Administradores = lazy(() => import('./pages/admin/Administradores.jsx'));

function PageSpinner() {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
    </div>
  );
}

function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol_id)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}

function SplashWrapper() {
  const { recienLogueado, marcarSplashMostrado } = useAuth();
  const yaFueMostrado = sessionStorage.getItem('splash_shown') === '1';
  if (!recienLogueado || yaFueMostrado) return null;
  return (
    <Suspense fallback={null}>
      <SplashScreen onDone={marcarSplashMostrado} />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <>
      <SplashWrapper />
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/solicitud" element={<FormPublico />} />
          <Route path="/login"     element={<LoginPage />} />

          <Route path="/" element={<RutaProtegida><Layout /></RutaProtegida>}>
            <Route index element={<Navigate to="/inicio" replace />} />
            <Route path="inicio" element={<Inicio />} />

            <Route path="solicitudes"  element={<RutaProtegida rolesPermitidos={[ROL.ADMIN]}><Solicitudes /></RutaProtegida>} />
            <Route path="aspirantes"   element={<RutaProtegida rolesPermitidos={[ROL.ADMIN]}><Aspirantes /></RutaProtegida>} />
            <Route path="grupos"       element={<RutaProtegida rolesPermitidos={[ROL.ADMIN, ROL.INSTRUCTOR]}><Grupos /></RutaProtegida>} />
            <Route path="cursos"       element={<RutaProtegida rolesPermitidos={[ROL.ADMIN]}><Cursos /></RutaProtegida>} />
            <Route path="instructores" element={<RutaProtegida rolesPermitidos={[ROL.ADMIN]}><Instructores /></RutaProtegida>} />
            <Route path="calendario"   element={<RutaProtegida rolesPermitidos={[ROL.ADMIN, ROL.INSTRUCTOR]}><Calendario /></RutaProtegida>} />
            <Route path="reportes"     element={<RutaProtegida rolesPermitidos={[ROL.ADMIN]}><Reportes /></RutaProtegida>} />
            <Route path="empresas"     element={<RutaProtegida rolesPermitidos={[ROL.ADMIN]}><Empresas /></RutaProtegida>} />
            <Route path="administradores" element={<RutaProtegida rolesPermitidos={[ROL.SUPERUSUARIO]}><Administradores /></RutaProtegida>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            duration={3500}
            toastOptions={{ style: { fontSize: '13px' } }}
          />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
