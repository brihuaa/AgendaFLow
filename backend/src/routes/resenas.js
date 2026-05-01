/**
 * MÓDULO: Reseñas post-cita
 * Ruta: /api/resenas
 * Activación: ENABLE_REVIEWS en config.js
 *
 * Reglas:
 *  - Solo citas con estado = 'completada' pueden recibir reseña.
 *  - Un cliente solo puede dejar UNA reseña por cita.
 *  - La reseña está vinculada a cliente + empleado + cita.
 *  - El campo comentario es opcional.
 */

const router = require('express').Router();
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ---- GET /api/resenas/cita/:citaId ----
// Devuelve la reseña de una cita (si existe).
router.get('/cita/:citaId', authMiddleware, (req, res) => {
  const db = getDb();
  const resena = db.prepare('SELECT * FROM resenas WHERE cita_id = ?').get(req.params.citaId);
  res.json(resena || null);
});

// ---- GET /api/resenas/empleado/:empleadoId ----
// Devuelve todas las reseñas de un empleado con media.
router.get('/empleado/:empleadoId', authMiddleware, (req, res) => {
  const db = getDb();
  const resenas = db.prepare(`
    SELECT r.*, u.nombre || ' ' || u.apellidos AS cliente_nombre, c.fecha
    FROM resenas r
    JOIN usuarios u ON u.id = r.cliente_id
    JOIN citas c ON c.id = r.cita_id
    WHERE r.empleado_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.empleadoId);

  const media = resenas.length
    ? parseFloat((resenas.reduce((s, r) => s + r.puntuacion, 0) / resenas.length).toFixed(1))
    : null;

  res.json({ media, total: resenas.length, resenas });
});

// ---- POST /api/resenas ----
// Crea una reseña. Solo el cliente dueño de la cita.
router.post('/', authMiddleware, requireRole('cliente'), (req, res) => {
  const { cita_id, puntuacion, comentario = '' } = req.body;

  if (!cita_id || puntuacion == null) {
    return res.status(422).json({ error: 'cita_id y puntuacion son requeridos' });
  }
  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    return res.status(422).json({ error: 'La puntuación debe ser un número entero del 1 al 5' });
  }

  const db = getDb();
  const cita = db.prepare('SELECT * FROM citas WHERE id = ?').get(cita_id);

  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
  if (cita.cliente_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (cita.estado !== 'completada') {
    return res.status(400).json({ error: 'Solo se pueden reseñar citas completadas' });
  }

  const existe = db.prepare('SELECT id FROM resenas WHERE cita_id = ?').get(cita_id);
  if (existe) return res.status(409).json({ error: 'Ya existe una reseña para esta cita' });

  const result = db.prepare(`
    INSERT INTO resenas (cita_id, cliente_id, empleado_id, puntuacion, comentario)
    VALUES (?, ?, ?, ?, ?)
  `).run(cita_id, req.user.id, cita.empleado_id, puntuacion, comentario.slice(0, 500));

  const resena = db.prepare('SELECT * FROM resenas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(resena);
});

// ---- DELETE /api/resenas/:id ---- (admin)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const resena = db.prepare('SELECT id FROM resenas WHERE id = ?').get(req.params.id);
  if (!resena) return res.status(404).json({ error: 'Reseña no encontrada' });
  db.prepare('DELETE FROM resenas WHERE id = ?').run(req.params.id);
  res.json({ message: 'Reseña eliminada' });
});

module.exports = router;
