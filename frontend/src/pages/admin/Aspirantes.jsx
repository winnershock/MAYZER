import { useState, useEffect, useCallback, useMemo } from 'react';
import { AspiranteService, CursoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import s from './Aspirantes.module.css';
import Paginador from '../../components/common/Paginador.jsx';
import { AspEstadoBadge } from '../../components/common/EstadoBadge.jsx';
import ModalRechazo      from '../../components/aspirantes/ModalRechazo.jsx';
import ModalAsignar      from '../../components/aspirantes/ModalAsignar.jsx';
import ModalDetalle      from '../../components/aspirantes/ModalDetalle.jsx';
import AccionesAspirante from '../../components/aspirantes/AccionesAspirante.jsx';
import ConfirmDialog     from '../../components/common/ConfirmDialog.jsx';
import FiltrosBar        from '../../components/common/FiltrosBar.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ASP_ESTADOS_SELECT, API_BASE } from '../../constants/index.js';

const CAMPOS_FILTRO = ['aspirante', 'empresa', 'curso', 'estado', 'anio', 'mes'];

const ESTADO_ACCION = {
  PENDIENTE:    { label: 'Pendientes',    color: '#e05500', acciones: ['pre-aprobar', 'rechazar'] },
  PRE_APROBADO: { label: 'Pre-aprobados', color: '#FF6719', acciones: ['asignar'] },
};

const FILTROS_INICIAL = { aspirante: '', empresa: '', estado: '', curso_id: '', anio: '', mes: '' };
const LIMITE = 25;

export default function Aspirantes() {
  const [aspirantes,       setAspirantes]       = useState([]);
  const [total,            setTotal]            = useState(0);
  const [cargando,         setCargando]         = useState(true);
  const [cursos,           setCursos]           = useState([]);
  const [filtros,          setFiltros]          = useState(FILTROS_INICIAL);
  const [pagina,           setPagina]           = useState(1);
  const [modal,            setModal]            = useState(null);
  const [alertaAsignacion, setAlertaAsignacion] = useState(null);
  const [seleccionados,    setSeleccionados]    = useState(new Set());
  const [estadoSeleccion,  setEstadoSeleccion]  = useState(null);
  const [confirmState,     setConfirmState]     = useState(null);

  const { esAdmin } = useAuth();
  const toast = useToast();

  useEffect(() => {
    CursoService.listar()
      .then(r => {
        const lista = r.data || [];
        setCursos(lista);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSeleccionados(new Set());
    setEstadoSeleccion(null);
    setAlertaAsignacion(null);
    setPagina(1);
  }, [filtros]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { limit: LIMITE, page: pagina };
      if (filtros.aspirante) params.aspirante = filtros.aspirante;
      if (filtros.empresa)   params.empresa   = filtros.empresa;
      if (filtros.estado)    params.estado    = filtros.estado;
      if (filtros.curso_id)  params.curso_id  = filtros.curso_id;
      if (filtros.anio)      params.anio      = filtros.anio;
      if (filtros.mes)       params.mes       = filtros.mes;

      const { data } = await AspiranteService.listar(params);
      setAspirantes(data.aspirantes || []);
      setTotal(data.total || 0);
    } catch {
      toast('Error al cargar aspirantes', 'danger');
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina, toast]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
  }, [cargar]);

  function actualizarEstadoLocal(id, nuevoEstado) {
    setAspirantes(prev => prev.map(a =>
      a.id === id ? { ...a, estado_proceso: nuevoEstado } : a
    ));
  }

  const preAprobar = useCallback(async (id) => {
    actualizarEstadoLocal(id, 'PRE_APROBADO');
    try {
      const { data } = await AspiranteService.preAprobar(id);
      if (data?.correoError) {
        toast('Aspirante pre-aprobado, pero hubo un error al enviar el correo: ' + data.correoError, 'warn');
      } else if (data?.sinEmail) {
        toast('Aspirante pre-aprobado. El solicitante no tiene correo registrado, no se envió notificación.', 'warn');
      } else {
        toast('Aspirante pre-aprobado. Notificación enviada al solicitante por correo.', 'sena');
      }
    } catch (e) {
      actualizarEstadoLocal(id, 'PENDIENTE');
      toast(e.response?.data?.error || 'Error al pre-aprobar', 'danger');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const abrirRechazo = useCallback((aspirante) => setModal({ tipo: 'rechazar', aspirante }), []);
  function onRechazoDone(id) { actualizarEstadoLocal(id, 'RECHAZADO'); setModal(null); }

  function restablecer(id) {
    setConfirmState({
      mensaje: '¿Devolver este aspirante a estado PENDIENTE?',
      labelConfirmar: 'Restablecer',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await AspiranteService.restablecer(id);
          actualizarEstadoLocal(id, 'PENDIENTE');
          toast('Aspirante restablecido a PENDIENTE', 'sena');
        } catch (e) {
          toast(e.response?.data?.error || 'Error al restablecer', 'danger');
        }
      },
    });
  }

  function puedeSeleccionar(aspirante) {
    if (!esAdmin) return false;
    if (!ESTADO_ACCION[aspirante.estado_proceso]) return false;
    if (estadoSeleccion && aspirante.estado_proceso !== estadoSeleccion) return false;
    return true;
  }

  function toggleSeleccion(aspirante) {
    const estado = aspirante.estado_proceso;

    if (seleccionados.size === 0) {
      if (!ESTADO_ACCION[estado]) {
        toast(`No hay acciones masivas para aspirantes en estado "${estado}"`, 'warn');
        return;
      }
      setSeleccionados(new Set([aspirante.id]));
      setEstadoSeleccion(estado);
      return;
    }

    if (estado !== estadoSeleccion) {
      toast(`Solo puedes seleccionar aspirantes en estado "${ESTADO_ACCION[estadoSeleccion]?.label}". Limpia la selección para cambiar.`, 'warn');
      return;
    }

    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(aspirante.id)) {
        next.delete(aspirante.id);
        if (next.size === 0) setEstadoSeleccion(null);
      } else {
        next.add(aspirante.id);
      }
      return next;
    });
  }

  function toggleTodos() {
    const estadoTarget = estadoSeleccion || 'PENDIENTE';
    if (!ESTADO_ACCION[estadoTarget]) return;
    const elegibles = aspirantes.filter(a => a.estado_proceso === estadoTarget);
    if (elegibles.length === 0) return;

    if (seleccionados.size === elegibles.length && estadoSeleccion === estadoTarget) {
      limpiarSeleccion();
    } else {
      setSeleccionados(new Set(elegibles.map(a => a.id)));
      setEstadoSeleccion(estadoTarget);
    }
  }

  function limpiarSeleccion() {
    setSeleccionados(new Set());
    setEstadoSeleccion(null);
    setAlertaAsignacion(null);
  }

  const aspirantesSeleccionados = useMemo(
    () => aspirantes.filter(a => seleccionados.has(a.id)),
    [aspirantes, seleccionados]
  );
  const haySeleccion        = seleccionados.size > 0;
  const accionesDisponibles = useMemo(
    () => estadoSeleccion ? ESTADO_ACCION[estadoSeleccion]?.acciones || [] : [],
    [estadoSeleccion]
  );

  async function preAprobarSeleccionados() {
    await Promise.allSettled(aspirantesSeleccionados.map(a => preAprobar(a.id)));
    limpiarSeleccion();
  }

  function abrirRechazoSeleccionado() {
    if (aspirantesSeleccionados.length === 1) {
      abrirRechazo(aspirantesSeleccionados[0]);
    } else {
      setModal({ tipo: 'rechazar', aspirante: aspirantesSeleccionados[0], cola: aspirantesSeleccionados.slice(1) });
    }
  }

  function onRechazoDoneLote(id) {
    actualizarEstadoLocal(id, 'RECHAZADO');
    const colaResto = modal?.cola || [];
    if (colaResto.length > 0) {
      const [siguiente, ...resto] = colaResto;
      setModal({ tipo: 'rechazar', aspirante: siguiente, cola: resto });
    } else {
      setModal(null);
      limpiarSeleccion();
    }
  }

  function onAsignarDone(idsAsignados) {
    idsAsignados.forEach(id => actualizarEstadoLocal(id, 'ASIGNADO'));
    setModal(null);
    limpiarSeleccion();
  }

  const f = useCallback((k, v) => setFiltros(p => ({ ...p, [k]: v })), []);
  const limpiar = useCallback(() => { setFiltros(FILTROS_INICIAL); setPagina(1); }, []);

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

  const { pendientes, preAprobados } = useMemo(() => ({
    pendientes:   aspirantes.filter(a => a.estado_proceso === 'PENDIENTE').length,
    preAprobados: aspirantes.filter(a => a.estado_proceso === 'PRE_APROBADO').length,
  }), [aspirantes]);

  const elegiblesMismoEstado = useMemo(
    () => estadoSeleccion ? aspirantes.filter(a => a.estado_proceso === estadoSeleccion) : [],
    [aspirantes, estadoSeleccion]
  );
  const todosSeleccionados = elegiblesMismoEstado.length > 0 &&
    seleccionados.size === elegiblesMismoEstado.length;

  const infoEstadoSel = estadoSeleccion ? ESTADO_ACCION[estadoSeleccion] : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <p>
            {total} aspirantes en total
            {pendientes   > 0 && <> · <span className={s.statPendiente}>{pendientes} pendientes</span></>}
            {preAprobados > 0 && <> · <span className={s.statPreAprobado}>{preAprobados} listos para asignar</span></>}
          </p>
        </div>
      </div>

      {alertaAsignacion && (
        <div className={`alert alert-warn ${s.alertaSeleccion}`}>
          <Icon name="alert-triangle" size={16} />
          <span>{alertaAsignacion}</span>
          <button className={s.alertaCerrar} onClick={() => setAlertaAsignacion(null)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {haySeleccion && esAdmin && (
        <div
          className={s.barraAcciones}
          style={{
            background: infoEstadoSel?.color
              ? `color-mix(in srgb, ${infoEstadoSel.color} 10%, white)`
              : 'var(--brand-muted)',
            border: `1.5px solid ${infoEstadoSel?.color || 'var(--brand)'}`,
          }}
        >
          <div className={s.barraAccionesInfo}>
            <div
              className={s.barraAccionesCirculo}
              style={{ background: infoEstadoSel?.color || 'var(--brand)' }}
            >
              <Icon name="check" size={14} color="white" />
            </div>
            <div>
              <span className={s.barraAccionesCount}>
                {seleccionados.size} aspirante{seleccionados.size !== 1 ? 's' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
              </span>
              {infoEstadoSel && (
                <span className={s.barraAccionesEstado}>
                  — Estado: {infoEstadoSel.label}
                </span>
              )}
            </div>
          </div>
          <div className={s.barraAccionesBtns}>
            {accionesDisponibles.includes('pre-aprobar') && (
              <button className="btn btn-outline btn-sm" onClick={preAprobarSeleccionados}>
                <Icon name="check-circle" size={13} /> Pre-aprobar todos
              </button>
            )}
            {accionesDisponibles.includes('rechazar') && (
              <button className="btn btn-outline btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={abrirRechazoSeleccionado}>
                <Icon name="x-circle" size={13} /> Rechazar todos
              </button>
            )}
            {accionesDisponibles.includes('asignar') && (
              <button className="btn btn-outline btn-sm"
                style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}
                onClick={() => setModal({ tipo: 'asignar', aspirantes: aspirantesSeleccionados })}>
                <Icon name="chevron-right" size={13} /> Asignar a grupo
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={limpiarSeleccion}>
              <Icon name="x" size={13} /> Limpiar
            </button>
          </div>
        </div>
      )}

      <FiltrosBar
        campos={CAMPOS_FILTRO}
        valores={filtros}
        onChange={f}
        onLimpiar={limpiar}
        cursos={cursos}
      />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Lista de aspirantes</span>
          <span className={s.totalRegistros}>{total} registros</span>
        </div>
        <div className="table-wrap">
          {cargando ? (
            <div className="loading-wrap"><div className="spinner" /><p>Cargando aspirantes...</p></div>
          ) : aspirantes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="user" size={22} /></div>
              <div className="empty-text">Sin aspirantes encontrados</div>
              <div className="empty-sub">Ajusta los filtros para ver resultados</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {esAdmin && (
                    <th className={s.colCheck}>
                      <button
                        type="button"
                        aria-label="Seleccionar todos"
                        onClick={toggleTodos}
                        style={{
                          background: todosSeleccionados
                            ? (infoEstadoSel?.color || 'var(--brand)')
                            : 'transparent',
                          border: `2px solid ${infoEstadoSel?.color || 'var(--border2)'}`,
                          borderRadius: 6,
                          width: 18, height: 18,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {todosSeleccionados && <Icon name="check" size={10} color="white" />}
                      </button>
                    </th>
                  )}
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Empresa</th>
                  <th>Curso solicitado</th>
                  <th>Estado</th>
                  <th>PDF</th>
                  <th>Detalle</th>
                  {esAdmin && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {aspirantes.map(a => {
                  const estaSeleccionado = seleccionados.has(a.id);
                  const puedeCheck = puedeSeleccionar(a);
                  const bloqueado = !puedeCheck && haySeleccion && a.estado_proceso !== estadoSeleccion;
                  const colorSel = infoEstadoSel?.color || 'var(--brand)';

                  return (
                    <tr
                      key={a.id}
                      onClick={puedeCheck ? () => toggleSeleccion(a) : undefined}
                      style={{
                        cursor: puedeCheck ? 'pointer' : 'default',
                        background: estaSeleccionado
                          ? `color-mix(in srgb, ${colorSel} 12%, white)`
                          : undefined,
                        opacity: bloqueado ? 0.45 : 1,
                        outline: estaSeleccionado ? `2px solid ${colorSel}` : undefined,
                        outlineOffset: -2,
                        transition: 'background 0.15s, opacity 0.15s',
                      }}
                    >
                      {esAdmin && (
                        <td className={s.colCheck}
                          onClick={e => { e.stopPropagation(); if (puedeCheck || estaSeleccionado) toggleSeleccion(a); }}>
                          {(puedeCheck || estaSeleccionado) ? (
                            <span
                              className={s.checkBox}
                              style={{
                                border: `2px solid ${estaSeleccionado ? colorSel : 'var(--border2)'}`,
                                background: estaSeleccionado ? colorSel : 'transparent',
                              }}
                            >
                              {estaSeleccionado && <Icon name="check" size={10} color="white" />}
                            </span>
                          ) : (
                            <span className={s.checkPlaceholder} />
                          )}
                        </td>
                      )}
                      <td>
                        <div className={s.nombreCompleto}>{a.nombre_completo}</div>
                      </td>
                      <td className={s.celdaDocumento}>
                        {a.tipo_documento}: {a.numero_documento || <span className={s.docFaltante}>—</span>}
                      </td>
                      <td className={s.celdaSm}>{a.empresa}</td>
                      <td className={s.celdaSm}>{a.curso_requerido}</td>
                      <td><AspEstadoBadge estado={a.estado_proceso} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        {a.documento_pdf ? (
                          <a href={API_BASE + '/uploads/documentos/' + a.documento_pdf}
                            target="_blank" rel="noopener noreferrer"
                            className="btn btn-sena btn-sm">Ver</a>
                        ) : (
                          <span className={s.sinGrupo}>—</span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setModal({ tipo: 'detalle', aspirante: a })}
                        >
                          <Icon name="eye" size={13} /> Ver todo
                        </button>
                      </td>
                      {esAdmin && (
                        <td onClick={e => e.stopPropagation()}>
                          <AccionesAspirante
                            aspirante={a}
                            onPreAprobar={preAprobar}
                            onRechazar={abrirRechazo}
                            onAsignar={asp => setModal({ tipo: 'asignar', aspirantes: [asp] })}
                            onRestablecer={restablecer}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          limite={LIMITE}
          onChange={p => { setPagina(p); setSeleccionados(new Set()); setEstadoSeleccion(null); }}
        />
      </div>
      {modal?.tipo === 'detalle' && (
        <ModalDetalle aspirante={modal.aspirante} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'rechazar' && (
        <ModalRechazo
          aspirante={modal.aspirante}
          onClose={() => { setModal(null); limpiarSeleccion(); }}
          onDone={() => modal.cola ? onRechazoDoneLote(modal.aspirante.id) : onRechazoDone(modal.aspirante.id)}
        />
      )}
      {modal?.tipo === 'asignar' && (
        <ModalAsignar
          aspirantes={modal.aspirantes}
          onAlertaCurso={msg => setAlertaAsignacion(msg)}
          onClose={() => { setModal(null); limpiarSeleccion(); }}
          onDone={onAsignarDone}
        />
      )}
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
