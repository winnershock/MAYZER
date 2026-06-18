/**
 * pages/auth/Login.jsx
 * Responsabilidad : Página de inicio de sesión con bloqueo progresivo de seguridad.
 * Exporta         : Login (default)
 * Depende de      : hooks/useAuth.jsx, hooks/useToast.jsx
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import Icon         from '../../components/common/Icon.jsx';
import styles       from './Login.module.css';

// ── Utilidades de formato ──────────────────────────────────────────────────
function formatearTiempo(ms) {
  const totalSeg = Math.ceil(ms / 1000);
  if (totalSeg <= 0) return '0 seg';
  if (totalSeg < 60) return `${totalSeg} seg`;
  const min = Math.floor(totalSeg / 60);
  const seg  = totalSeg % 60;
  if (min < 60) return seg > 0 ? `${min} min ${seg} seg` : `${min} min`;
  const h = Math.ceil(totalSeg / 3600);
  return `${h} h`;
}

export default function LoginPage() {
  const [form,     setForm]     = useState({ nombre_usuario: '', contrasena: '' });
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');

  // ── Estado de bloqueo ────────────────────────────────────────────────────
  const [bloqueadoHasta,    setBloqueadoHasta]    = useState(null); // Date | null
  const [tiempoRestante,    setTiempoRestante]    = useState(0);    // ms
  const [intentosRestantes, setIntentosRestantes] = useState(3);
  const intervaloRef = useRef(null);

  const { login }  = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();

  // ── Countdown activo mientras hay bloqueo ─────────────────────────────
  useEffect(() => {
    if (!bloqueadoHasta) { setTiempoRestante(0); return; }

    function tick() {
      const restante = new Date(bloqueadoHasta) - Date.now();
      if (restante <= 0) {
        // Bloqueo expirado → desbloquear automáticamente
        setBloqueadoHasta(null);
        setTiempoRestante(0);
        setIntentosRestantes(3);
        setError('');
        clearInterval(intervaloRef.current);
      } else {
        setTiempoRestante(restante);
      }
    }

    tick(); // actualizar inmediatamente
    intervaloRef.current = setInterval(tick, 500);
    return () => clearInterval(intervaloRef.current);
  }, [bloqueadoHasta]);

  const bloqueado = bloqueadoHasta && new Date(bloqueadoHasta) > new Date();

  // ── Handlers ────────────────────────────────────────────────────────────
  const cambiar = useCallback(e => {
    if (bloqueado) return; // ignorar input durante bloqueo
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }, [bloqueado]);

  async function enviar(e) {
    e?.preventDefault();
    if (cargando || bloqueado) return; // no contar intentos durante bloqueo
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
      const data    = err.response?.data;
      const mensaje = data?.error || 'Usuario o contraseña incorrectos';

      // El backend devuelve bloqueadoHasta cuando activa un bloqueo
      if (data?.bloqueadoHasta) {
        setBloqueadoHasta(new Date(data.bloqueadoHasta));
        setIntentosRestantes(0);
        setForm(p => ({ ...p, contrasena: '' })); // limpiar campo
      } else if (typeof data?.intentosRestantes === 'number') {
        setIntentosRestantes(data.intentosRestantes);
      }

      setError(mensaje);
      toast(mensaje, 'danger');
    } finally {
      setCargando(false);
    }
  }

  const handleKeyDown = e => { if (e.key === 'Enter' && !bloqueado) enviar(e); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles['login-page']}>
      <div className={styles['login-card-wrap']}>
        <div className={styles['login-card']}>

          {/* Header */}
          <div className={styles['login-header']}>
            <div className={styles['login-header-logo']}>
              <img src="/logo-sena.svg" alt="SENA" />
            </div>
            <div className={styles['login-header-text']}>
              <h1>MAYZER</h1>
              <p>Sistema de Gestión · SENA Palmira</p>
            </div>
          </div>

          {/* Body */}
          <div className={styles['login-body']}>
            <h2>Iniciar sesión</h2>
            <p className={styles.subtitle}>
              Ingresa tus credenciales para continuar
            </p>

            <div className={styles['login-fields']} onKeyDown={handleKeyDown}>

              {/* Usuario */}
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

              {/* Contraseña — deshabilitada durante bloqueo */}
              <div className={styles['login-input-wrap']}>
                <span className={styles['login-input-icon']}>
                  <Icon name="lock" size={15} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="contrasena"
                  value={form.contrasena}
                  onChange={cambiar}
                  placeholder={bloqueado ? 'Campo bloqueado temporalmente' : 'Contraseña'}
                  autoComplete="current-password"
                  disabled={cargando || bloqueado}
                  className={styles['login-input-padded-right']}
                />
                <button
                  type="button"
                  className={styles['login-toggle-pass']}
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={bloqueado}
                >
                  <Icon name={showPass ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>

              {/* Bloqueo activo: countdown */}
              {bloqueado && (
                <div className={styles['login-bloqueo']}>
                  <Icon name="clock" size={14} />
                  <span>
                    Bloqueado — intenta en{' '}
                    <strong>{formatearTiempo(tiempoRestante)}</strong>
                  </span>
                </div>
              )}

              {/* Intentos restantes (solo cuando no está bloqueado y ha fallado) */}
              {!bloqueado && intentosRestantes < 3 && intentosRestantes > 0 && (
                <div className={styles['login-intentos']}>
                  <Icon name="alert-triangle" size={13} />
                  <span>
                    {intentosRestantes} intento{intentosRestantes !== 1 ? 's' : ''} restante{intentosRestantes !== 1 ? 's' : ''} antes del bloqueo
                  </span>
                </div>
              )}

              {/* Error inline */}
              {error && !bloqueado && (
                <div className={styles['login-error']}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={enviar}
                disabled={cargando || bloqueado}
                className={styles['login-submit']}
                style={{ opacity: (cargando || bloqueado) ? 0.65 : 1 }}
              >
                {bloqueado ? (
                  <>
                    <Icon name="lock" size={15} className={styles['btn-icon']} />
                    Bloqueado ({formatearTiempo(tiempoRestante)})
                  </>
                ) : cargando ? 'Verificando...' : (
                  <>
                    <Icon name="log-in" size={15} className={styles['btn-icon']} />
                    Entrar al sistema
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
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
