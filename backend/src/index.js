require('dotenv').config();
const { version } = require('../package.json');

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
const compression = require('compression');
const { testConnection } = require('./config/db');

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(compression({
  level: 6,
  threshold: 1024,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

routes.forEach(({ path, router }) => app.use(path, router));

app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

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

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

let server;

async function start() {
  await testConnection();
  server = app.listen(PORT, () => {
    console.log(`✅ Mayzer corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

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
