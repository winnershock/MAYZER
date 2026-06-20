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
import api    from '../../services/api.js';
import styles from './Login.module.css';

const STORAGE_KEY = 'login_bloqueo'; // { nombre_usuario, bloqueadoHasta } — sobrevive recargas

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
  // ── Estado de bloqueo ────────────────────────────────────────────────────
  // Se inicializa leyendo sessionStorage para que, si la página se recarga
  // mientras hay un bloqueo activo, el countdown se siga mostrando de
  // inmediato (sin esperar la respuesta del backend ni a otro render).
  const bloqueoGuardado = (() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.bloqueadoHasta && new Date(data.bloqueadoHasta) > new Date()) return data;
      return null;
    } catch {
      return null;
    }
  })();

  const [form,     setForm]     = useState({
    nombre_usuario: bloqueoGuardado?.nombre_usuario || '',
    contrasena: '',
  });
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');

  const [bloqueadoHasta,    setBloqueadoHastaState] = useState(bloqueoGuardado?.bloqueadoHasta ? new Date(bloqueoGuardado.bloqueadoHasta) : null);
  const [tiempoRestante,    setTiempoRestante]    = useState(0);    // ms
  const [intentosRestantes, setIntentosRestantes] = useState(3);
  const intervaloRef     = useRef(null);
  const debounceRef      = useRef(null);
  const hidratado        = useRef(false); // evita que el efecto de persistencia borre sessionStorage antes de confirmar con el backend
  const bloqueadoHastaRef = useRef(bloqueadoHasta); // siempre con el valor más reciente, para que el intervalo no dependa de recrearse
  const enviandoRef       = useRef(false); // guard SÍNCRONO contra doble submit (setCargando es asíncrono y no alcanza a bloquear un segundo enviar() disparado en el mismo tick — ej. Enter + click casi simultáneos)

  // setBloqueadoHasta: además de actualizar el estado (para el render),
  // ignora valores que representen el MISMO instante que el actual — así
  // evitamos que respuestas repetidas del backend (confirmación al montar +
  // debounce del input, ambas devolviendo el mismo bloqueo) disparen un
  // nuevo objeto Date con igual valor y reinicien el intervalo del countdown
  // de forma innecesaria.
  const setBloqueadoHasta = useCallback((valor) => {
    const actual = bloqueadoHastaRef.current;
    const mismoInstante =
      valor && actual && new Date(valor).getTime() === new Date(actual).getTime();
    if (mismoInstante) return;
    bloqueadoHastaRef.current = valor;
    setBloqueadoHastaState(valor);
  }, []);

  const { login }  = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();

  // Confirmar contra el backend al montar: si el bloqueo ya expiró o fue
  // liberado en el servidor, se libera aquí también; si sigue vigente,
  // se sincroniza el valor exacto (corrige posibles desfases de reloj).
  useEffect(() => {
    if (!bloqueoGuardado?.nombre_usuario) { hidratado.current = true; return; }
    api.get('/auth/estado-bloqueo', { params: { nombre_usuario: bloqueoGuardado.nombre_usuario } })
      .then(({ data }) => {
        if (data?.bloqueadoHasta) {
          setBloqueadoHasta(new Date(data.bloqueadoHasta));
        } else {
          setBloqueadoHasta(null);
          sessionStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => { /* si falla la consulta, se mantiene el valor local hasta el próximo intento */ })
      .finally(() => { hidratado.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistir el bloqueo vigente para sobrevivir recargas/cierres de pestaña.
  // Se ignora hasta que termine la hidratación inicial para no borrar
  // sessionStorage con el valor vacío transitorio del primer render.
  useEffect(() => {
    if (!hidratado.current) return;
    if (bloqueadoHasta && form.nombre_usuario.trim()) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        nombre_usuario: form.nombre_usuario.trim(),
        bloqueadoHasta: bloqueadoHasta.toISOString(),
      }));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [bloqueadoHasta, form.nombre_usuario]);

  // ── Consultar bloqueo al escribir el usuario (debounced) ────────────────
  // Cubre el caso de otra pestaña/dispositivo: si el usuario tecleado ya
  // tiene un bloqueo activo en el servidor, se muestra el countdown aunque
  // esta pestaña nunca haya intentado loguearse con ese usuario.
  useEffect(() => {
    const nombre = form.nombre_usuario.trim();
    if (!nombre) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.get('/auth/estado-bloqueo', { params: { nombre_usuario: nombre } })
        .then(({ data }) => {
          if (data?.bloqueadoHasta) {
            setBloqueadoHasta(new Date(data.bloqueadoHasta));
          }
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [form.nombre_usuario]);

  // ── Countdown activo mientras hay bloqueo ─────────────────────────────
  // Único intervalo, creado una sola vez al montar el componente. Lee el
  // bloqueo vigente desde bloqueadoHastaRef (siempre actualizada) en lugar
  // de depender de un useEffect que se reinicia cada vez que se recibe un
  // nuevo objeto Date — así el contador nunca se "congela" por reinicios
  // del intervalo, ni se ve afectado si dos respuestas async llegan casi
  // al mismo tiempo.
  useEffect(() => {
    function tick() {
      const actual = bloqueadoHastaRef.current;
      if (!actual) { setTiempoRestante(0); return; }

      const restante = new Date(actual) - Date.now();
      if (restante <= 0) {
        setBloqueadoHasta(null);
        setTiempoRestante(0);
        setIntentosRestantes(3);
        setError('');
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        setTiempoRestante(restante);
      }
    }

    tick(); // actualizar inmediatamente
    intervaloRef.current = setInterval(tick, 500);
    return () => clearInterval(intervaloRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bloqueado = bloqueadoHasta && new Date(bloqueadoHasta) > new Date();

  // ── Handlers ────────────────────────────────────────────────────────────
  const cambiar = useCallback(e => {
    if (bloqueado) return; // ignorar input durante bloqueo
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }, [bloqueado]);

  async function enviar(e) {
    e?.preventDefault();
    if (enviandoRef.current || cargando || bloqueado) return; // guard síncrono: bloquea el segundo enviar() aunque cargando aún no se haya re-renderizado
    if (!form.nombre_usuario.trim() || !form.contrasena) {
      setError('Por favor completa todos los campos');
      return;
    }

    enviandoRef.current = true;
    setCargando(true);
    setError('');

    try {
      await login(form.nombre_usuario.trim(), form.contrasena);
      sessionStorage.removeItem(STORAGE_KEY);
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
      enviandoRef.current = false;
      setCargando(false);
    }
  }

  const handleKeyDown = e => {
    if (e.key !== 'Enter' || bloqueado) return;
    e.preventDefault(); // evita que Enter también dispare un submit nativo del formulario además de enviar()
    enviar(e);
  };

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
