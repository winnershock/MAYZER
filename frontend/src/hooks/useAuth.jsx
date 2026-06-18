/**
 * hooks/useAuth.jsx
 * Responsabilidad : Contexto y lógica de autenticación — login, logout, estado de sesión.
 * Exporta         : AuthProvider, useAuth
 * Usado en        : App.jsx (provider), components/layout/Layout.jsx,
 *                   components/layout/Sidebar.jsx, hooks/useGrupos.jsx,
 *                   hooks/useEventos.jsx, hooks/useResumenDashboard.jsx
 * Depende de      : services/api.js
 */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../services/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario,        setUsuario]        = useState(null);
  const [cargando,       setCargando]       = useState(true);
  const [recienLogueado, setRecienLogueado] = useState(false);

  // Hidratación inicial (síncrona sobre localStorage — StrictMode seguro)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const raw   = localStorage.getItem('usuario');

    if (token && raw) {
      try {
        setUsuario(JSON.parse(raw));
      } catch {
        localStorage.clear();
      }
    }
    setCargando(false);
  }, []);

  async function login(nombre_usuario, contrasena) {
    const { data } = await api.post('/auth/login', { nombre_usuario, contrasena });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('usuario',     JSON.stringify(data.usuario));
    sessionStorage.removeItem('splash_shown');
    setRecienLogueado(true);
    setUsuario(data.usuario);
    return data.usuario;
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch { /* token ya revocado — continuar */ }
    localStorage.clear();
    sessionStorage.removeItem('splash_shown');
    setRecienLogueado(false);
    setUsuario(null);
  }

  function marcarSplashMostrado() {
    sessionStorage.setItem('splash_shown', '1');
    setRecienLogueado(false);
  }

  // Memoizar el valor del contexto para evitar que todos los consumidores
  // se re-rendericen cada vez que AuthProvider re-renderiza por cambios de estado.
  const value = useMemo(() => ({
    usuario,
    login,
    logout,
    cargando,
    recienLogueado,
    marcarSplashMostrado,
    esAdmin:        usuario?.rol_id === 1,
    esInstructor:   usuario?.rol_id === 2,
    esSuperUsuario: usuario?.rol_id === 3,
  }), [usuario, cargando, recienLogueado]); // login/logout/marcarSplashMostrado son estables

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
