/**
 * DashboardAdmin — Pantalla de inicio para el administrador.
 * Muestra:
 *   - KPIs del día (citas hoy, confirmadas, ingresos del día, próxima cita)
 *   - Calendario visual semanal con huecos disponibles por empleado
 *   - Próximas citas confirmadas (listado rápido)
 */

import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// ─── helpers ────────────────────────────────────────────────────────────────

function toLocalISO(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatHora(h) { return h?.slice(0, 5) || '' }

function formatFechaCorta(isoStr) {
  const d = new Date(isoStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatFechaLarga(isoStr) {
  const d = new Date(isoStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Genera los 7 días de la semana que contiene "fecha" (lunes → domingo)
function semanaDesde(fecha) {
  const d = new Date(fecha + 'T12:00:00')
  const diaSemana = d.getDay() // 0=dom, 1=lun…
  const lunes = new Date(d)
  lunes.setDate(d.getDate() - ((diaSemana + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => toLocalISO(addDays(lunes, i)))
}

// Convierte "HH:MM" a minutos desde medianoche
function toMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Fracción de 0→1 dentro del rango del turno para posicionar en la cuadrícula
function pct(hora, inicio, fin) {
  const total = toMin(fin) - toMin(inicio)
  if (total <= 0) return { left: 0, width: 0 }
  const start = Math.max(0, toMin(hora) - toMin(inicio))
  return start / total
}

function fraccion(horaInicio, horaFin, turnoInicio, turnoFin) {
  const total = toMin(turnoFin) - toMin(turnoInicio)
  if (total <= 0) return { left: '0%', width: '0%' }
  const left = Math.max(0, toMin(horaInicio) - toMin(turnoInicio))
  const width = Math.min(toMin(horaFin), toMin(turnoFin)) - Math.max(toMin(horaInicio), toMin(turnoInicio))
  return {
    left: `${(left / total) * 100}%`,
    width: `${Math.max(0, width / total) * 100}%`,
  }
}

const COLORES_EMP = ['#7c6af5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899']

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'var(--accent)', icon }) {
  return (
    <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 10, right: 14,
        fontSize: 28, opacity: 0.12, lineHeight: 1,
      }}>{icon}</div>
      <div className="stat-num" style={{ color, fontSize: 28 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Calendario semanal ───────────────────────────────────────────────────────

function CalendarioSemanal({ citas, empleados, turnos }) {
  const hoy = toLocalISO(new Date())
  const [semanaBase, setSemanaBase] = useState(hoy)
  const dias = semanaDesde(semanaBase)

  const DIAS_LABEL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Map: empleadoId → color
  const colorMap = {}
  empleados.forEach((e, i) => { colorMap[e.id] = COLORES_EMP[i % COLORES_EMP.length] })

  // Map: empleadoId → { dia_semana: { hora_entrada, hora_salida } }
  const turnosMap = {}
  turnos.forEach(t => {
    if (!turnosMap[t.empleado_id]) turnosMap[t.empleado_id] = {}
    turnosMap[t.empleado_id][t.dia_semana] = t
  })

  // Para calcular el rango de horas visible, tomamos el mínimo turno_inicio y máximo turno_fin
  let minHora = 9, maxHora = 20
  turnos.forEach(t => {
    const h = parseInt(t.hora_entrada)
    const hf = parseInt(t.hora_salida)
    if (h < minHora) minHora = h
    if (hf > maxHora) maxHora = hf
  })

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
          Calendario semanal
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Leyenda empleados */}
          <div style={{ display: 'flex', gap: 10, marginRight: 8 }}>
            {empleados.map((e, i) => (
              <span key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORES_EMP[i % COLORES_EMP.length], display: 'inline-block' }} />
                {e.nombre}
              </span>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSemanaBase(toLocalISO(addDays(semanaBase + 'T12:00:00', -7)))}>‹</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSemanaBase(hoy)}>Hoy</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSemanaBase(toLocalISO(addDays(semanaBase + 'T12:00:00', 7)))}>›</button>
        </div>
      </div>

      {/* Grid de días */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(7, 1fr)`, minWidth: 640 }}>

          {/* Cabecera días */}
          <div style={{ background: 'var(--bg-card-2)', borderBottom: '1px solid var(--border)' }} />
          {dias.map((dia, i) => {
            const esHoy = dia === hoy
            return (
              <div key={dia} style={{
                background: 'var(--bg-card-2)',
                borderBottom: '1px solid var(--border)',
                borderLeft: '1px solid var(--border)',
                padding: '8px 4px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{DIAS_LABEL[i]}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700,
                  color: esHoy ? 'var(--accent)' : 'var(--text)',
                  lineHeight: 1.2,
                }}>{new Date(dia + 'T12:00:00').getDate()}</div>
                {esHoy && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', margin: '2px auto 0' }} />}
              </div>
            )
          })}

          {/* Filas por empleado */}
          {empleados.map((emp, ei) => {
            const color = COLORES_EMP[ei % COLORES_EMP.length]
            const turnosEmp = turnosMap[emp.id] || {}

            return (
              <div key={emp.id} style={{ display: 'contents' }}>
                {/* Nombre empleado */}
                <div style={{
                  borderTop: '1px solid var(--border)',
                  padding: '8px 6px',
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg-card)',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: color + '22', color, fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    flexShrink: 0,
                  }}>{emp.nombre[0]}</div>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.nombre}
                  </span>
                </div>

                {/* Celdas por día */}
                {dias.map((dia, di) => {
                  // dia_semana: 1=lunes … 7=domingo
                  const diaSemana = di + 1
                  const turno = turnosEmp[diaSemana]
                  const citasDia = citas.filter(c =>
                    c.empleado_id === emp.id && c.fecha === dia && c.estado !== 'cancelada'
                  )
                  const esHoy = dia === hoy
                  const esPasado = dia < hoy

                  return (
                    <div key={dia} style={{
                      borderTop: '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                      background: esHoy ? 'rgba(124,106,245,0.04)' : esPasado ? 'rgba(0,0,0,0.1)' : 'var(--bg-card)',
                      padding: 4,
                      minHeight: 56,
                      position: 'relative',
                    }}>
                      {!turno ? (
                        <div style={{
                          height: '100%', minHeight: 48,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-muted)', fontSize: 16, opacity: 0.3,
                        }}>—</div>
                      ) : (
                        <div style={{ position: 'relative', height: '100%', minHeight: 48 }}>
                          {/* Barra de turno (fondo) */}
                          <div style={{
                            position: 'absolute', inset: '4px 0',
                            background: color + '18',
                            borderRadius: 4,
                            border: `1px solid ${color}33`,
                          }} />
                          {/* Turno horario */}
                          <div style={{
                            position: 'absolute', top: 2, left: 2, right: 2,
                            fontSize: 9, color, opacity: 0.7, textAlign: 'center',
                          }}>{turno.hora_entrada}–{turno.hora_salida}</div>

                          {/* Citas como bloques */}
                          <div style={{ position: 'absolute', inset: '14px 2px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {citasDia.slice(0, 3).map(c => (
                              <div
                                key={c.id}
                                title={`${c.hora_inicio}–${c.hora_fin} · ${c.cliente_nombre} · ${c.servicio_nombre}`}
                                style={{
                                  background: color,
                                  borderRadius: 3,
                                  padding: '1px 4px',
                                  fontSize: 9,
                                  color: 'white',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  opacity: c.estado === 'completada' ? 0.5 : 1,
                                }}
                              >
                                {c.hora_inicio} {c.cliente_nombre?.split(' ')[0]}
                              </div>
                            ))}
                            {citasDia.length > 3 && (
                              <div style={{ fontSize: 9, color, paddingLeft: 4 }}>+{citasDia.length - 3} más</div>
                            )}
                          </div>

                          {/* Indicador libre/ocupado */}
                          {citasDia.filter(c => c.estado === 'confirmada').length === 0 && !esPasado && (
                            <div style={{
                              position: 'absolute', bottom: 2, right: 4,
                              fontSize: 8, color: '#10b981', fontWeight: 600,
                            }}>LIBRE</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Próximas citas ───────────────────────────────────────────────────────────

function ProximasCitas({ citas }) {
  const hoy = toLocalISO(new Date())
  const proximas = citas
    .filter(c => c.estado === 'confirmada' && c.fecha >= hoy)
    .sort((a, b) => (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio))
    .slice(0, 8)

  if (proximas.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Próximas citas</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No hay citas confirmadas próximas.</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
        🗓 Próximas citas confirmadas
      </div>
      <div>
        {proximas.map((c, i) => {
          const esHoy = c.fecha === hoy
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 18px',
              borderBottom: i < proximas.length - 1 ? '1px solid var(--border)' : 'none',
              background: esHoy ? 'rgba(124,106,245,0.04)' : 'transparent',
            }}>
              {/* Fecha/hora */}
              <div style={{ minWidth: 90, textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: esHoy ? 'var(--accent)' : 'var(--text-2)' }}>
                  {esHoy ? 'HOY' : formatFechaCorta(c.fecha)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatHora(c.hora_inicio)}</div>
              </div>
              {/* Barra vertical */}
              <div style={{ width: 3, height: 36, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.cliente_nombre}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {c.servicio_nombre} · {c.duracion_min} min
                </div>
              </div>
              {/* Empleado */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{c.empleado_nombre?.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{parseFloat(c.servicio_precio).toFixed(0)}€</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function DashboardAdmin() {
  const [citas, setCitas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [allTurnos, setAllTurnos] = useState([])
  const [loading, setLoading] = useState(true)

  const hoy = toLocalISO(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [citasRes, empRes] = await Promise.all([
        api.get('/citas'),
        api.get('/usuarios?rol=empleado'),
      ])
      setCitas(citasRes.data)
      const emps = empRes.data
      setEmpleados(emps)

      // Cargar turnos de todos los empleados
      const turnosAll = []
      await Promise.all(emps.map(async e => {
        try {
          const { data } = await api.get(`/horarios/turnos?empleado_id=${e.id}`)
          data.forEach(t => turnosAll.push({ ...t, empleado_id: e.id }))
        } catch (_) {}
      }))
      setAllTurnos(turnosAll)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="loading-center" style={{ padding: 80 }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const citasHoy = citas.filter(c => c.fecha === hoy)
  const citasHoyConf = citasHoy.filter(c => c.estado === 'confirmada')
  const ingresosMes = citas
    .filter(c => c.estado === 'completada' && c.fecha?.startsWith(hoy.slice(0, 7)))
    .reduce((acc, c) => acc + parseFloat(c.servicio_precio || 0), 0)

  // Próxima cita de hoy que aún no pasó
  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes()
  const proximaHoy = citasHoyConf
    .filter(c => toMin(c.hora_inicio) >= ahoraMin)
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))[0]

  const canceladasHoy = citasHoy.filter(c => c.estado === 'cancelada').length
  const totalSemana = citas.filter(c => {
    const dias = semanaDesde(hoy)
    return dias.includes(c.fecha) && c.estado === 'confirmada'
  }).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Saludo */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          Buenos días
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {formatFechaLarga(hoy)}
        </p>
      </div>

      {/* KPIs */}
      <div className="stats-row">
        <KpiCard
          label="Citas hoy"
          value={citasHoyConf.length}
          sub={`${canceladasHoy} cancelada${canceladasHoy !== 1 ? 's' : ''}`}
          color="var(--info)"
          icon="📅"
        />
        <KpiCard
          label="Esta semana"
          value={totalSemana}
          sub="confirmadas"
          color="var(--accent)"
          icon="📆"
        />
        <KpiCard
          label={`Ingresos ${new Date().toLocaleDateString('es-ES', { month: 'long' })}`}
          value={`${ingresosMes.toFixed(0)}€`}
          sub="citas completadas"
          color="var(--success)"
          icon="💰"
        />
        <KpiCard
          label="Próxima cita"
          value={proximaHoy ? formatHora(proximaHoy.hora_inicio) : '—'}
          sub={proximaHoy ? `${proximaHoy.cliente_nombre?.split(' ')[0]} · ${proximaHoy.servicio_nombre}` : 'Sin más citas hoy'}
          color="var(--warning)"
          icon="⏱"
        />
      </div>

      {/* Calendario semanal */}
      <CalendarioSemanal
        citas={citas}
        empleados={empleados}
        turnos={allTurnos}
      />

      {/* Próximas citas */}
      <ProximasCitas citas={citas} />

    </div>
  )
}