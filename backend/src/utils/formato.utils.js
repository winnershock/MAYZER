
const NOMBRES_MES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function etiquetaPeriodo(anio, mes) {
  if (anio && mes) return `${NOMBRES_MES[Number(mes)]} ${anio}`;
  if (anio) return `Año ${anio}`;
  return 'Todos los períodos';
}

function formatearFechaCO(fecha) {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

module.exports = { etiquetaPeriodo, formatearFechaCO, NOMBRES_MES };
