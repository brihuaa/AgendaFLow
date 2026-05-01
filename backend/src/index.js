const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb } = require('./db');

// Init DB
initDb();

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json());

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' }
});

// Feature flags
const { ENABLE_ANALYTICS_MODULE, ENABLE_REVIEWS } = require('./config');

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/horarios', require('./routes/horarios'));
app.use('/api/usuarios', require('./routes/usuarios'));

// Optional modules
if (ENABLE_ANALYTICS_MODULE) {
  app.use('/api/analytics', require('./routes/analytics'));
  console.log('📊 Módulo Analítica: ACTIVO');
}
if (ENABLE_REVIEWS) {
  app.use('/api/resenas', require('./routes/resenas'));
  console.log('⭐ Módulo Reseñas: ACTIVO');
}

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 for unknown API routes
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 AgendaFlow API → http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
});
