/**
 * index.js  — Punto de entrada del servidor Express
 * Responsabilidad : Inicializa Express, registra middlewares globales y monta todas las rutas.
 * Depende de      : config/db.js, routes/index.js (barrel de rutas)
 */
require('dotenv').config();
const { version } = require('../package.json');

// ── Validación de variables de entorno obligatorias ──
const ENV_REQUERIDAS = ['JWT_SECRET'];
const faltantes = ENV_REQUERIDAS.filter(k => !process.env[k]);
if (faltantes.length) {
  console.error('\n❌ ERROR: Variables de entorno faltantes:', faltantes.join(', '));
  console.error('   Crea el archivo  backend/.env  basándote en  backend/.env.example\n');
  process.exit(1);
}

const express      = require('express');
const cookieParser = require('cookie-parser');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');
const { testConnection } = require('./config/db');

// Rutas — registradas desde el barrel routes/index.js
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad básica
app.use(helmet({
  contentSecurityPolicy: false, // React maneja esto
}));

// ── Compresión gzip/brotli — reduce transferencia JSON/HTML hasta 70 %
app.use(compression({
  level: 6,          // balance velocidad/compresión (1-9)
  threshold: 1024,   // no comprimir respuestas < 1KB
}));

// ── CORS (solo permite el frontend)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parseo JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { error: 'Demasiadas solicitudes, intenta en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Rate limiting estricto para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', loginLimiter);

// ── Registro de rutas desde el barrel ───────────────────────────────────
routes.forEach(({ path, router }) => app.use(path, router));

// ── Archivos estáticos (PDFs subidos)
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// ── Health check
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status:   'ok',
    sistema:  'Mayzer SENA Palmira',
    version,
    uptime:   `${Math.floor(process.uptime())}s`,
    memoria:  `${Math.round(mem.rss / 1024 / 1024)} MB`,
    entorno:  process.env.NODE_ENV || 'development',
  });
});

// ── Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message,
  });
});

// ── Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Iniciar servidor
let server;

async function start() {
  await testConnection();
  server = app.listen(PORT, () => {
    console.log(`✅ Mayzer corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

// ── Graceful shutdown ─────────────────────────────────────
// Permite que Docker / Kubernetes envíen SIGTERM y el servidor
// termine ordenadamente: deja de aceptar nuevas conexiones y
// espera a que las en curso terminen antes de salir.
function shutdown(signal) {
  console.log(`\n[${signal}] Cerrando servidor ordenadamente...`);
  if (!server) return process.exit(0);
  server.close(() => {
    console.log('✅ Servidor cerrado.');
    process.exit(0);
  });
  setTimeout(() => { console.error('⚠️  Forzando salida.'); process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
