/**
 * components/grupos/ModalAdministrar.jsx
 * Responsabilidad : Modal de administración de aspirantes dentro de un grupo.
 * Exporta         : ModalAdministrar (default)
 * Usado en        : pages/admin/Grupos.jsx
 * Depende de      : services/index.js, hooks/useToast.jsx, components/common/ConfirmDialog.jsx,
 *                   components/common/Icon.jsx, utils/informeGrupo.js
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import s from './ModalAdministrar.module.css';
import { AspiranteService, GrupoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import Icon from '../common/Icon.jsx';
import { descargarInformeGrupo } from '../../utils/informeGrupo.js';

export default function ModalAdministrar({ grupoId, onClose, onDone }) {
  const [grupo,        setGrupo]        = useState(null);
  const [asignados,    setAsignados]    = useState([]);
  const [preAprobados, setPreAprobados] = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [operando,     setOperando]     = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const abortRef = useRef(null);
  const toast = useToast();

  const cargar = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setCargando(true);
    try {
      const [detalleRes, todosRes] = await Promise.all([
        GrupoService.obtener(grupoId),
        AspiranteService.listar({ estado: 'PRE_APROBADO', limit: 200 }),
      ]);

      if (ctrl.signal.aborted) return;

      const grp      = detalleRes.data;
      const miembros = grp?.aspirantes || [];
      setGrupo(grp);
      setAsignados(miembros);

      const libres = (todosRes.data?.aspirantes || []).filter(a => {
        if (miembros.some(m => m.id === a.id)) return false;
        // Solo mostrar aspirantes cuyo curso solicitado coincida con el del grupo
        const cursoGrp = (grp?.curso_nombre || '').toLowerCase().trim();
        const cursoAsp = (a.curso_requerido || '').toLowerCase().trim();
        if (cursoGrp && cursoAsp && cursoGrp !== cursoAsp) return false;
        return true;
      });
      setPreAprobados(libres);
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      toast('Error al cargar datos del grupo', 'danger');
    } finally {
      if (!ctrl.signal.aborted) setCargando(false);
    }
  }, [grupoId, toast]);

  useEffect(() => {
    cargar();
    return () => { abortRef.current?.abort(); };
  }, [cargar]);

  async function asignar(aspirante) {
    setOperando(aspirante.id);
    try {
      const { data } = await AspiranteService.asignar(aspirante.id, grupoId);
      if (data?.correoError) {
        toast(`${aspirante.nombre_completo} asignado al grupo, pero hubo un error al enviar el correo de notificación.`, 'warn');
      } else if (data?.sinEmail) {
        toast(`${aspirante.nombre_completo} asignado al grupo. No tiene correo registrado.`, 'warn');
      } else {
        toast(`${aspirante.nombre_completo} asignado al grupo. Notificación enviada por correo.`, 'sena');
      }
      setAsignados(prev => [...prev, { ...aspirante }]);
      setPreAprobados(prev => prev.filter(a => a.id !== aspirante.id));
      setGrupo(g => g ? { ...g, inscritos: (Number(g.inscritos) || 0) + 1 } : g);
    } catch (e) {
      toast(e.response?.data?.error || 'Error al asignar', 'danger');
    } finally {
      setOperando(null);
    }
  }

  function quitar(aspirante) {
    setConfirmState({
      mensaje: `¿Quitar a ${aspirante.nombre_completo} del grupo? Volverá a estado pre-aprobado.`,
      labelConfirmar: 'Quitar',
      onConfirm: async () => {
        setConfirmState(null);
        setOperando(aspirante.id);
        try {
          await AspiranteService.desasignar(aspirante.id);
          toast(`${aspirante.nombre_completo} removido del grupo`, 'sena');
          setAsignados(prev => prev.filter(a => a.id !== aspirante.id));
          setPreAprobados(prev => [...prev, { ...aspirante }]);
          setGrupo(g => g ? { ...g, inscritos: Math.max(0, (Number(g.inscritos) || 1) - 1) } : g);
        } catch (e) {
          toast(e.response?.data?.error || 'Error al quitar aspirante', 'danger');
        } finally {
          setOperando(null);
        }
      },
    });
  }

  const inscritos      = asignados.length;
  const cupoMaximo     = grupo?.cupo_maximo || 0;
  const cupoDisponible = cupoMaximo - inscritos;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-lg ${s['modal-wide']}`}>

        {/* Encabezado — nombre y código en filas distintas */}
        <div className={`modal-title ${s['titulo-grupo']}`}>
          Administrar aspirantes
        </div>
        {grupo && (
          <div className={s['grupo-info-wrap']}>
            <div className={s['grupo-nombre']}>
              {grupo.nombre}
            </div>
            {grupo.codigo && (
              <div className={s['grupo-codigo']}>
                Código: <span className={s['codigo-inline']}>{grupo.codigo}</span>
              </div>
            )}
          </div>
        )}
        <p className={s.subtitulo}>
          Cupo: {inscritos}/{cupoMaximo}
          {cupoDisponible > 0
            ? <span className={s['cupo-ok']}>· {cupoDisponible} disponible{cupoDisponible !== 1 ? 's' : ''}</span>
            : <span className={s['cupo-lleno']}>· Sin cupo disponible</span>
          }
        </p>

        {cargando ? (
          <div className="loading-wrap"><div className="spinner" /><p>Cargando...</p></div>
        ) : (
          <div className={s['dos-columnas']}>

            {/* Asignados */}
            <div>
              <div className={s['seccion-titulo2']}>
                <span className={s['badge-count-verde']}>{inscritos}</span>
                Asignados al grupo
              </div>
              <div className={s['lista-scroll']}>
                {inscritos === 0 ? (
                  <div className={s['lista-vacia']}>
                    Sin aspirantes asignados
                  </div>
                ) : asignados.map(a => (
                  <div key={a.id} className={s['asp-row--verde']}>
                    <div className={s['initials--sm-verde']}>
                      {(a.nombre_completo || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className={s['asp-info']}>
                      <div className={s['asp-nombre']}>{a.nombre_completo}</div>
                      <div className={s['asp-estado-verde']}>
                        {a.curso_requerido || 'asignado'}
                      </div>
                    </div>
                    <button
                      className={`btn btn-xs ${s['btn-desasignar']}`}
                      disabled={operando === a.id}
                      onClick={() => quitar(a)}
                      title="Quitar del grupo"
                    >
                      {operando === a.id ? '...' : <><Icon name="x" size={11} /> Quitar</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-aprobados disponibles */}
            <div>
              <div className={s['seccion-titulo2']}>
                <span className={s['badge-count-brand']}>{preAprobados.length}</span>
                Pre-aprobados disponibles
              </div>
              <div className={s['lista-scroll']}>
                {preAprobados.length === 0 ? (
                  <div className={s['lista-vacia']}>
                    Sin aspirantes pre-aprobados disponibles
                  </div>
                ) : preAprobados.map(a => (
                  <div key={a.id} className={s['asp-row--neutro']}>
                    <div className={s['initials--sm-gris']}>
                      {(a.nombre_completo || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className={s['asp-info']}>
                      <div className={s['asp-nombre']}>{a.nombre_completo}</div>
                      <div className={s['asp-empresa']}>{a.empresa}</div>
                    </div>
                    <button
                      className={`btn btn-sm ${s['btn-asignar']}`}
                      style={{ opacity: cupoDisponible <= 0 ? 0.5 : 1 }}
                      disabled={operando === a.id || cupoDisponible <= 0}
                      onClick={() => asignar(a)}
                      title={cupoDisponible <= 0 ? 'Grupo sin cupo disponible' : 'Asignar al grupo'}
                    >
                      {operando === a.id ? '...' : '+ Asignar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`modal-actions ${s['modal-actions-top']}`}>
          <button className="btn btn-outline btn-sm" disabled={inscritos === 0}
            onClick={() => descargarInformeGrupo(grupo, toast, GrupoService)}>
            <Icon name="download" size={13} /> Descargar Excel
          </button>
          <button className="btn btn-outline" onClick={() => { onDone?.(); onClose(); }}>
            Cerrar
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmState}
        mensaje={confirmState?.mensaje}
        labelConfirmar={confirmState?.labelConfirmar}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
