const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'mayzer_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 100,
  charset: 'utf8mb4',
  timezone: '-05:00',
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

const CAT = {
  rol:        { ADMIN: 1, INSTRUCTOR: 2, SUPERUSUARIO: 3 },
  solEstado:  { PENDIENTE: 1, EN_REVISION: 2, APROBADA: 3, RECHAZADA: 4 },
  aspEstado:  { PENDIENTE: 1, PRE_APROBADO: 2, ASIGNADO: 3, RECHAZADO: 4 },
  grpEstado:  { PROGRAMADO: 1, EN_CURSO: 2, FINALIZADO: 3, CANCELADO: 4 },
  insEstado:  { INSCRITO: 1, APROBADO: 2, REPROBADO: 3, RETIRADO: 4 },
  correoTipo: { APROBACION: 1, RECHAZO: 2, ASIGNACION: 3, INFORMACION_CURSO: 4, GENERAL: 5 },
};

module.exports = { pool, testConnection, CAT };
