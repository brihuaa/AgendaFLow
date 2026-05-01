const router = require('express').Router();
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// GET /api/horarios/negocio
router.get('/negocio', (req, res) => {
  const horarios = getDb().prepare('SELECT * FROM horarios_negocio ORDER BY dia_semana').all();
  res.json(horarios.map(h => ({ ...h, dia_nombre: DIAS[h.dia_semana] })));
});

// PUT /api/horarios/negocio (admin)
router.put('/negocio', authMiddleware, requireRole('admin'), (req, res) => {
  const { horarios } = req.body; // array of { dia_semana, hora_apertura, hora_cierre }
  if (!Array.isArray(horarios)) return res.status(422).json({ error: 'Array de horarios requerido' });
  const db = getDb();
  const upsert = db.prepare(
    'INSERT INTO horarios_negocio (dia_semana, hora_apertura, hora_cierre) VALUES (?,?,?) ON CONFLICT(dia_semana) DO UPDATE SET hora_apertura=excluded.hora_apertura, hora_cierre=excluded.hora_cierre'
  );
  const tx = db.transaction(() => { horarios.forEach(h => upsert.run(h.dia_semana, h.hora_apertura, h.hora_cierre)); });
  tx();
  res.json({ message: 'Horarios actualizados' });
});

// GET /api/horarios/turnos?empleado_id=X
router.get('/turnos', authMiddleware, (req, res) => {
  const db = getDb();
  const { empleado_id } = req.query;
  let turnos;
  if (empleado_id) {
    turnos = db.prepare('SELECT * FROM turnos_empleado WHERE empleado_id = ? ORDER BY dia_semana').all(empleado_id);
  } else {
    turnos = db.prepare(`
      SELECT t.*, u.nombre || ' ' || u.apellidos AS empleado_nombre
      FROM turnos_empleado t JOIN usuarios u ON u.id = t.empleado_id
      ORDER BY t.empleado_id, t.dia_semana
    `).all();
  }
  res.json(turnos.map(t => ({ ...t, dia_nombre: DIAS[t.dia_semana] })));
});

// PUT /api/horarios/turnos (admin)
router.put('/turnos', authMiddleware, requireRole('admin'), (req, res) => {
  const { empleado_id, dia_semana, hora_entrada, hora_salida } = req.body;
  if (!empleado_id || !dia_semana || !hora_entrada || !hora_salida) {
    return res.status(422).json({ error: 'Todos los campos son requeridos' });
  }
  if (hora_entrada >= hora_salida) return res.status(422).json({ error: 'La hora de entrada debe ser anterior a la de salida' });

  const db = getDb();
  db.prepare(
    'INSERT INTO turnos_empleado (empleado_id, dia_semana, hora_entrada, hora_salida) VALUES (?,?,?,?) ON CONFLICT(empleado_id, dia_semana) DO UPDATE SET hora_entrada=excluded.hora_entrada, hora_salida=excluded.hora_salida'
  ).run(empleado_id, dia_semana, hora_entrada, hora_salida);

  res.json({ message: 'Turno guardado' });
});

// DELETE /api/horarios/turnos (admin)
router.delete('/turnos', authMiddleware, requireRole('admin'), (req, res) => {
  const { empleado_id, dia_semana } = req.body;
  getDb().prepare('DELETE FROM turnos_empleado WHERE empleado_id = ? AND dia_semana = ?').run(empleado_id, dia_semana);
  res.json({ message: 'Turno eliminado' });
});

// GET /api/horarios/disponibilidad?empleado_id=X&servicio_id=Y&fecha=YYYY-MM-DD
router.get('/disponibilidad', (req, res) => {
  const { empleado_id, servicio_id, fecha } = req.query;
  if (!empleado_id || !servicio_id || !fecha) {
    return res.status(422).json({ error: 'empleado_id, servicio_id y fecha requeridos' });
  }

  const db = getDb();

  // Day of week: JS getDay() 0=Sun → convert to 1=Mon..7=Sun
  const dateObj = new Date(fecha + 'T12:00:00');
  const jsDay = dateObj.getDay();
  const diaSemana = jsDay === 0 ? 7 : jsDay;

  const turno = db.prepare('SELECT * FROM turnos_empleado WHERE empleado_id = ? AND dia_semana = ?').get(empleado_id, diaSemana);
  if (!turno) return res.json([]);

  const servicio = db.prepare('SELECT * FROM servicios WHERE id = ? AND activo = 1').get(servicio_id);
  if (!servicio) return res.json([]);

  const citasExistentes = db.prepare(`
    SELECT hora_inicio, hora_fin FROM citas 
    WHERE empleado_id = ? AND fecha = ? AND estado != 'cancelada'
  `).all(empleado_id, fecha);

  const [sh, sm] = turno.hora_entrada.split(':').map(Number);
  const [eh, em] = turno.hora_salida.split(':').map(Number);
  let current = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const dur = servicio.duracion_min;

  const today = new Date();
  const isToday = fecha === today.toISOString().split('T')[0];
  const nowMin = today.getHours() * 60 + today.getMinutes();

  const slots = [];
  while (current + dur <= endMin) {
    // Skip past slots if today
    if (!isToday || current > nowMin) {
      const slotFin = current + dur;
      const hasConflict = citasExistentes.some(c => {
        const [ch, cm] = c.hora_inicio.split(':').map(Number);
        const [fh, fm] = c.hora_fin.split(':').map(Number);
        const cs = ch * 60 + cm, cf = fh * 60 + fm;
        return current < cf && slotFin > cs;
      });
      if (!hasConflict) {
        const pad = n => String(n).padStart(2, '0');
        slots.push({
          hora_inicio: `${pad(Math.floor(current / 60))}:${pad(current % 60)}`,
          hora_fin: `${pad(Math.floor(slotFin / 60))}:${pad(slotFin % 60)}`
        });
      }
    }
    current += 30;
  }

  res.json(slots);
});

module.exports = router;
