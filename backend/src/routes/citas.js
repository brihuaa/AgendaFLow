const router = require('express').Router();
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const withNames = `
  SELECT c.*, 
    u_cli.nombre || ' ' || u_cli.apellidos AS cliente_nombre,
    u_emp.nombre || ' ' || u_emp.apellidos AS empleado_nombre,
    s.nombre AS servicio_nombre, s.precio AS servicio_precio, s.duracion_min
  FROM citas c
  JOIN usuarios u_cli ON u_cli.id = c.cliente_id
  JOIN usuarios u_emp ON u_emp.id = c.empleado_id
  JOIN servicios s ON s.id = c.servicio_id
`;

// GET /api/citas — list (filtered by role)
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { rol, id } = req.user;
  const { estado, fecha } = req.query;

  let sql = withNames;
  const params = [];
  const conditions = [];

  if (rol === 'cliente') conditions.push('c.cliente_id = ?'), params.push(id);
  else if (rol === 'empleado') conditions.push('c.empleado_id = ?'), params.push(id);

  if (estado && estado !== 'todas') conditions.push('c.estado = ?'), params.push(estado);
  if (fecha) conditions.push('c.fecha = ?'), params.push(fecha);

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY c.fecha DESC, c.hora_inicio DESC';

  const citas = db.prepare(sql).all(...params);
  res.json(citas);
});

// POST /api/citas — create appointment
router.post('/', authMiddleware, requireRole('cliente'), (req, res) => {
  const { empleado_id, servicio_id, fecha, hora_inicio } = req.body;
  if (!empleado_id || !servicio_id || !fecha || !hora_inicio) {
    return res.status(422).json({ error: 'Faltan campos requeridos' });
  }

  const db = getDb();
  const servicio = db.prepare('SELECT * FROM servicios WHERE id = ? AND activo = 1').get(servicio_id);
  if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

  // Calculate end time
  const [h, m] = hora_inicio.split(':').map(Number);
  const totalMin = h * 60 + m + servicio.duracion_min;
  const hora_fin = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

  // Check collision using fn equivalent in JS
  const conflicts = db.prepare(`
    SELECT id FROM citas 
    WHERE empleado_id = ? AND fecha = ? AND estado != 'cancelada'
    AND hora_inicio < ? AND hora_fin > ?
  `).all(empleado_id, fecha, hora_fin, hora_inicio);

  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'El horario ya está reservado. Por favor elige otro.' });
  }

  const result = db.prepare(
    'INSERT INTO citas (cliente_id, empleado_id, servicio_id, fecha, hora_inicio, hora_fin, estado) VALUES (?,?,?,?,?,?,?)'
  ).run(req.user.id, empleado_id, servicio_id, fecha, hora_inicio, hora_fin, 'confirmada');

  const cita = db.prepare(`${withNames} WHERE c.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(cita);
});

// PATCH /api/citas/:id/cancelar
router.patch('/:id/cancelar', authMiddleware, (req, res) => {
  const db = getDb();
  const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

  const { rol, id } = req.user;
  if (rol === 'cliente' && cita.cliente_id !== id) return res.status(403).json({ error: 'No autorizado' });
  if (rol === 'empleado') return res.status(403).json({ error: 'No autorizado' });

  if (cita.estado !== 'confirmada') return res.status(400).json({ error: 'Solo se pueden cancelar citas confirmadas' });

  db.prepare("UPDATE citas SET estado = 'cancelada' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Cita cancelada' });
});

// PATCH /api/citas/:id/completar (admin only)
router.patch('/:id/completar', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
  if (cita.estado !== 'confirmada') return res.status(400).json({ error: 'Solo se pueden completar citas confirmadas' });

  db.prepare("UPDATE citas SET estado = 'completada' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Cita completada' });
});

module.exports = router;
