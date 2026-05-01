const router = require('express').Router();
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/servicios — public list of active services
router.get('/', (req, res) => {
  const servicios = getDb().prepare('SELECT * FROM servicios WHERE activo = 1 ORDER BY nombre').all();
  res.json(servicios);
});

// POST /api/servicios — create (admin)
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const { nombre, descripcion = '', duracion_min, precio } = req.body;
  if (!nombre || !duracion_min || precio == null) {
    return res.status(422).json({ error: 'nombre, duracion_min y precio son requeridos' });
  }
  if (precio < 0) return res.status(422).json({ error: 'El precio no puede ser negativo' });
  if (duracion_min < 5) return res.status(422).json({ error: 'Duración mínima 5 minutos' });

  const result = getDb().prepare(
    'INSERT INTO servicios (nombre, descripcion, duracion_min, precio) VALUES (?,?,?,?)'
  ).run(nombre, descripcion, duracion_min, precio);

  const servicio = getDb().prepare('SELECT * FROM servicios WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(servicio);
});

// PUT /api/servicios/:id — update (admin)
router.put('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM servicios WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Servicio no encontrado' });

  const { nombre, descripcion, duracion_min, precio } = req.body;
  if (precio != null && precio < 0) return res.status(422).json({ error: 'El precio no puede ser negativo' });

  db.prepare(`
    UPDATE servicios SET
      nombre = COALESCE(?, nombre),
      descripcion = COALESCE(?, descripcion),
      duracion_min = COALESCE(?, duracion_min),
      precio = COALESCE(?, precio)
    WHERE id = ?
  `).run(nombre ?? null, descripcion ?? null, duracion_min ?? null, precio ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM servicios WHERE id = ?').get(req.params.id));
});

// DELETE /api/servicios/:id — delete (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM servicios WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Servicio no encontrado' });

  // Block if active appointments exist
  const active = db.prepare("SELECT id FROM citas WHERE servicio_id = ? AND estado = 'confirmada'").get(req.params.id);
  if (active) return res.status(409).json({ error: 'No se puede eliminar: hay citas activas vinculadas' });

  db.prepare('UPDATE servicios SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Servicio eliminado' });
});

module.exports = router;
