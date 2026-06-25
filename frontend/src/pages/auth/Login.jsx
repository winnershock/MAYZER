import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import Icon         from '../../components/common/Icon.jsx';
import styles       from './Login.module.css';

export default function LoginPage() {
  const [form,     setForm]     = useState({ nombre_usuario: '', contrasena: '' });
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');

  const { login }  = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();

  const cambiar = e => {
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  async function enviar(e) {
    e?.preventDefault();
    if (cargando) return;
    if (!form.nombre_usuario.trim() || !form.contrasena) {
      setError('Por favor completa todos los campos');
      return;
    }

    setCargando(true);
    setError('');

    try {
      await login(form.nombre_usuario.trim(), form.contrasena);
      navigate('/inicio', { replace: true });
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Usuario o contraseña incorrectos';
      setError(mensaje);
      toast(mensaje, 'danger');
    } finally {
      setCargando(false);
    }
  }

  const handleKeyDown = e => { if (e.key === 'Enter') enviar(e); };

  return (
    <div className={styles['login-page']}>
      <div className={styles['login-card-wrap']}>
        <div className={styles['login-card']}>

          <div className={styles['login-header']}>
            <div className={styles['login-header-logo']}>
              <img src="/logo-sena.svg" alt="SENA" />
            </div>
            <div className={styles['login-header-text']}>
              <h1>MAYZER</h1>
              <p>Sistema de Gestión · SENA Palmira</p>
            </div>
          </div>

          <div className={styles['login-body']}>
            <h2>Iniciar sesión</h2>
            <p className={styles.subtitle}>
              Ingresa tus credenciales para continuar
            </p>

            <div className={styles['login-fields']} onKeyDown={handleKeyDown}>

              <div className={styles['login-input-wrap']}>
                <span className={styles['login-input-icon']}>
                  <Icon name="user" size={15} />
                </span>
                <input
                  name="nombre_usuario"
                  value={form.nombre_usuario}
                  onChange={cambiar}
                  placeholder="Usuario"
                  autoComplete="username"
                  autoFocus
                  disabled={cargando}
                  className={styles['login-input-padded']}
                />
              </div>

              <div className={styles['login-input-wrap']}>
                <span className={styles['login-input-icon']}>
                  <Icon name="lock" size={15} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="contrasena"
                  value={form.contrasena}
                  onChange={cambiar}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  disabled={cargando}
                  className={styles['login-input-padded-right']}
                />
                <button
                  type="button"
                  className={styles['login-toggle-pass']}
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icon name={showPass ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>

              {error && (
                <div className={styles['login-error']}>
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={enviar}
                disabled={cargando}
                className={styles['login-submit']}
                style={{ opacity: cargando ? 0.75 : 1 }}
              >
                {cargando ? 'Verificando...' : (
                  <>
                    <Icon name="log-in" size={15} className={styles['btn-icon']} />
                    Entrar al sistema
                  </>
                )}
              </button>
            </div>

            <div className={styles['login-footer']}>
              <a href="/solicitud" className={styles['login-footer-link']}>
                <Icon name="file-text" size={12} className={styles['btn-icon-sm']} />
                Formulario de inscripción
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
