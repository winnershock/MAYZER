/**
 * config/db.js
 * Responsabilidad : Configuración del pool de conexiones MySQL y constantes CAT.
 * Exporta         : pool, CAT
 * Usado en        : Todos los controladores y middlewares que acceden a la base de datos.
 * Optimización    : connectionLimit 15 (antes 10), queueLimit 100 — soporta exportaciones ZIP concurrentes.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'mayzer_db',
  waitForConnections: true,
  // ── Optimizado: 15 conexiones para soportar exportaciones ZIP concurrentes
  //    (antes 10). queueLimit sube a 100 para evitar rechazos bajo picos de carga.
  connectionLimit: 15,
  queueLimit: 100,
  charset: 'utf8mb4',
  timezone: '-05:00',
  // Keep-alive: mantiene conexiones abiertas, evita overhead de reconexión
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.info('[db] Pool MySQL inicializado');
    conn.release();
  } catch (e) {
    console.error('❌ Error BD:', e.message);
    process.exit(1);
  }
}

// IDs de catálogos – fuente única de verdad
const CAT = {
  rol:        { ADMIN: 1, INSTRUCTOR: 2, SUPERUSUARIO: 3 },
  solEstado:  { PENDIENTE: 1, EN_REVISION: 2, APROBADA: 3, RECHAZADA: 4 },
  aspEstado:  { PENDIENTE: 1, PRE_APROBADO: 2, ASIGNADO: 3, RECHAZADO: 4 },
  grpEstado:  { PROGRAMADO: 1, EN_CURSO: 2, FINALIZADO: 3, CANCELADO: 4 },
  insEstado:  { INSCRITO: 1, APROBADO: 2, REPROBADO: 3, RETIRADO: 4 },
  correoTipo: { APROBACION: 1, RECHAZO: 2, ASIGNACION: 3, INFORMACION_CURSO: 4, GENERAL: 5 },
};

module.exports = { pool, testConnection, CAT };
