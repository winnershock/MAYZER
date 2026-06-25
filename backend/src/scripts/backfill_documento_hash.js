/**
 * Script de backfill: rellena `aspirante.numero_documento_hash` para los
 * registros existentes (creados antes de agregar la columna de búsqueda).
 *
 * Por qué existe: el número de documento se guarda cifrado con AES-CBC e IV
 * aleatorio por valor, así que no se puede buscar con LIKE en SQL. Esta
 * columna nueva guarda un HMAC-SHA256 determinístico del número (no
 * reversible) que sí permite búsqueda exacta indexada por CC.
 *
 * Uso:
 *   cd backend
 *   node src/scripts/backfill_documento_hash.js
 *
 * Seguro de ejecutar varias veces: solo actualiza filas con hash NULL.
 */
const { pool } = require('../config/db');
const { descifrar, hashBusqueda } = require('../utils/crypto.utils');

async function main() {
  console.info('[backfill] Buscando aspirantes sin numero_documento_hash...');

  const [filas] = await pool.execute(
    `SELECT id, numero_documento FROM aspirante WHERE numero_documento_hash IS NULL`
  );

  if (!filas.length) {
    console.info('[backfill] Nada que hacer. Todos los registros ya tienen hash.');
    await pool.end();
    return;
  }

  console.info(`[backfill] ${filas.length} aspirante(s) por actualizar.`);

  let ok = 0;
  let fallidos = 0;

  for (const fila of filas) {
    const numeroPlano = descifrar(fila.numero_documento);
    if (!numeroPlano) {
      console.warn(`[backfill] No se pudo descifrar numero_documento del aspirante id=${fila.id}, se omite.`);
      fallidos++;
      continue;
    }
    const hash = hashBusqueda(numeroPlano);
    await pool.execute(
      'UPDATE aspirante SET numero_documento_hash = ? WHERE id = ?',
      [hash, fila.id]
    );
    ok++;
  }

  console.info(`[backfill] Completado. Actualizados: ${ok}. Omitidos por error: ${fallidos}.`);
  await pool.end();
}

main().catch((e) => {
  console.error('[backfill] Error fatal:', e.message);
  process.exit(1);
});
