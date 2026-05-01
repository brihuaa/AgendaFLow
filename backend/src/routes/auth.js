const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const ACCESS_TTL = '8h';
const REFRESH_DAYS = 7;

function makeTokens(user) {
  const payload = { id: user.id, email: user.email, nombre: user.nombre, apellidos: user.apellidos, rol: user.rol };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400 * 1000).toISOString();
  getDb().prepare('INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at) VALUES (?,?,?)').run(user.id, hash, expiresAt);
  return { accessToken, refreshToken };
}

// Registro
router.post('/registro', [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { nombre, apellidos = '', email, password } = req.body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare('INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol) VALUES (?,?,?,?,?)').run(nombre, apellidos, email, hash, 'cliente');
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(result.lastInsertRowid);

  const { accessToken, refreshToken } = makeTokens(user);
  res.status(201).json({ accessToken, refreshToken, user: { id: user.id, nombre: user.nombre, apellidos: user.apellidos, email: user.email, rol: user.rol } });
});

// Login
const loginAttempts = new Map();
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], (req, res) => {
  const { email, password } = req.body;
  const key = email?.toLowerCase();

  // Rate limit: 5 attempts
  const attempts = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + 900000 };
  if (Date.now() > attempts.resetAt) { attempts.count = 0; attempts.resetAt = Date.now() + 900000; }
  if (attempts.count >= 5) return res.status(403).json({ error: 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    attempts.count++;
    loginAttempts.set(key, attempts);
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  loginAttempts.delete(key);
  const { accessToken, refreshToken } = makeTokens(user);
  res.json({ accessToken, refreshToken, user: { id: user.id, nombre: user.nombre, apellidos: user.apellidos, email: user.email, rol: user.rol } });
});

// Refresh token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const db = getDb();
  const stored = db.prepare("SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime('now')").get(hash);
  if (!stored) return res.status(401).json({ error: 'Refresh token inválido o expirado' });

  const user = db.prepare('SELECT * FROM usuarios WHERE id = ? AND activo = 1').get(stored.usuario_id);
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  const { accessToken, refreshToken: newRefresh } = makeTokens(user);
  res.json({ accessToken, refreshToken: newRefresh });
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    getDb().prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  }
  res.json({ message: 'Sesión cerrada' });
});

// Me
router.get('/me', authMiddleware, (req, res) => {
  const user = getDb().prepare('SELECT id, nombre, apellidos, email, rol FROM usuarios WHERE id = ?').get(req.user.id);
  res.json(user);
});

module.exports = router;
