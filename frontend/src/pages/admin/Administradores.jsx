
import { useState, useEffect, useCallback } from 'react';
import { AdminUsuarioService } from '../../services';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import Paginador from '../../components/common/Paginador.jsx';
import s from './Administradores.module.css';
import { formatearFechaHora } from '../../utils/fecha.js';

const LIMITE = 25;

export default function Administradores() {
  const [admins, setAdmins]   = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [pagina, setPagina] = useState(1);
  const toast = useToast();

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const { data } = await AdminUsuarioService.listar();
      setAdmins(data);
    } catch {
      toast('Error al cargar administradores', 'danger');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function toggleEstado(admin) {
    const accion = admin.activo ? 'desactivar' : 'activar';
    setConfirmState({
      mensaje: `¿Deseas ${accion} la cuenta de ${admin.nombre_completo}?`,
      labelConfirmar: accion.charAt(0).toUpperCase() + accion.slice(1),
      variante: accion === 'desactivar' ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmState(null);
        setProcesando(admin.id);
        try {
          await AdminUsuarioService.toggleEstado(admin.id, accion);
          toast(`Cuenta ${accion === 'activar' ? 'activada' : 'desactivada'} correctamente`, 'sena');
          cargar();
        } catch (e) {
          toast(e.response?.data?.error || 'Error al actualizar cuenta', 'danger');
        } finally {
          setProcesando(null);
        }
      },
    });
  }

  const fmt = formatearFechaHora;

  const totalPaginas  = Math.max(1, Math.ceil(admins.length / LIMITE));
  const adminsPagina  = admins.slice((pagina - 1) * LIMITE, pagina * LIMITE);

  return (
    <div className="page-inner">
      <div className="page-header">
        <div>
          <h2>Administradores</h2>
          <p className="text-muted">Gestión de cuentas de administrador del sistema</p>
        </div>
        <button className="btn btn-sena" onClick={cargar}>Actualizar</button>
      </div>

      <div className={`card ${s.cardTable}`}>
        {cargando ? (
          <div className={s.cargando}>Cargando...</div>
        ) : admins.length === 0 ? (
          <div className={s.estadoVacio}>
            No se encontraron cuentas de administrador.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Administrador</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Último login</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {adminsPagina.map(a => (
                <tr key={a.id}>
                  <td>
                    <div className={s.adminNombre}>
                      <div className={`${s.adminAvatar} ${a.activo ? s.adminAvatarActivo : s.adminAvatarInactivo}`}>
                        {a.nombre_completo.charAt(0).toUpperCase()}
                      </div>
                      <span className={s.adminNombreTexto}>{a.nombre_completo}</span>
                    </div>
                  </td>
                  <td><code className={s.codigoUsuario}>{a.nombre_usuario}</code></td>
                  <td className={s.emailTexto}>{a.email}</td>
                  <td className={s.fechaLogin}>{fmt(a.ultimo_login)}</td>
                  <td>
                    <span className={`badge badge-${a.activo ? 'success' : 'danger'}`}>
                      {a.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${a.activo ? 'btn-danger' : 'btn-sena'}`}
                      onClick={() => toggleEstado(a)}
                      disabled={procesando === a.id}
                    >
                      {procesando === a.id ? '...' : a.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={admins.length}
          limite={LIMITE}
          onChange={setPagina}
        />
      </div>

      <div className={`card ${s.notaInfo}`}>
        <p className={s.notaInfoTexto}>
          <strong>ℹ️ Nota:</strong> Como Super Usuario, puedes activar o desactivar cuentas de administrador.
          Una cuenta desactivada no podrá iniciar sesión en el sistema. Esta acción no elimina datos ni sesiones activas anteriores.
        </p>
      </div>
      <ConfirmDialog
        open={!!confirmState}
        mensaje={confirmState?.mensaje}
        labelConfirmar={confirmState?.labelConfirmar}
        variante={confirmState?.variante || 'danger'}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
