import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../services/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [usuario,        setUsuario]        = useState(null);
  const [cargando,       setCargando]       = useState(true);
  const [recienLogueado, setRecienLogueado] = useState(false);

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
    } catch {}
    localStorage.clear();
    sessionStorage.removeItem('splash_shown');
    setRecienLogueado(false);
    setUsuario(null);
  }

  function marcarSplashMostrado() {
    sessionStorage.setItem('splash_shown', '1');
    setRecienLogueado(false);
  }

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
  }), [usuario, cargando, recienLogueado]);

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
