
const TIPOS_ENTIDAD_VALIDOS = ['empresa', 'grupo SENA', 'persona'];
const MAX_ASPIRANTES        = 50;

function validarEmpresa(empresa, tipo_entidad, aspirantes) {
  if (!TIPOS_ENTIDAD_VALIDOS.includes(tipo_entidad)) return 'Tipo de registro inválido';
  if (tipo_entidad === 'persona' && aspirantes?.length !== 1) return 'Registro persona: solo 1 aspirante';
  if (!empresa?.nombre?.trim())              return 'El nombre es obligatorio';
  if (!empresa?.nombre_contacto?.trim())     return 'El nombre del solicitante es obligatorio';
  if (!empresa?.nit?.trim()) {
    if (tipo_entidad === 'persona')   return 'El número de documento es obligatorio';
    if (tipo_entidad === 'grupo SENA') return 'El número de ficha es obligatorio';
    return 'El NIT es obligatorio';
  }
  if (!empresa?.email?.includes('@'))        return 'El correo es inválido';
  if (!empresa?.telefono?.trim())            return 'El teléfono es obligatorio';
  if (!empresa?.ciudad_id)                   return 'La ciudad es obligatoria';
  return null;
}

function validarAspirante(aspirante, indice, pdfMap) {
  const n = indice + 1;
  if (!aspirante.nombre1?.trim())            return `Aspirante ${n}: primer nombre obligatorio`;
  if (!aspirante.apellido1?.trim())          return `Aspirante ${n}: primer apellido obligatorio`;
  if (!aspirante.numero_documento?.trim())   return `Aspirante ${n}: documento obligatorio`;
  if (!aspirante.email?.includes('@'))       return `Aspirante ${n}: correo inválido`;
  if (!aspirante.telefono?.trim())           return `Aspirante ${n}: teléfono obligatorio`;
  if (!aspirante.fecha_nacimiento)           return `Aspirante ${n}: fecha de nacimiento obligatoria`;
  if (!pdfMap[String(indice)])               return `Aspirante ${n}: el documento PDF es obligatorio`;
  if (!aspirante.contacto?.nombre?.trim())   return `Aspirante ${n}: contacto de emergencia obligatorio`;
  if (!aspirante.contacto?.telefono?.trim()) return `Aspirante ${n}: teléfono de emergencia obligatorio`;
  if (!aspirante.laboral?.nivel_academico)   return `Aspirante ${n}: nivel académico obligatorio`;
  return null;
}

module.exports = {
  TIPOS_ENTIDAD_VALIDOS,
  MAX_ASPIRANTES,
  validarEmpresa,
  validarAspirante,
};
