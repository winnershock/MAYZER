import { useState, useEffect, useCallback } from 'react';
import { CursoService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import ModalCurso from '../../components/cursos/ModalCurso.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import FiltrosBar from '../../components/common/FiltrosBar.jsx';
import Icon from '../../components/common/Icon.jsx';
import s from './Cursos.module.css';

const CAMPOS_FILTRO = ['anio', 'mes'];
const FILTROS_INICIAL = { anio: '', mes: '' };

export default function Cursos() {
  const [cursos, setCursos]           = useState([]);
  const [modal,  setModal]            = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [filtros, setFiltros]         = useState(FILTROS_INICIAL);
  const toast = useToast();

  const f = useCallback((k, v) => setFiltros(p => ({ ...p, [k]: v })), []);
  const limpiar = useCallback(() => setFiltros(FILTROS_INICIAL), []);

  const cargar = useCallback(async () => {
    try {
      const params = {};
      if (filtros.anio) params.anio = filtros.anio;
      if (filtros.mes)  params.mes  = filtros.mes;
      const { data } = mostrarInactivos
        ? await CursoService.listarInactivos(params)
        : await CursoService.listar(params);
      setCursos(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error(e);
    }
  }, [mostrarInactivos, filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  function pedirDesactivar(id) {
    setConfirmState({
      mensaje: '¿Desactivar este curso? No se eliminará, pero dejará de estar disponible para nuevos grupos.',
      labelConfirmar: 'Desactivar',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await CursoService.desactivar(id);
          toast('Curso desactivado', 'sena');
          cargar();
        } catch (e) {
          toast(e.response?.data?.error || 'Error al desactivar', 'danger');
        }
      },
    });
  }

  function pedirActivar(id) {
    setConfirmState({
      mensaje: '¿Activar este curso? Quedará disponible para asignarse a nuevos grupos.',
      labelConfirmar: 'Activar',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await CursoService.activar(id);
          toast('Curso activado', 'sena');
          cargar();
        } catch (e) {
          toast(e.response?.data?.error || 'Error al activar', 'danger');
        }
      },
    });
  }

  function intentarEditar(curso) {
    if (curso.bloqueado) {
      toast('Este curso no puede editarse porque tiene grupos finalizados asociados.', 'warn');
      return;
    }
    setModal({ tipo: 'editar', curso });
  }

  const cerrarYRecargar = () => { setModal(null); cargar(); };

  const cursosVisibles = cursos.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <p>{cursosVisibles} curso{cursosVisibles !== 1 ? 's' : ''} {mostrarInactivos ? 'inactivo' + (cursosVisibles !== 1 ? 's' : '') : 'activo' + (cursosVisibles !== 1 ? 's' : '')}</p>
        </div>
        <div className={s.headerAcciones}>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setMostrarInactivos(v => !v)}
            title={mostrarInactivos ? 'Ocultar inactivos' : 'Ver cursos inactivos'}
          >
            {mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
          </button>
          <button className="btn btn-primary" onClick={() => setModal({ tipo: 'crear' })}>
            Agregar curso
          </button>
        </div>
      </div>

      <FiltrosBar
        campos={CAMPOS_FILTRO}
        valores={filtros}
        onChange={f}
        onLimpiar={limpiar}
      />

      <div className="card">
        <div className="table-wrap">
          {cursos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="book" size={22} /></div>
              <div className="empty-text">Sin cursos</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre del curso</th>
                  <th>Duración</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map(c => (
                  <tr key={c.id} style={!c.activo ? { opacity: 0.55 } : undefined}>
                    <td>
                      <strong>{c.nombre}</strong>
                      {c.requerimientos_inscripcion && (
                        <div className={s.textoRequisitos}>Requisitos definidos</div>
                      )}
                      {c.bloqueado && (
                        <div className={s.textoBloqueado}>
                          <Icon name="lock" size={11} /> Histórico — edición bloqueada
                        </div>
                      )}
                    </td>
                    <td className={s.celdaDuracion}>{c.intensidad_horaria}h</td>
                    <td className={s.celdaDescripcion}>
                      {c.descripcion?.substring(0, 80)}{c.descripcion?.length > 80 ? '...' : ''}
                    </td>
                    <td>
                      {c.activo
                        ? <span className="badge badge-success">Activo</span>
                        : <span className="badge badge-default">Inactivo</span>
                      }
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => intentarEditar(c)}
                          disabled={c.bloqueado || !c.activo}
                          title={c.bloqueado ? 'No editable: tiene grupos finalizados' : (!c.activo ? 'Reactiva el curso para editarlo' : 'Editar curso')}
                        >
                          Editar
                        </button>

                        {c.activo ? (
                          <button
                            className={`btn btn-sm btn-ghost ${s.btnDanger}`}
                            onClick={() => pedirDesactivar(c.id)}
                            title="Desactivar curso"
                          >
                            <Icon name="archive" size={14} />
                          </button>
                        ) : (
                          <button
                            className={`btn btn-sm btn-ghost ${s.btnSuccess}`}
                            onClick={() => pedirActivar(c.id)}
                            title="Reactivar curso"
                          >
                            <Icon name="check" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal?.tipo === 'crear'  && <ModalCurso onClose={() => setModal(null)} onDone={cerrarYRecargar} />}
      {modal?.tipo === 'editar' && <ModalCurso curso={modal.curso} onClose={() => setModal(null)} onDone={cerrarYRecargar} />}

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
