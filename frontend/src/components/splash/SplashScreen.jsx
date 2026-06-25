import { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';

export default function SplashScreen({ onDone }) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSaliendo(true), 1150);
    const t2 = setTimeout(() => onDone?.(), 1580);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className={`${styles.splash} ${saliendo ? styles['splash-exit'] : ''}`}
      role="status"
      aria-label="Bienvenido a Mayzer"
    >
      <div className={styles['splash-center']}>

        <div className={styles['splash-logo']}>
          <div className={styles['splash-glow']} />
          <div className={styles['splash-logo-box']}>
            <img src="/logo-sena.svg" alt="SENA" />
          </div>
        </div>

        <div className={styles['splash-wordmark']}>
          <div className={styles['splash-title']}>
            MAY<span>Z</span>ER
          </div>
          <div className={styles['splash-sub']}>
            SENA · Sede Industrial Palmira
          </div>
          <div className={styles['splash-divider']} />
          <div className={styles['splash-tagline']}>
            Trabajo Seguro en Alturas
          </div>
        </div>

      </div>
    </div>
  );
}
