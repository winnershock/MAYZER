/**
 * components/public/PantallaExito.jsx
 * Responsabilidad : Pantalla de confirmación tras el envío exitoso del formulario público.
 * Exporta         : PantallaExito (default)
 * Usado en        : pages/public/FormPublico.jsx
 */
export default function PantallaExito({ onReset }) {
  return (
    <div className="fp-success">
      <div className="fp-success-card">
        <div className="fp-success-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2>¡Solicitud enviada!</h2>
        <p>
          El SENA Palmira revisará los datos y notificará a cada aspirante
          por correo electrónico en los próximos días hábiles.
        </p>
        <button className="fp-btn-primary" onClick={onReset}>
          Enviar otra solicitud
        </button>
      </div>
    </div>
  );
}
