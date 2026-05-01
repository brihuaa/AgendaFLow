import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const STEPS = ['Servicio', 'Empleado', 'Fecha & Hora']

function StepIndicator({ current }) {
  return (
    <div className="steps">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : ''
        return (
          <div key={i} className={`step ${state}`}>
            <div className="step-circle">{i < current ? '✓' : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        )
      })}
    </div>
  )
}

function getMinDate() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export default function ReservarCita() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [servicios, setServicios] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [slots, setSlots] = useState([])
  const [sel, setSel] = useState({ servicio: null, empleado: null, fecha: '', slot: null })
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/servicios').then(r => setServicios(r.data)).catch(console.error)
  }, [])

  // Load employees when service selected
  useEffect(() => {
    if (sel.servicio) {
      api.get('/usuarios?rol=empleado').then(r => setEmpleados(r.data)).catch(console.error)
    }
  }, [sel.servicio])

  // Load slots when employee+date selected
  useEffect(() => {
    if (sel.empleado && sel.fecha && sel.servicio) {
      setLoadingSlots(true)
      setSlots([])
      api.get(`/horarios/disponibilidad?empleado_id=${sel.empleado.id}&servicio_id=${sel.servicio.id}&fecha=${sel.fecha}`)
        .then(r => setSlots(r.data))
        .catch(console.error)
        .finally(() => setLoadingSlots(false))
    }
  }, [sel.empleado, sel.fecha, sel.servicio])

  const selectServicio = (s) => { setSel({ servicio: s, empleado: null, fecha: '', slot: null }); setStep(1) }
  const selectEmpleado = (e) => { setSel(prev => ({ ...prev, empleado: e, fecha: '', slot: null })); setStep(2) }
  const selectSlot = (slot) => setSel(prev => ({ ...prev, slot }))

  const handleConfirm = async () => {
    if (!sel.slot) return setError('Selecciona un horario')
    setLoading(true)
    setError('')
    try {
      await api.post('/citas', {
        empleado_id: sel.empleado.id,
        servicio_id: sel.servicio.id,
        fecha: sel.fecha,
        hora_inicio: sel.slot.hora_inicio,
      })
      setSuccess(true)
    } catch (e) {
      setError(e.response?.data?.error || 'Error al reservar')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="page">
        <div style={{ textAlign: 'center', maxWidth: 440, margin: '60px auto' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>¡Reserva confirmada!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>{sel.servicio.nombre}</strong> con <strong style={{ color: 'var(--text)' }}>{sel.empleado.nombre}</strong>
          </p>
          <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16, marginBottom: 28 }}>
            {new Date(sel.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {sel.slot.hora_inicio} – {sel.slot.hora_fin}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setSel({ servicio: null, empleado: null, fecha: '', slot: null }); setStep(0); setSuccess(false) }}>
              Nueva reserva
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/panel')}>
              Mis citas
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Nueva reserva</h1>
        <p className="page-subtitle">Selecciona servicio, empleado y horario</p>
      </div>

      <div style={{ maxWidth: 760 }}>
        <StepIndicator current={step} />

        {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

        {/* STEP 0: Select Service */}
        {step === 0 && (
          <div>
            <p className="card-title">¿Qué servicio necesitas?</p>
            {servicios.length === 0 ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="service-list">
                {servicios.map(s => (
                  <div key={s.id} className={`service-card ${sel.servicio?.id === s.id ? 'selected' : ''}`} onClick={() => selectServicio(s)}>
                    <div className="svc-name">{s.nombre}</div>
                    {s.descripcion && <div className="svc-desc">{s.descripcion}</div>}
                    <div className="svc-meta">
                      <span className="svc-price">{s.precio}€</span>
                      <span className="svc-duration">⏱ {s.duracion_min} min</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Select Employee */}
        {step === 1 && (
          <div>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <p className="card-title">¿Con quién prefieres?</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setStep(0)}>← Volver</button>
            </div>
            {empleados.length === 0 ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="employee-list">
                {empleados.map(e => (
                  <div key={e.id} className={`employee-card ${sel.empleado?.id === e.id ? 'selected' : ''}`} onClick={() => selectEmpleado(e)}>
                    <div className="emp-avatar">{e.nombre[0]}{e.apellidos?.[0] || ''}</div>
                    <div className="emp-name">{e.nombre} {e.apellidos}</div>
                    <div className="emp-email">{e.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select Date & Slot */}
        {step === 2 && (
          <div>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <p className="card-title">Elige fecha y hora</p>
              <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>← Volver</button>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ background: 'var(--accent-light)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <span><strong>{sel.servicio?.nombre}</strong> · {sel.servicio?.duracion_min} min · <span style={{ color: 'var(--accent)' }}>{sel.servicio?.precio}€</span></span>
                <span style={{ color: 'var(--text-muted)' }}>con {sel.empleado?.nombre} {sel.empleado?.apellidos}</span>
              </div>

              <div className="form-group">
                <label>Fecha</label>
                <input
                  className="form-control"
                  type="date"
                  min={getMinDate()}
                  value={sel.fecha}
                  onChange={e => setSel(prev => ({ ...prev, fecha: e.target.value, slot: null }))}
                  style={{ maxWidth: 220 }}
                />
              </div>

              {sel.fecha && (
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Horas disponibles
                  </label>
                  {loadingSlots ? (
                    <div className="loading-center"><div className="spinner" /></div>
                  ) : slots.length === 0 ? (
                    <div className="alert alert-info">No hay huecos disponibles para esta fecha. Prueba con otro día o empleado.</div>
                  ) : (
                    <div className="slots-grid">
                      {slots.map((slot, i) => (
                        <button
                          key={i}
                          className={`slot-btn ${sel.slot?.hora_inicio === slot.hora_inicio ? 'selected' : ''}`}
                          onClick={() => selectSlot(slot)}
                        >
                          {slot.hora_inicio}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {sel.slot && (
              <div className="card" style={{ marginBottom: 16, background: 'var(--accent-light)', borderColor: 'var(--accent)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Resumen de tu reserva</div>
                <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700 }}>{sel.servicio?.nombre}</div>
                <div style={{ color: 'var(--text-2)', marginTop: 4 }}>
                  {new Date(sel.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {sel.slot.hora_inicio} – {sel.slot.hora_fin}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 2 }}>con {sel.empleado?.nombre} {sel.empleado?.apellidos}</div>
                <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 18, marginTop: 8 }}>{sel.servicio?.precio}€</div>
              </div>
            )}

            <button className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={!sel.slot || loading}>
              {loading ? <><span className="spinner" /> Confirmando...</> : 'Confirmar reserva →'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
