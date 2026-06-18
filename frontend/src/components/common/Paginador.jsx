/**
 * components/common/Paginador.jsx
 * Responsabilidad : Paginador reutilizable con botones de página y conteo de registros.
 * Exporta         : Paginador (default)
 * Usado en        : pages/admin/Aspirantes.jsx, pages/admin/Solicitudes.jsx,
 *                   pages/admin/Grupos.jsx y otras páginas con tablas paginadas.
 */
import { memo } from 'react';
import s from './Paginador.module.css';

const MAX_BOTONES = 5;

const Paginador = memo(function Paginador({ pagina, totalPaginas, total, limite, onChange }) {
  if (total === undefined || total === null) return null;

  const fin    = Math.min(pagina * limite, total);
  const hayVarias = totalPaginas > 1;

  let desde = Math.max(1, pagina - Math.floor(MAX_BOTONES / 2));
  let hasta  = desde + MAX_BOTONES - 1;
  if (hasta > totalPaginas) {
    hasta = totalPaginas;
    desde = Math.max(1, hasta - MAX_BOTONES + 1);
  }

  const paginas = [];
  for (let i = desde; i <= hasta; i++) paginas.push(i);

  return (
    <div className={s.paginador}>
      <span className={s.info}>
        {total === 0 ? 'Sin registros' : `${fin} de ${total}`}
      </span>

      {hayVarias && (
        <div className={s.controles}>
          <button className={s.btn} onClick={() => onChange(1)} disabled={pagina === 1} title="Primera página">«</button>
          <button className={s.btn} onClick={() => onChange(pagina - 1)} disabled={pagina === 1} title="Anterior">‹</button>

          {desde > 1 && (
            <>
              <button className={s.btn} onClick={() => onChange(1)}>1</button>
              {desde > 2 && <span className={s.elipsis}>…</span>}
            </>
          )}

          {paginas.map(n => (
            <button
              key={n}
              className={`${s.btn} ${n === pagina ? s.activo : ''}`}
              onClick={() => onChange(n)}
              aria-current={n === pagina ? 'page' : undefined}
            >
              {n}
            </button>
          ))}

          {hasta < totalPaginas && (
            <>
              {hasta < totalPaginas - 1 && <span className={s.elipsis}>…</span>}
              <button className={s.btn} onClick={() => onChange(totalPaginas)}>{totalPaginas}</button>
            </>
          )}

          <button className={s.btn} onClick={() => onChange(pagina + 1)} disabled={pagina === totalPaginas} title="Siguiente">›</button>
          <button className={s.btn} onClick={() => onChange(totalPaginas)} disabled={pagina === totalPaginas} title="Última página">»</button>
        </div>
      )}
    </div>
  );
});

export default Paginador;
