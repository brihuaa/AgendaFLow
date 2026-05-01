/**
 * MÓDULO: Analítica / Contabilidad
 * Ruta: /api/analytics
 * Acceso: solo admin
 * Activación: ENABLE_ANALYTICS_MODULE en config.js
 *
 * Todas las métricas se calculan ÚNICAMENTE sobre citas con estado = 'completada'.
 */

const router = require('express').Router();
const { getDb } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

// ---- Helpers ----

function buildDateFilter(rango, fechaDesde, fechaHasta) {
  const today = new Date().toISOString().split('T')[0];
  switch (rango) {
    case 'hoy':
      return { desde: today, hasta: today };
    case 'semana': {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { desde: d.toISOString().split('T')[0], hasta: today };
    }
    case 'mes': {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { desde: d.toISOString().split('T')[0], hasta: today };
    }
    case 'personalizado':
      return { desde: fechaDesde || '2000-01-01', hasta: fechaHasta || today };
    default:
      return { desde: '2000-01-01', hasta: today };
  }
}

// ---- GET /api/analytics/empleados ----
// Devuelve métricas por empleado filtradas por rango de fechas.
// Parámetros query: rango (hoy|semana|mes|personalizado), fechaDesde, fechaHasta
router.get('/empleados', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { rango = 'mes', fechaDesde, fechaHasta } = req.query;
  const { desde, hasta } = buildDateFilter(rango, fechaDesde, fechaHasta);

  const rows = db.prepare(`
    SELECT
      u.id                            AS empleado_id,
      u.nombre || ' ' || u.apellidos  AS empleado_nombre,
      u.nombre                        AS nombre,
      u.apellidos                     AS apellidos,
      COUNT(c.id)                     AS total_citas,
      COALESCE(SUM(s.duracion_min), 0) AS minutos_trabajados,
      COALESCE(SUM(s.precio), 0)      AS ingresos,
      COUNT(DISTINCT c.cliente_id)    AS clientes_unicos
    FROM usuarios u
    LEFT JOIN citas c
      ON c.empleado_id = u.id
      AND c.estado = 'completada'
      AND c.fecha BETWEEN ? AND ?
    LEFT JOIN servicios s
      ON s.id = c.servicio_id
    WHERE u.rol = 'empleado'
    GROUP BY u.id
    ORDER BY ingresos DESC
  `).all(desde, hasta);

  const result = rows.map(r => ({
    ...r,
    horas_trabajadas: parseFloat((r.minutos_trabajados / 60).toFixed(2)),
    ingresos: parseFloat(r.ingresos.toFixed(2)),
  }));

  res.json({ desde, hasta, empleados: result });
});

// ---- GET /api/analytics/resumen ----
// Resumen global del negocio en el rango.
router.get('/resumen', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { rango = 'mes', fechaDesde, fechaHasta } = req.query;
  const { desde, hasta } = buildDateFilter(rango, fechaDesde, fechaHasta);

  const row = db.prepare(`
    SELECT
      COUNT(c.id)                      AS total_citas_completadas,
      COALESCE(SUM(s.precio), 0)       AS ingresos_totales,
      COALESCE(SUM(s.duracion_min), 0) AS minutos_totales,
      COUNT(DISTINCT c.cliente_id)     AS clientes_unicos
    FROM citas c
    JOIN servicios s ON s.id = c.servicio_id
    WHERE c.estado = 'completada'
      AND c.fecha BETWEEN ? AND ?
  `).get(desde, hasta);

  res.json({
    desde,
    hasta,
    total_citas_completadas: row.total_citas_completadas,
    ingresos_totales: parseFloat(row.ingresos_totales.toFixed(2)),
    horas_totales: parseFloat((row.minutos_totales / 60).toFixed(2)),
    clientes_unicos: row.clientes_unicos,
  });
});

module.exports = router;
