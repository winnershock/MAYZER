import { memo } from 'react';
import styles from './AccionesAspirante.module.css';
import Icon from '../common/Icon.jsx';

const AccionesAspirante = memo(function AccionesAspirante({
  aspirante,
  onPreAprobar,
  onRechazar,
  onAsignar,
  onRestablecer,
}) {
  const estado = aspirante.estado_proceso;

  return (
    <div className={styles['asp-acciones']}>
      {estado === 'PENDIENTE' && (
        <button
          type="button"
          className={`${styles['asp-accion-btn']} ${styles['asp-accion-aceptar']}`}
          title="Pre-aprobar"
          onClick={() => onPreAprobar(aspirante.id)}
        >
          <Icon name="check" size={12} /> Pre-aprobar
        </button>
      )}

      {estado === 'PENDIENTE' && (
        <button
          type="button"
          className={`${styles['asp-accion-btn']} ${styles['asp-accion-rechazar']}`}
          title="Rechazar"
          onClick={() => onRechazar(aspirante)}
        >
          <Icon name="x" size={12} /> Rechazar
        </button>
      )}

      {estado === 'PRE_APROBADO' && (
        <button
          type="button"
          className={`${styles['asp-accion-btn']} ${styles['asp-accion-asignar']}`}
          title="Asignar a grupo"
          onClick={() => onAsignar(aspirante)}
        >
          <Icon name="chevron-right" size={12} /> Asignar
        </button>
      )}

      {estado === 'RECHAZADO' && onRestablecer && (
        <button
          type="button"
          className={`${styles['asp-accion-btn']} ${styles['asp-accion-restablecer']}`}
          title="Devolver a estado Pendiente"
          onClick={() => onRestablecer(aspirante.id)}
        >
          <Icon name="refresh" size={12} /> Restablecer
        </button>
      )}
    </div>
  );
});

export default AccionesAspirante;
