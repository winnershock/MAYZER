import { useState, useEffect, useRef, useCallback } from 'react';
import { CursoService, InstructorService, EmpresaService, GrupoService, ReporteService } from '../../services';
import { useToast } from '../../hooks/useToast.jsx';
import { useAuth }  from '../../hooks/useAuth.jsx';
import { useGrupos } from '../../hooks/useGrupos.jsx';
import { descargarInformeGrupo } from '../../utils/informeGrupo.js';
import { formatearFecha } from '../../utils/fecha.js';
import s from './Grupos.module.css';
import ModalGrupo        from '../../components/grupos/ModalGrupo.jsx';
import ModalDetalleGrupo from '../../components/grupos/ModalDetalleGrupo.jsx';
import ModalAdministrar  from '../../components/grupos/ModalAdministrar.jsx';
import ConfirmDialog     from '../../components/common/ConfirmDialog.jsx';
import Paginador         from '../../components/common/Paginador.jsx';
import FiltrosBar        from '../../components/common/FiltrosBar.jsx';
import { GrpEstadoBadge } from '../../components/common/EstadoBadge.jsx';
import Icon from '../../components/common/Icon.jsx';

const CAMPOS_FILTRO = ['estadoGrupo', 'curso', 'anio', 'mes'];
const FILTROS_INICIAL = { estado_grupo: '', anio: '', mes: '', curso_id: '' };

export default function Grupos() {
  const [filtros,      setFiltros]      = useState(FILTROS_INICIAL);
  const [modal,        setModal]        = useState(null);
  const [cursos,       setCursos]       = useState([]);
  const [instructores, setInst]         = useState([]);
  const [lugares,      setLugares]      = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [descargandoZip, setDescargandoZip] = useState(false);

  const { esAdmin, cargando: authCargando } = useAuth();
  const toast       = useToast();
  const toastRef    = useRef(toast);
  toastRef.current  = toast;

  const { grupos, total, pagina, totalPaginas, limite, cargando, error, recargar, cambiarPagina } = useGrupos(filtros);

  useEffect(() => {
    if (error) toastRef.current(error, 'danger');
  }, [error]);

  useEffect(() => {
    if (authCargando) return;
    CursoService.listar().then(r => setCursos(r.data)).catch(() => {});
    if (esAdmin) {
      InstructorService.listar().then(r => setInst(r.data)).catch(() => {});
      EmpresaService.listarLugares().then(r => setLugares(r.data)).catch(() => {});
    }
  }, [authCargando, esAdmin]);

  function eliminar(id) {
    setConfirmState({
      mensaje: '¿Eliminar este grupo? Esta acción no se puede deshacer.',
      labelConfirmar: 'Eliminar',
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await GrupoService.eliminar(id);
          toast('Grupo eliminado', 'sena');
          recargar();
        } catch (e) {
          toast(e.response?.data?.error || 'Error al eliminar', 'danger');
        }
      },
    });
  }

  const enCurso = grupos.filter(g => g.estado === 'EN_CURSO').length;
  const cerrarYRecargar = () => { setModal(null); recargar(); };

  async function descargarZipDelGrupo(g) {
    setDescargandoZip(g.id);
    try {
      await ReporteService.descargarZipGrupo(g.id, g.nombre);
      toast('ZIP generado correctamente', 'sena');
    } catch (e) {
      toast(e.response?.data?.error || 'Error al generar el ZIP', 'danger');
    } finally {
      setDescargandoZip(false);
    }
  }

  const f = useCallback((k, v) => setFiltros(p => ({ ...p, [k]: v })), []);
  const limpiarFiltros = useCallback(() => setFiltros(FILTROS_INICIAL), []);

  return (
    <div>
      <div className="page-header">
        <div>
          <p>
            {total} grupos
            {enCurso > 0 && <> · <span className={s.enCursoTag}>{enCurso} en curso</span></>}
          </p>
        </div>
        {esAdmin && (
          <button className="btn btn-primary" onClick={() => setModal({ tipo: 'crear' })}>
            <Icon name="plus" size={13} /> Crear grupo
          </button>
        )}
      </div>

      <FiltrosBar
        campos={CAMPOS_FILTRO}
        valores={filtros}
        onChange={f}
        onLimpiar={limpiarFiltros}
        cursos={cursos}
        extra={
          <button className="btn btn-outline btn-sm" onClick={() => recargar()}>
            <Icon name="refresh" size={13} /> Actualizar
          </button>
        }
      />

      {cargando ? (
        <div className="loading-wrap"><div className="spinner" /></div>
      ) : grupos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="users" size={24} /></div>
          <div className="empty-text">Sin grupos</div>
          <div className="empty-sub">No hay grupos con los filtros seleccionados</div>
        </div>
      ) : (
        <div className={`card ${s.cardTableWrap}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Nombre</th>
                <th>Curso</th>
                <th>Instructor</th>
                <th>Estado</th>
                <th>Inscritos</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Lugar</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => (
                <tr key={g.id}>
                  <td>
                    <span className={s.codigoBadge}>
                      {g.codigo != null ? g.codigo : '—'}
                    </span>
                  </td>
                  <td className={s.tdNombre}>{g.nombre}</td>
                  <td>{g.curso_nombre}</td>
                  <td>{g.instructor_nombre}</td>
                  <td><GrpEstadoBadge estado={g.estado} /></td>
                  <td className={s.tdCentro}>{g.inscritos}/{g.cupo_maximo}</td>
                  <td>{formatearFecha(g.fecha_inicio)}</td>
                  <td>{formatearFecha(g.fecha_fin)}</td>
                  <td>{g.lugar || '—'}</td>
                  <td className="col-actions">
                    <div className={s.accionesRow}>
                      {g.instructor_color && (
                        <span
                          title={`Instructor: ${g.instructor_nombre}`}
                          className={s.instructorDot}
                          style={{ background: g.instructor_color }}
                        />
                      )}
                      <button
                        title="Ver detalle"
                        className={`${s.btnAccion} ${s.btnVer}`}
                        onClick={() => setModal({ tipo: 'detalle', id: g.id })}
                      >
                        <Icon name="eye" size={11} /> Ver
                      </button>

                      <button
                        title={Number(g.inscritos) === 0 ? 'El grupo no tiene aspirantes inscritos' : 'Descargar informe Excel del grupo'}
                        className={`${s.btnAccion} ${s.btnExcel}`}
                        disabled={Number(g.inscritos) === 0}
                        onClick={() => descargarInformeGrupo(g, toast, GrupoService)}
                      >
                        <Icon name="download" size={11} /> Excel
                      </button>

                      <button
                        title={Number(g.inscritos) === 0 ? 'El grupo no tiene aspirantes inscritos' : 'Descargar ZIP con expedientes del grupo'}
                        className={`${s.btnAccion} ${s.btnExcel}`}
                        disabled={descargandoZip === g.id || Number(g.inscritos) === 0}
                        onClick={() => descargarZipDelGrupo(g)}
                      >
                        <Icon name="download" size={11} /> {descargandoZip === g.id ? '...' : 'ZIP'}
                      </button>

                      {esAdmin && (
                        <>
                          <button
                            title={g.estado === 'FINALIZADO' ? 'Grupo finalizado: no admite gestión de aspirantes' : 'Administrar aspirantes'}
                            className={`${s.btnAccion} ${s.btnGestionar}`}
                            disabled={g.estado === 'FINALIZADO'}
                            onClick={() => setModal({ tipo: 'administrar', id: g.id })}
                          >
                            <Icon name="settings" size={11} /> Gestionar
                          </button>

                          <button
                            title={g.estado === 'FINALIZADO' ? 'Grupo finalizado: no admite edición' : 'Editar grupo'}
                            className={`${s.btnAccion} ${s.btnEditar}`}
                            disabled={g.estado === 'FINALIZADO'}
                            onClick={() => setModal({ tipo: 'editar', grupo: g })}
                          >
                            <Icon name="edit" size={11} /> Editar
                          </button>

                          <button
                            title="Eliminar grupo"
                            className={`${s.btnAccion} ${s.btnEliminar}`}
                            onClick={() => eliminar(g.id)}
                          >
                            <Icon name="trash" size={11} /> Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginador
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            limite={limite}
            onChange={cambiarPagina}
          />
        </div>
      )}

      {modal?.tipo === 'detalle'     && <ModalDetalleGrupo grupoId={modal.id} onClose={() => setModal(null)} />}
      {modal?.tipo === 'administrar' && <ModalAdministrar  grupoId={modal.id} onClose={cerrarYRecargar} />}
      {modal?.tipo === 'crear'       && <ModalGrupo onClose={cerrarYRecargar} cursos={cursos} instructores={instructores} lugares={lugares} />}
      {modal?.tipo === 'editar'      && <ModalGrupo grupo={modal.grupo} onClose={cerrarYRecargar} cursos={cursos} instructores={instructores} lugares={lugares} />}
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
