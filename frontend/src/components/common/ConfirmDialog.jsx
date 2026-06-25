import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({ open, mensaje, labelConfirmar = 'Confirmar', labelCancelar = 'Cancelar', variante = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <p className={styles.mensaje}>{mensaje}</p>
        <div className={styles.acciones}>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {labelCancelar}
          </button>
          <button
            type="button"
            className={`btn ${variante === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
