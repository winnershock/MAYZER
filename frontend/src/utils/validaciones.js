
export function soloDigitos(valor) {
  return valor.replace(/\D/g, '');
}

export function soloDigitosNit(valor) {
  return valor.replace(/[^\d-]/g, '').replace(/(-.*)-/, '$1');
}

export function onChangeTelefono(e) {
  return soloDigitos(e.target.value);
}

export function onChangeNit(e) {
  return soloDigitosNit(e.target.value);
}

export function validarTelefono(valor) {
  const digitos = soloDigitos(valor);
  if (!digitos) return { valido: false, mensaje: 'El teléfono es obligatorio' };
  if (digitos.length < 7) return { valido: false, mensaje: 'El teléfono debe tener al menos 7 dígitos' };
  if (digitos.length > 10) return { valido: false, mensaje: 'El teléfono no puede superar 10 dígitos' };
  return { valido: true, mensaje: '' };
}

export function validarNit(valor) {
  if (!valor || !valor.trim()) return { valido: false, mensaje: 'El NIT/documento es obligatorio' };
  const soloNums = soloDigitos(valor);
  if (soloNums.length < 6) return { valido: false, mensaje: 'El NIT/documento debe tener al menos 6 dígitos' };
  if (soloNums.length > 15) return { valido: false, mensaje: 'El NIT/documento es demasiado largo' };
  return { valido: true, mensaje: '' };
}

export function validarRequerido(valor, nombre = 'Este campo') {
  if (!valor || !String(valor).trim()) {
    return { valido: false, mensaje: `${nombre} es obligatorio` };
  }
  return { valido: true, mensaje: '' };
}

export function validarEmail(valor) {
  if (!valor || !valor.trim()) return { valido: false, mensaje: 'El correo es obligatorio' };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(valor.trim())) return { valido: false, mensaje: 'El correo no tiene un formato válido' };
  return { valido: true, mensaje: '' };
}
