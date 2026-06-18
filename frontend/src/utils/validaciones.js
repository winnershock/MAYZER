/**
 * utils/validaciones.js
 * Responsabilidad : Helpers de validación y sanitización de inputs de formulario.
 * Exporta         : soloDigitos, onChangeTelefono, onChangeNit
 * Usado en        : components/public/SeccionEmpresa.jsx, components/public/AspCard.jsx,
 *                   components/instructores/ModalInstructor.jsx
 */

/**
 * Filtra un valor dejando solo dígitos (0-9).
 * @param {string} valor
 * @returns {string}
 */
export function soloDigitos(valor) {
  return valor.replace(/\D/g, '');
}

/**
 * Filtra un valor dejando solo dígitos y el guion final permitido en NIT (ej: 900123456-7).
 * @param {string} valor
 * @returns {string}
 */
export function soloDigitosNit(valor) {
  // Permite dígitos y un guion opcional antes del dígito verificador
  return valor.replace(/[^\d-]/g, '').replace(/(-.*)-/, '$1');
}

/**
 * Handler onChange para inputs de teléfono — bloquea todo carácter que no sea dígito.
 * Uso: onChange={e => onChange('telefono', onChangeTelefono(e))}
 * @param {React.ChangeEvent<HTMLInputElement>} e
 * @returns {string}
 */
export function onChangeTelefono(e) {
  return soloDigitos(e.target.value);
}

/**
 * Handler onChange para inputs de NIT — permite dígitos y guion verificador.
 * @param {React.ChangeEvent<HTMLInputElement>} e
 * @returns {string}
 */
export function onChangeNit(e) {
  return soloDigitosNit(e.target.value);
}

/**
 * Valida que un teléfono colombiano tenga entre 7 y 10 dígitos.
 * @param {string} valor
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarTelefono(valor) {
  const digitos = soloDigitos(valor);
  if (!digitos) return { valido: false, mensaje: 'El teléfono es obligatorio' };
  if (digitos.length < 7) return { valido: false, mensaje: 'El teléfono debe tener al menos 7 dígitos' };
  if (digitos.length > 10) return { valido: false, mensaje: 'El teléfono no puede superar 10 dígitos' };
  return { valido: true, mensaje: '' };
}

/**
 * Valida que un NIT tenga entre 8 y 15 caracteres (dígitos + guion verificador).
 * @param {string} valor
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarNit(valor) {
  if (!valor || !valor.trim()) return { valido: false, mensaje: 'El NIT/documento es obligatorio' };
  const soloNums = soloDigitos(valor);
  if (soloNums.length < 6) return { valido: false, mensaje: 'El NIT/documento debe tener al menos 6 dígitos' };
  if (soloNums.length > 15) return { valido: false, mensaje: 'El NIT/documento es demasiado largo' };
  return { valido: true, mensaje: '' };
}

/**
 * Valida que un campo de texto no esté vacío ni sea solo espacios.
 * @param {string} valor
 * @param {string} nombre  Nombre del campo para el mensaje de error.
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarRequerido(valor, nombre = 'Este campo') {
  if (!valor || !String(valor).trim()) {
    return { valido: false, mensaje: `${nombre} es obligatorio` };
  }
  return { valido: true, mensaje: '' };
}

/**
 * Valida formato de email básico.
 * @param {string} valor
 * @returns {{ valido: boolean, mensaje: string }}
 */
export function validarEmail(valor) {
  if (!valor || !valor.trim()) return { valido: false, mensaje: 'El correo es obligatorio' };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(valor.trim())) return { valido: false, mensaje: 'El correo no tiene un formato válido' };
  return { valido: true, mensaje: '' };
}
