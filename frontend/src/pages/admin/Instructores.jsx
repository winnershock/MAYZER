import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { InstructorService, GrupoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import s from './Instructores.module.css';
import BarraHoras from '../../components/instructores/BarraHoras.jsx';
import ModalInstructor from '../../components/instructores/ModalInstructor.jsx';
import ModalTodosInstructores from '../../components/instructores/ModalTodosInstructores.jsx';
import ModalHistorialInstructor from '../../components/instructores/ModalHistorialInstructor.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Icon from '../../components/common/Icon.jsx';
import { GrpEstadoBadge } from '../../components/common/EstadoBadge.jsx';
import { MESES, ANIOS_FILTRO } from '../../constants/index.js';
import { solapaCon, formatearFecha } from '../../utils/fecha.js';

export default function Instructores() {
  const [instructores,      setInstructores]      = useState([]);
  const [grupos,            setGrupos]            = useState([]);
  const [modalStack,        setModalStack]        = useState([]);
  const modal      = modalStack[modalStack.length - 1] ?? null;
  const pushModal  = (m) => setModalStack(prev => [...prev, m]);
  const popModal   = () => setModalStack(prev => prev.slice(0, -1));
  const clearModal = () => setModalStack([]);
  const [expandidos,        setExpandidos]        = useState(new Set());
  const [historialMes,      setHistorialMes]      = useState(new Date().getMonth());
  const [historialAnio,     setHistorialAnio]     = useState(new Date().getFullYear());
  const [historialDatos,    setHistorialDatos]    = useState([]);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [confirmState,      setConfirmState]      = useState(null);

  const toast = useToast();

  const cargar = useCallback(async () => {
    try {
      const [ri, rg] = await Promise.all([
        InstructorService.listar(),
        GrupoService.listar({ limit: 500 }),
      ]);
      setInstructores(ri.data);
      const dataGrupos = rg.data;
      setGrupos(Array.isArray(dataGrupos) ? dataGrupos : (dataGrupos.grupos ?? []));
    } catch {
      toast('Error al cargar datos', 'danger');
    }
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const gruposDelMes = useMemo(
    () => grupos.filter(g => solapaCon(g.fecha_inicio, g.fecha_fin, historialAnio, historialMes)),
    [grupos, historialMes, historialAnio],
  );

  const gruposPorInstructor = useMemo(() => gruposDelMes.reduce((acc, g) => {
    const key = g.instructor_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {}), [gruposDelMes]);

  const instructoresAsignados = useMemo(
    () => instructores.filter(i => !!gruposPorInstructor[i.id]),
    [instructores, gruposPorInstructor],
  );

  const anteriorMes = () => {
    if (historialMes === 0) { setHistorialMes(11); setHistorialAnio(a => a - 1); }
    else setHistorialMes(m => m - 1);
  };
  const siguienteMes = () => {
    if (historialMes === 11) { setHistorialMes(0); setHistorialAnio(a => a + 1); }
    else setHistorialMes(m => m + 1);
  };

  function toggleExpand(id) {
    setExpandidos(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function abrirHistorial(instructor) {
    pushModal({ tipo: 'historial', instructor });
    setHistorialCargando(true);
    try {
      const r = await InstructorService.historial(instructor.id);
      setHistorialDatos(r.data);
    } catch {
      toast('Error al cargar historial', 'danger');
      setHistorialDatos([]);
    } finally {
      setHistorialCargando(false);
    }
  }

  function confirmarDesactivar(instructor) {
    setConfirmState({
      mensaje: `¿Desactivar a ${instructor.nombre_completo}? Esta acción es irreversible. No se podrá reactivar el instructor.`,
      labelConfirmar: 'Sí, desactivar',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await InstructorService.eliminar(instructor.id);
          toast('Instructor desactivado correctamente', 'sena');
          clearModal();
          cargar();
        } catch (e) {
          toast(e.response?.data?.error || 'Error al desactivar', 'danger');
        }
      },
    });
  }

  const total = instructores.length;
  const totalAsignados = Object.keys(gruposPorInstructor).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <p>
            {totalAsignados} instructor{totalAsignados !== 1 ? 'es' : ''} con grupos en {MESES[historialMes]} {historialAnio}
            {' · '}
            <span className={s.totalHeader}>{total} registrados en total</span>
          </p>
        </div>
        <div className={s.headerAcciones}>
          <button
            className="btn btn-outline"
            onClick={() => pushModal({ tipo: 'todos' })}
            title="Ver todos los instructores registrados"
          >
            <Icon name="users" size={13} /> Ver todos
          </button>
          <button className="btn btn-primary" onClick={() => pushModal({ tipo: 'crear' })}>
            <Icon name="plus" size={13} /> Agregar instructor
          </button>
        </div>
      </div>

      <div className={`filters-bar ${s.filtersBar}`}>
        <div className={`filter-group ${s.filtroHistorial}`}>
          <label>Período</label>
          <div className={s.filtroHistorialInputs}>
            <button className="btn btn-outline btn-sm" onClick={anteriorMes}>◀</button>
            <select className={`filter-input ${s.filtroMes}`} value={historialMes}
              onChange={e => setHistorialMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className={`filter-input ${s.filtroAnio}`} value={historialAnio}
              onChange={e => setHistorialAnio(Number(e.target.value))}>
              {ANIOS_FILTRO.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={siguienteMes}>▶</button>
          </div>
        </div>
      </div>

      <div className={`card ${s.cardTabla}`}>
        <div className="table-wrap">
          {instructoresAsignados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="calendar" size={22} /></div>
              <div className="empty-text">
                Sin instructores asignados en {MESES[historialMes]} {historialAnio}
              </div>
              <div className="empty-sub">
                Cambia el período o usa "Ver todos" para gestionar instructores
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className={s.colExpandir}></th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Especialidad</th>
                  <th>Exp.</th>
                  <th>Horas / máx.</th>
                  <th className={s.colCentro}>
                    Grupos · <span className={s.thGruposLabel}>
                      {MESES[historialMes]} {historialAnio}
                    </span>
                  </th>
                  <th className={s.colCentro}>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {instructoresAsignados.map(i => {
                  const gsDelMes = gruposPorInstructor[i.id] || [];
                  const expandido = expandidos.has(i.id);

                  return (
                    <Fragment key={i.id}>
                      <tr
                        style={{
                          background: expandido ? 'var(--brand-light, #f0f7ff)' : undefined,
                          cursor: gsDelMes.length > 0 ? 'pointer' : 'default',
                        }}
                        onClick={() => gsDelMes.length > 0 && toggleExpand(i.id)}
                      >
                        <td className={`${s.colCentro} ${s.tdExpandPad}`}>
                          {gsDelMes.length > 0 ? (
                            <span className={`${s.flechaExpand}${expandido ? ` ${s.expandido}` : ''}`}>▶</span>
                          ) : <span className={s.sinGrupos}>–</span>}
                        </td>
                        <td>
                          <strong>{i.nombre_completo}</strong>
                          {!i.activo && <span className={s.badgeInactivo}>inactivo</span>}
                        </td>
                        <td className={s.celdaEmail}>{i.email}</td>
                        <td className={s.celdaEsp}>{i.especialidad || '–'}</td>
                        <td className={s.celdaExp}>
                          {i.experiencia_anios} año{i.experiencia_anios !== 1 ? 's' : ''}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <BarraHoras
                            asignadas={Number(i.horas_asignadas) || 0}
                            maximas={Number(i.horas_maximas) || 40}
                          />
                        </td>
                        <td className={s.celdaBadge}>
                          <span className={`badge badge-info ${s.badgeCursor}`}>
                            {gsDelMes.length} grupo{gsDelMes.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className={s.celdaBadge}>
                          <span className={`badge ${i.activo ? 'badge-success' : 'badge-danger'}`}>
                            {i.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className={`td-actions ${s.tdAcciones}`}>
                            <button
                              title={i.color ? `Color: ${i.color} — clic para cambiar` : 'Sin color asignado — clic para asignar'}
                              onClick={() => pushModal({ tipo: 'editar', base: i })}
                              className={s.colorSwatch}
                              style={{
                                background: i.color || 'var(--bg2)',
                                border: `2px solid ${i.color ? 'rgba(0,0,0,0.18)' : 'var(--border2)'}`,
                              }}
                            />
                            <button className="btn btn-sm btn-primary" title="Editar"
                              onClick={() => pushModal({ tipo: 'editar', base: i })}>
                              <Icon name="edit" size={12} /> Editar
                            </button>
                            <button className="btn btn-sm btn-outline" title="Historial completo"
                              onClick={() => abrirHistorial(i)}><Icon name="clipboard" size={13} /></button>
                            <button className="btn btn-sm btn-danger" title="Desactivar"
                              onClick={() => confirmarDesactivar(i)}><Icon name="trash" size={13} /> Desactivar</button>
                          </div>
                        </td>
                      </tr>

                      {expandido && gsDelMes.map(g => (
                        <tr key={`${i.id}-g-${g.id}`} className={s.filaGrupo}>
                          <td className={s.grupoAccentCell}></td>
                          <td colSpan={2} className={s.grupoPad}>
                            <span className={s.grupoNombre}>{g.nombre}</span>
                          </td>
                          <td className={s.grupoCurso}>{g.curso_nombre}</td>
                          <td colSpan={2} className={s.grupoFechas}>
                            {formatearFecha(g.fecha_inicio)} → {formatearFecha(g.fecha_fin)}
                          </td>
                          <td className={s.celdaBadge}>
                            <span className={`badge ${g.inscritos >= g.cupo_maximo ? 'badge-danger' : 'badge-gray'}`}>
                              {g.inscritos}/{g.cupo_maximo}
                            </span>
                          </td>
                          <td className={s.celdaBadge}><GrpEstadoBadge estado={g.estado} /></td>
                          <td></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal?.tipo === 'crear' && (
        <ModalInstructor modo="crear"
          onClose={popModal}
          onDone={() => { clearModal(); cargar(); }} />
      )}
      {modal?.tipo === 'editar' && (
        <ModalInstructor modo="editar" base={modal.base}
          onClose={popModal}
          onDone={() => { clearModal(); cargar(); }} />
      )}
      {modal?.tipo === 'todos' && (
        <ModalTodosInstructores
          instructores={instructores}
          onEditar={i => pushModal({ tipo: 'editar', base: i })}
          onHistorial={abrirHistorial}
          onEliminar={confirmarDesactivar}
          onClose={popModal}
        />
      )}
      {modal?.tipo === 'historial' && (
        <ModalHistorialInstructor
          instructor={modal.instructor}
          historial={historialDatos}
          cargando={historialCargando}
          onClose={popModal}
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
