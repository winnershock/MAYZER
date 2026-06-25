
function notFoundSi(res, rows, mensaje = 'Registro no encontrado') {
  if (!rows.length) {
    res.status(404).json({ error: mensaje });
    return true;
  }
  return false;
}

function handleError(res, error, contexto, mensaje = 'Error interno del servidor') {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${contexto}]`, error.stack || error.message);
  } else {
    console.error(`[${contexto}]`, error.message);
  }
  const status = error.status || error.statusCode || 500;
  res.status(status).json({ error: mensaje });
}

module.exports = { notFoundSi, handleError };
