import { useState, useEffect, useRef, useCallback } from 'react';
import { GrupoService, EmpresaService, EventoService, InstructorService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useEventos } from '../../hooks/useEventos.jsx';
import ModalEventoCalendario from '../../components/grupos/ModalEventoCalendario.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Icon from '../../components/common/Icon.jsx';
import styles from './Calendario.module.css';
import { MESES, CALENDAR_PALETTE_DARK, CALENDAR_PALETTE_LIGHT } from '../../constants/index.js';

const DIAS         = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const colorDark  = gid => CALENDAR_PALETTE_DARK[Number(gid) % CALENDAR_PALETTE_DARK.length];
const colorLight = gid => CALENDAR_PALETTE_LIGHT[Number(gid) % CALENDAR_PALETTE_LIGHT.length];

function colorDeEvento(evento, instructores) {
  const inst = instructores && instructores.find(i => i.id === evento.instructor_id);
  if (inst?.color) {
    const hex = inst.color;
    return {
      dark:  hex,
      light: { bg: `${hex}18`, border: hex, text: hex },
    };
  }
  return {
    dark:  colorDark(evento.grupo_id),
    light: colorLight(evento.grupo_id),
  };
}

function fmtFecha(anio, mes, dia) {
  return `${anio}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}
function generarCeldas(anio, mes) {
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasMes   = new Date(anio, mes+1, 0).getDate();
  const diasAntes = new Date(anio, mes, 0).getDate();
  const celdas = [];
  for (let i = primerDia-1; i >= 0; i--) celdas.push({ dia: diasAntes-i, actual: false });
  for (let d = 1; d <= diasMes; d++)      celdas.push({ dia: d, actual: true });
  const rest = (7 - (celdas.length % 7)) % 7;
  for (let d = 1; d <= rest; d++)         celdas.push({ dia: d, actual: false });
  return celdas;
}
function eventosDelDia(eventos, anio, mes, dia) {
  const fecha = new Date(anio, mes, dia);
  return eventos.filter(ev => {
    const ini = new Date(ev.fecha_inicio + 'T00:00:00');
    const fin = new Date(ev.fecha_fin    + 'T00:00:00');
    return fecha >= ini && fecha <= fin;
  });
}

function ModalDetalleEvento({ evento, esAdmin, instructores, onClose, onEditar, onEliminar }) {
  const c = colorDeEvento(evento, instructores).light;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{
          borderLeft: `4px solid ${c.border}`, paddingLeft: 12,
          color: c.text, background: c.bg, borderRadius: 6,
          padding: '8px 14px', marginBottom: 16, fontWeight: 700, fontSize: 15,
        }}>{evento.titulo}</div>
        <div className={styles['cal-detail-rows']}>
          {[
            ['Grupo',      evento.grupo_nombre],
            ['Instructor', evento.instructor_nombre],
            ['Curso',      evento.curso_nombre],
            ['Desde',      evento.fecha_inicio],
            ['Hasta',      evento.fecha_fin],
            ['Horario',    `${evento.hora_inicio} \u2013 ${evento.hora_fin}`],
            ['Lugar',      evento.lugar_nombre || 'Sin especificar'],
          ].map(([k, v]) => (
            <div className={styles['cal-detail-row']}>
              <span className={styles['cal-detail-key']}>{k}:</span>
              <span>{v || '\u2013'}</span>
            </div>
          ))}
          {evento.observaciones && (
            <div className={styles['cal-detail-obs']}>
              <Icon name="file-text" size={13} className={styles['cal-detail-obs-icon']} />
              {evento.observaciones}
            </div>
          )}
        </div>
        <div className="modal-actions">
          {esAdmin && <>
            <button className="btn btn-outline btn-sm" onClick={onEditar}>Editar</button>
            <button className="btn btn-sm btn-outline" style={{ color:'var(--danger)', borderColor:'var(--danger)' }} onClick={onEliminar}>Eliminar</button>
          </>}
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ModalDiaEventos({ dia, anio, mes, eventos, instructores, onSelEvento, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${styles['cal-modal-dia']}`} onClick={e => e.stopPropagation()}>
        <div className={styles['cal-modal-header']}>
          <h3 className={styles['cal-modal-title']}>
            Eventos del {dia} de {MESES[mes]} {anio}
          </h3>
          <button
            className={styles['cal-modal-close']}
            onClick={onClose}
          >&#x2715;</button>
        </div>
        <div className={styles['cal-modal-list']}>
          {eventos.map(ev => {
            const c = colorDeEvento(ev, instructores).light;
            return (
              <div
                key={ev.id}
                style={{
                  background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                  borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                  transition: 'filter .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(.93)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                onClick={() => { onClose(); onSelEvento(ev); }}
              >
                <div className={styles['cal-event-name']}>
                  {ev.titulo.replace(/^Clase\s*[\u2013\-]\s*/i, '')}
                </div>
                <div className={styles['cal-event-meta']}>
                  <span>&#128336; {ev.hora_inicio} &ndash; {ev.hora_fin}</span>
                  {ev.instructor_nombre && <span>&#128100; {ev.instructor_nombre}</span>}
                  {ev.grupo_nombre && <span>&#128101; {ev.grupo_nombre}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className={`modal-actions ${styles['cal-modal-actions-mt']}`}>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function MenuContextual({ x, y, onCrear, onEliminarSeleccion, onClose }) {
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const itemStyle = (color) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '8px 14px', background: 'none',
    border: 'none', cursor: 'pointer', color: color || 'var(--text-primary)',
    textAlign: 'left', fontSize: 13,
  });

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: y, left: x, zIndex: 9999,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
        minWidth: 170, padding: '4px 0',
      }}
    >
      <button
        style={itemStyle()}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={onCrear}
      >
        <Icon name="plus" size={13} />
        Crear evento
      </button>
      <div className={styles['cal-separator']} />
      <button
        style={itemStyle('var(--danger)')}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={onEliminarSeleccion}
      >
        <Icon name="x" size={13} />
        Eliminar seleccion
      </button>
    </div>
  );
}

export default function Calendario() {
  const ahoraRef = useRef(new Date());
  const ahora = ahoraRef.current;
  const [mes,       setMes]       = useState(ahora.getMonth());
  const [anio,      setAnio]      = useState(ahora.getFullYear());
  const [grupos,        setGrupos]        = useState([]);
  const [instructores,  setInstructores]  = useState([]);
  const [lugares,   setLugares]   = useState([]);
  const [modal,     setModal]     = useState(null);
  const [selEvento, setSelEvento] = useState(null);

  const [diasSeleccionados, setDiasSeleccionados] = useState(new Set());

  const [arrastrando,    setArrastrando]    = useState(false);
  const [diaArrastreIni, setDiaArrastreIni] = useState(null);
  const diasPreviosRef = useRef(new Set());
  const esDragRef = useRef(false);

  const [menuCtx, setMenuCtx] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const [diaModal, setDiaModal] = useState(null);

  const { esAdmin } = useAuth();
  const toast = useToast();
  const { eventos, recargar: recargarEventos } = useEventos({ mes: mes + 1, anio });

  useEffect(() => {
    GrupoService.listar({ limit: 500 }).then(r => {
      const raw = r.data;
      setGrupos(Array.isArray(raw) ? raw : (raw?.grupos ?? []));
    }).catch(() => {});
    InstructorService.listar().then(r => setInstructores(r.data)).catch(() => {});
    EmpresaService.listarLugares().then(r => setLugares(r.data)).catch(() => {});
  }, []);

  function eliminar(id) {
    setConfirmState({
      mensaje: '¿Eliminar esta clase del calendario?',
      labelConfirmar: 'Eliminar',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await EventoService.eliminar(id);
          toast('Clase eliminada', 'sena');
          recargarEventos(); setSelEvento(null);
        } catch { toast('Error al eliminar', 'danger'); }
      },
    });
  }

  const resetSeleccion = useCallback(() => {
    setDiasSeleccionados(new Set());
    setArrastrando(false);
    setDiaArrastreIni(null);
    diasPreviosRef.current = new Set();
    esDragRef.current = false;
  }, []);

  const anterior  = useCallback(() => { resetSeleccion(); mes === 0  ? (setMes(11), setAnio(a=>a-1)) : setMes(m=>m-1); }, [mes, resetSeleccion]);
  const siguiente = useCallback(() => { resetSeleccion(); mes === 11 ? (setMes(0),  setAnio(a=>a+1)) : setMes(m=>m+1); }, [mes, resetSeleccion]);
  const hoy       = useCallback(() => { resetSeleccion(); setMes(ahora.getMonth()); setAnio(ahora.getFullYear()); }, [resetSeleccion, ahora]);
  const cerrarYRecargar = useCallback(() => { setModal(null); recargarEventos(); resetSeleccion(); }, [recargarEventos, resetSeleccion]);

  useEffect(() => {
    function handleGlobalMouseUp() {
      if (arrastrando) {
        setArrastrando(false);
        setDiaArrastreIni(null);
        esDragRef.current = false;
      }
    }
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [arrastrando]);

  function handleMouseDown(celda, e) {
    if (!celda.actual || !esAdmin) return;
    if (e.button !== 0) return;
    e.preventDefault();
    diasPreviosRef.current = new Set(diasSeleccionados);
    esDragRef.current = false;
    setDiaArrastreIni(celda.dia);
    setArrastrando(true);
  }

  function handleMouseEnter(celda) {
    if (!arrastrando || !celda.actual || diaArrastreIni == null) return;
    if (celda.dia !== diaArrastreIni) {
      esDragRef.current = true;
    }
    const desde = Math.min(diaArrastreIni, celda.dia);
    const hasta = Math.max(diaArrastreIni, celda.dia);
    setDiasSeleccionados(() => {
      const next = new Set(diasPreviosRef.current);
      for (let d = desde; d <= hasta; d++) next.add(d);
      return next;
    });
  }

  function handleMouseUp(celda, e) {
    if (!esAdmin || !arrastrando) return;
    if (e.button !== 0) return;

    if (!esDragRef.current && celda.actual && diaArrastreIni === celda.dia) {
      setDiasSeleccionados(() => {
        const next = new Set(diasPreviosRef.current);
        if (next.has(celda.dia)) {
          next.delete(celda.dia);
        } else {
          next.add(celda.dia);
        }
        return next;
      });
    }

    setArrastrando(false);
    setDiaArrastreIni(null);
    esDragRef.current = false;
  }

  function handleContextMenu(celda, e) {
    if (!celda.actual || !esAdmin) return;
    if (!diasSeleccionados.has(celda.dia)) return;
    e.preventDefault();
    setMenuCtx({ x: e.clientX, y: e.clientY });
  }

  function handleCrearEvento() {
    setMenuCtx(null);
    if (diasSeleccionados.size === 0) { toast('Selecciona al menos un dia', 'warn'); return; }
    const sorted = [...diasSeleccionados].sort((a, b) => a - b);
    const fechas = sorted.map(d => fmtFecha(anio, mes, d));
    setModal({
      tipo: 'crear',
      fechaInicio: fechas[0],
      fechaFin: fechas[fechas.length - 1],
      fechasDiscontinuas: fechas.length > 1 ? fechas : null,
    });
  }

  function handleEliminarSeleccion() {
    setMenuCtx(null);
    resetSeleccion();
  }

  const celdas           = generarCeldas(anio, mes);
  const esHoyMes         = ahora.getMonth() === mes && ahora.getFullYear() === anio;
  const gruposEnMes      = [...new Map(eventos.map(ev => [ev.grupo_id, ev])).values()];
  const numSeleccionados = diasSeleccionados.size;

  return (
    <div>
      <div className="page-header">
        <div>
          <p className={styles['cal-detail-text']}>
            {numSeleccionados > 0 ? (
              <span className={styles['cal-brand-strong']}>
                {numSeleccionados} dia{numSeleccionados !== 1 ? 's' : ''} seleccionado{numSeleccionados !== 1 ? 's' : ''}
                {' \u00b7 '}
                <button
                  onClick={resetSeleccion}
                  style={{ background:'none', border:'none', color:'var(--danger)', cursor:'pointer', fontSize:12, padding:0, fontWeight:600 }}>
                  Limpiar
                </button>
              </span>
            ) : (
              'Clic para seleccionar \u00b7 Arrastrar para rango \u00b7 Clic derecho para opciones'
            )}
          </p>
        </div>
      </div>

      <div className={styles['cal-nav']}>
        <button className="btn btn-outline btn-sm" onClick={anterior}><Icon name="chevron-left" size={14} /></button>
        <div className={styles['cal-month-title']}>{MESES[mes]} {anio}</div>
        <button className="btn btn-outline btn-sm" onClick={siguiente}><Icon name="chevron-right" size={14} /></button>
        <button className="btn btn-ghost btn-sm" onClick={hoy}>Hoy</button>
        {gruposEnMes.length > 0 && (
          <div className={styles['cal-legend']}>
            {gruposEnMes.map(ev => (
              <div key={ev.grupo_id} className={styles['cal-legend-item']}>
                <div className={styles['cal-legend-dot']} style={{ background: colorDeEvento(ev, instructores).dark }}/>
                <span>{ev.grupo_nombre?.split('\u2013')[0]?.trim()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`card ${styles['cal-card']}`}>
        <div className={styles['cal-grid-head']}>
          {DIAS.map(d => <div key={d} className={styles['cal-day-name']}>{d}</div>)}
        </div>
        <div className={styles['cal-grid']}>
          {celdas.map((celda, i) => {
            const evsDia      = celda.actual ? eventosDelDia(eventos, anio, mes, celda.dia) : [];
            const esHoy       = esHoyMes && celda.dia === ahora.getDate() && celda.actual;
            const seleccionado = celda.actual && diasSeleccionados.has(celda.dia);

            return (
              <div
                key={i}
                className={[
                  styles['cal-cell'],
                  !celda.actual           ? styles['other-month']  : '',
                  esHoy                   ? styles.today           : '',
                  celda.actual && esAdmin ? styles.clickable       : '',
                  seleccionado            ? styles['rango-inicio'] : '',
                ].filter(Boolean).join(' ')}
                onMouseDown={e => handleMouseDown(celda, e)}
                onMouseEnter={() => handleMouseEnter(celda)}
                onMouseUp={e => handleMouseUp(celda, e)}
                onContextMenu={e => handleContextMenu(celda, e)}
              >
                <div className={styles['cal-day-num']}>
                  <span>{celda.dia}</span>
                  {celda.actual && esAdmin && evsDia.length === 0 && numSeleccionados === 0 && (
                    <span className={styles['cal-more-indicator']}>+</span>
                  )}
                  {seleccionado && (
                    <span className={styles['cal-check-indicator']}>&#10003;</span>
                  )}
                </div>

                {evsDia.slice(0,3).map(ev => {
                  const c = colorDeEvento(ev, instructores).light;
                  return (
                    <div key={ev.id}
                      className={styles['cal-event-chip']}
                      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); setSelEvento(ev); }}
                      title={`${ev.titulo}\n${ev.hora_inicio} \u2013 ${ev.hora_fin}${ev.instructor_nombre ? '\nInstructor: ' + ev.instructor_nombre : ''}`}
                    >
                      <span className={styles['chip-hora']}><Icon name="clock" size={9} /> {ev.hora_inicio}</span>
                      <span className={styles['chip-titulo']}>{ev.titulo.replace(/^Clase\s*[\u2013\-]\s*/i,'')}</span>
                      {ev.instructor_nombre && (
                        <span className={styles['chip-instructor']}><Icon name="user" size={8} /> {ev.instructor_nombre}</span>
                      )}
                    </div>
                  );
                })}
                {evsDia.length > 3 && (
                  <div
                    className={styles['cal-event-more']}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setDiaModal({ dia: celda.dia, eventos: evsDia }); }}
                  >
                    +{evsDia.length-3} más &rsaquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {numSeleccionados > 0 && (
          <div className={styles['cal-range-info']}>
            <Icon name="calendar" size={13} />
            <span>
              Dias seleccionados:{' '}
              <strong>{[...diasSeleccionados].sort((a,b)=>a-b).join(', ')}</strong>
              {' \u00b7 '}Clic derecho sobre un dia seleccionado para crear evento
            </span>
            <button
              className={styles['cal-range-clear']}
              onClick={resetSeleccion}
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {menuCtx && esAdmin && (
        <MenuContextual
          x={menuCtx.x}
          y={menuCtx.y}
          onCrear={handleCrearEvento}
          onEliminarSeleccion={handleEliminarSeleccion}
          onClose={() => setMenuCtx(null)}
        />
      )}

      {selEvento && (
        <ModalDetalleEvento
          evento={selEvento} esAdmin={esAdmin} instructores={instructores}
          onClose={() => setSelEvento(null)}
          onEditar={() => { setSelEvento(null); setModal({ tipo:'editar', evento: selEvento }); }}
          onEliminar={() => eliminar(selEvento.id)}
        />
      )}

      {modal?.tipo === 'crear' && (
        <ModalEventoCalendario
          fechaInicio={modal.fechaInicio}
          fechaFin={modal.fechaFin}
          fechasDiscontinuas={modal.fechasDiscontinuas || null}
          grupos={grupos} lugares={lugares}
          onClose={() => setModal(null)}
          onDone={cerrarYRecargar}
        />
      )}
      {modal?.tipo === 'editar' && (
        <ModalEventoCalendario
          evento={modal.evento}
          grupos={grupos} lugares={lugares}
          onClose={() => setModal(null)}
          onDone={cerrarYRecargar}
        />
      )}
      {diaModal && (
        <ModalDiaEventos
          dia={diaModal.dia} anio={anio} mes={mes}
          eventos={diaModal.eventos} instructores={instructores}
          esAdmin={esAdmin}
          onSelEvento={ev => setSelEvento(ev)}
          onClose={() => setDiaModal(null)}
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
