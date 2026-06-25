import { useState, useMemo, useCallback } from "react";
import { SolicitudService } from "../../services";
import { useToast } from "../../hooks/useToast.jsx";
import { usePaginatedFetch } from "../../hooks/usePaginatedFetch.js";
import Icon from "../../components/common/Icon.jsx";
import Paginador from "../../components/common/Paginador.jsx";
import FiltrosBar from "../../components/common/FiltrosBar.jsx";
import TipoEntidadBadge from "../../components/common/TipoEntidadBadge.jsx";
import { SolEstadoBadge } from "../../components/common/EstadoBadge.jsx";
import s from "./Solicitudes.module.css";
import { formatearFecha } from "../../utils/fecha.js";
import ModalSolicitud from "../../components/solicitudes/ModalSolicitud.jsx";

const LIMITE = 25;
const CAMPOS_FILTRO = ["nombre", "nit", "estadoSolicitud", "anio", "mes"];
const FILTROS_INICIAL = {
  estado_solicitud: "",
  nombre: "",
  nit: "",
  anio: "",
  mes: "",
};

export default function Solicitudes() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAL);
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const {
    items: solicitudes,
    total,
    pagina,
    totalPaginas,
    cargando,
    recargar,
    cambiarPagina,
  } = usePaginatedFetch(
    (params) =>
      SolicitudService.listar(params).catch(() => {
        toast("Error al cargar solicitudes", "danger");
        return { data: [] };
      }),
    filtros,
    LIMITE,
  );

  const pendientes = useMemo(
    () => solicitudes.filter((s) => s.estado === "PENDIENTE").length,
    [solicitudes],
  );

  const f = useCallback((k, v) => setFiltros((p) => ({ ...p, [k]: v })), []);
  const limpiar = useCallback(() => setFiltros(FILTROS_INICIAL), []);

  return (
    <div>
      <div className="page-header">
        <div>
          <p>
            {total} solicitudes
            {pendientes > 0 && (
              <>
                {" "}
                ·{" "}
                <span className={s.statPendiente}>
                  {pendientes} nuevas sin revisar
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <FiltrosBar
        campos={CAMPOS_FILTRO}
        valores={filtros}
        onChange={f}
        onLimpiar={limpiar}
        labelBusquedaNombre="Empresa"
      />

      <div className="card">
        <div className="card-header">
          <span className="card-title">Solicitudes de formación</span>
          <span className={s.totalRegistros}>{total} registros</span>
        </div>
        <div className="table-wrap">
          {cargando ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <p>Cargando solicitudes...</p>
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="clipboard" size={22} />
              </div>
              <div className="empty-text">Sin solicitudes</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>NIT...</th>
                  <th>Curso solicitado</th>
                  <th>Aspirantes</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((sol) => (
                  <tr key={sol.id}>
                    <td className={s.celdaId}>#{sol.id}</td>
                    <td>
                      <TipoEntidadBadge tipo={sol.tipo_entidad} />
                    </td>
                    <td>
                      <strong>{sol.empresa_nombre}</strong>
                    </td>
                    <td className={s.celdaNit}>{sol.nit}</td>
                    <td className={s.celdaCurso}>{sol.curso_solicitado}</td>
                    <td className={s.colCentro}>
                      <span className="badge badge-gray">
                        {sol.total_aspirantes}
                      </span>
                    </td>
                    <td className={s.celdaFecha}>
                      {formatearFecha(sol.created_at)}
                    </td>
                    <td>
                      <SolEstadoBadge estado={sol.estado} />
                    </td>
                    <td>
                      <div className="td-actions">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            setModal({ tipo: "detalle", id: sol.id })
                          }
                        >
                          Ver detalle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          limite={LIMITE}
          onChange={cambiarPagina}
        />
      </div>

      {modal?.tipo === "detalle" && (
        <ModalSolicitud id={modal.id} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
