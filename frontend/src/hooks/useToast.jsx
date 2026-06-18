/**
 * hooks/useToast.jsx
 * Responsabilidad : Proveedor y hook para notificaciones toast globales (Sonner).
 * Exporta         : ToastProvider, useToast
 * Usado en        : App.jsx (provider), cualquier componente que emita toasts
 */
import { createContext, useContext, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

const ToastCtx = createContext(null);

const TIPO_FN = {
  danger:  sonnerToast.error,
  warn:    sonnerToast.warning,
  info:    sonnerToast.info,
  sena:    sonnerToast.success,
  success: sonnerToast.success,
};

export function ToastProvider({ children }) {
  const toast = useCallback((mensaje, tipo = 'sena') => {
    const fn = TIPO_FN[tipo] ?? sonnerToast.success;
    fn(mensaje);
  }, []);

  return <ToastCtx.Provider value={toast}>{children}</ToastCtx.Provider>;
}

export const useToast = () => useContext(ToastCtx);
