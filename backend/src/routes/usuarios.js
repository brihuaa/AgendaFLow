const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/usuarios?rol=empleado — list (used for booking)
router.get('/', authMiddleware, (req, res) => {
  const { rol } = req.query;
  const db = getDb();
  let sql = 'SELECT id, nombre, apellidos, email, rol, activo, created_at FROM usuarios WHERE activo = 1';
  const params = [];
  if (rol) { sql += ' AND rol = ?'; params.push(rol); }
  sql += ' ORDER BY nombre';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/usuarios/all — all employees including inactive (admin)
router.get('/all', authMiddleware, requireRole('admin'), (req, res) => {
  const empleados = getDb().prepare(
    "SELECT id, nombre, apellidos, email, rol, activo, created_at FROM usuarios WHERE rol = 'empleado' ORDER BY nombre"
  ).all();
  res.json(empleados);
});

// POST /api/usuarios — create employee (admin)
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const { nombre, apellidos = '', email, password } = req.body;
  if (!nombre || !email || !password) return res.status(422).json({ error: 'nombre, email y password son requeridos' });
  if (password.length < 6) return res.status(422).json({ error: 'Contraseña mínimo 6 caracteres' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'El email ya está en uso' });

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO usuarios (nombre, apellidos, email, password_hash, rol) VALUES (?,?,?,?,?)'
  ).run(nombre, apellidos, email, hash, 'empleado');

  const user = db.prepare('SELECT id, nombre, apellidos, email, rol, activo FROM usuarios WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PATCH /api/usuarios/:id/baja — deactivate employee (admin)
router.patch('/:id/baja', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.rol === 'admin') return res.status(403).json({ error: 'No puedes dar de baja al administrador' });

  // Check for future confirmed appointments
  const futureAppointments = db.prepare(`
    SELECT id FROM citas WHERE empleado_id = ? AND estado = 'confirmada' AND fecha >= date('now')
  `).all(req.params.id);

  if (futureAppointments.length > 0) {
    return res.status(409).json({ 
      error: `El empleado tiene ${futureAppointments.length} cita(s) futura(s) confirmadas. Reasígnalas antes de dar de baja.`,
      pendingCitas: futureAppointments.length
    });
  }

  db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Empleado dado de baja' });
});

// PATCH /api/usuarios/:id/reactivar — reactivate (admin)
router.patch('/:id/reactivar', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE usuarios SET activo = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Empleado reactivado' });
});

module.exports = router;
