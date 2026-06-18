/**
 * components/aspirantes/ModalAsignar.jsx
 * Responsabilidad : Modal para asignar uno o varios aspirantes a un grupo.
 * Exporta         : ModalAsignar (default)
 * Usado en        : pages/admin/Aspirantes.jsx
 * Depende de      : services/index.js, hooks/useToast.jsx, components/common/Icon.jsx,
 *                   utils/fecha.js
 */
import { useState, useEffect } from 'react';
import { AspiranteService, GrupoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import Icon from '../common/Icon.jsx';
import { formatearFecha } from '../../utils/fecha.js';
import s from './ModalAsignar.module.css';

export default function ModalAsignar({ aspirantes, onClose, onDone, onAlertaCurso }) {
  const [grupos,      setGrupos]      = useState([]);
  const [grupoId,     setGrupoId]     = useState('');
  const [cargando,    setCargando]    = useState(false);
  const [alertaLocal, setAlertaLocal] = useState(null);
  const toast = useToast();

  // Soporta tanto array como objeto único (compatibilidad)
  const lista = Array.isArray(aspirantes) ? aspirantes : aspirantes ? [aspirantes] : [];

  useEffect(() => {
    (async () => {
      try {
        const [a, b] = await Promise.all([
          GrupoService.listar({ estado: 'PROGRAMADO', limit: 500 }).catch(() => ({ data: [] })),
          GrupoService.listar({ estado: 'EN_CURSO',   limit: 500 }).catch(() => ({ data: [] })),
        ]);
        const extraer = d => Array.isArray(d) ? d : (d?.grupos ?? []);
        setGrupos([...extraer(a.data), ...extraer(b.data)]);
      } catch { /* silencioso */ }
    })();
  }, []);

  function handleGrupoChange(e) {
    const id = e.target.value;
    setGrupoId(id);
    setAlertaLocal(null);

    if (!id) return;

    const grupo = grupos.find(g => String(g.id) === String(id));
    if (!grupo) return;

    const cuposDisponibles = Number(grupo.cupo_maximo) - Number(grupo.inscritos);
    if (cuposDisponibles <= 0) {
      const msg = 'No se pueden asignar más aspirantes, el grupo ya está lleno.';
      setAlertaLocal(msg);
      onAlertaCurso?.(msg);
      return;
    }
    if (lista.length > cuposDisponibles) {
      const msg = `Solo hay ${cuposDisponibles} cupo${cuposDisponibles !== 1 ? 's' : ''} disponible${cuposDisponibles !== 1 ? 's' : ''} y se seleccionaron ${lista.length} aspirantes.`;
      setAlertaLocal(msg);
      onAlertaCurso?.(msg);
      return;
    }

    const cursoGrupo = (grupo.curso_nombre || '').toLowerCase().trim();
    const inconsistentes = lista.filter(asp => {
      const cursoAsp = (asp.curso_requerido || '').toLowerCase().trim();
      return cursoGrupo && cursoAsp && cursoGrupo !== cursoAsp;
    });
    if (inconsistentes.length > 0) {
      const nombres = inconsistentes.map(a => a.nombre_completo).join(', ');
      const msg = `Los siguientes aspirantes solicitaron un curso diferente al del grupo "${grupo.curso_nombre}": ${nombres}. No es posible asignarlos a este grupo.`;
      setAlertaLocal(msg);
      onAlertaCurso?.(msg);
      return; // bloquear: no continuar evaluando cupos
    }
  }

  async function asignar() {
    if (!grupoId)       { toast('Selecciona un grupo', 'warn'); return; }
    if (alertaLocal)    { toast('Corrige el problema antes de asignar', 'warn'); return; }
    if (!lista.length)  { toast('No hay aspirantes para asignar', 'warn'); return; }

    setCargando(true);
    const asignados      = [];
    const resultadosCorreo = {};
    let errorCapacidad   = false;

    for (const asp of lista) {
      try {
        const { data } = await AspiranteService.asignar(asp.id, grupoId);
        asignados.push(asp.id);
        resultadosCorreo[asp.id] = data;
      } catch (e) {
        const msg = e.response?.data?.error || '';
        if (msg.includes('cupos') || msg.includes('lleno') || msg.includes('capacidad')) {
          errorCapacidad = true;
          break;
        }
        toast(`Error al asignar a ${asp.nombre_completo}: ${msg}`, 'danger');
      }
    }

    setCargando(false);

    if (asignados.length > 0) {
      const n = asignados.length;
      // correoEnviado === true → correo enviado correctamente
      // sinEmail === true    → no había email, no es error del sistema
      // correoError presente → fallo SMTP real
      const algunError = asignados.some(id => {
        const r = resultadosCorreo[id];
        return r && r.correoError;
      });
      const todosSinEmail = asignados.every(id => {
        const r = resultadosCorreo[id];
        return r && r.sinEmail;
      });
      const correoOk = asignados.every(id => {
        const r = resultadosCorreo[id];
        return r && r.correoEnviado === true;
      });

      if (correoOk) {
        toast(
          `${n} aspirante${n !== 1 ? 's' : ''} asignado${n !== 1 ? 's' : ''}. Notificación${n !== 1 ? 'es' : ''} enviada${n !== 1 ? 's' : ''} por correo.`,
          'sena'
        );
      } else if (todosSinEmail) {
        toast(
          `${n} aspirante${n !== 1 ? 's' : ''} asignado${n !== 1 ? 's' : ''}. Ninguno tiene correo registrado.`,
          'warn'
        );
      } else if (algunError) {
        toast(
          `${n} aspirante${n !== 1 ? 's' : ''} asignado${n !== 1 ? 's' : ''}, pero hubo un error al enviar el correo de notificación.`,
          'warn'
        );
      } else {
        // Mezcla: algunos sin email, otros enviados correctamente
        toast(
          `${n} aspirante${n !== 1 ? 's' : ''} asignado${n !== 1 ? 's' : ''}. Algunas notificaciones no pudieron enviarse (sin correo registrado).`,
          'warn'
        );
      }
    }
    if (errorCapacidad) {
      toast('No se pueden asignar más aspirantes, el grupo ya está lleno.', 'danger');
    }
    if (asignados.length > 0) onDone(asignados);
  }

  const grupoSeleccionado = grupos.find(g => String(g.id) === String(grupoId));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Asignar a grupo</div>

        <div className={s['grupo-sel-box']}>
          {lista.length === 1 ? (
            <><strong>{lista[0].nombre_completo}</strong> · Curso: <strong>{lista[0].curso_requerido}</strong></>
          ) : (
            <><strong>{lista.length} aspirantes seleccionados</strong> · Curso: <strong>{lista[0]?.curso_requerido}</strong></>
          )}
        </div>

        {alertaLocal && (
          <div className={`alert alert-warn ${s['alert-flex']}`}>
            <Icon name="alert-triangle" size={15} className={s['alert-icon']} />
            <span className={s['alert-text']}>{alertaLocal}</span>
          </div>
        )}

        <div className="form-group">
          <label>Seleccionar grupo <span className="required">*</span></label>
          <select value={grupoId} onChange={handleGrupoChange}>
            <option value="">-- Selecciona un grupo disponible --</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>
                {g.nombre} · {g.curso_nombre} · {g.inscritos}/{g.cupo_maximo} cupos · {formatearFecha(g.fecha_inicio)}
              </option>
            ))}
          </select>
          {grupos.length === 0 && (
            <div className={`alert alert-warn ${s['alert-mt']}`}>
              No hay grupos programados. Crea un grupo primero en la sección "Grupos".
            </div>
          )}
        </div>

        {grupoSeleccionado && !alertaLocal && lista.length > 1 && (
          <div className={s['nota-texto']}>
            Se asignarán <strong>{lista.length}</strong> aspirantes al grupo <strong>{grupoSeleccionado.nombre}</strong> en una sola acción.
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={asignar}
            disabled={cargando || !grupoId || !!alertaLocal}
          >
            {cargando
              ? 'Asignando...'
              : lista.length > 1
                ? `Asignar ${lista.length} aspirantes`
                : 'Asignar y notificar'}
          </button>
        </div>
      </div>
    </div>
  );
}
