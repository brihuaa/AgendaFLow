import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { ENABLE_ANALYTICS_MODULE, ENABLE_REVIEWS } from '../config'
import TabAnalitica from '../components/TabAnalitica'

const TABS_BASE = ['Reservas', 'Servicios', 'Horarios', 'Empleados']
const TABS = ENABLE_ANALYTICS_MODULE ? [...TABS_BASE, 'Analítica'] : TABS_BASE
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function Alert({ msg, onClose }) {
  if (!msg) return null
  return (
    <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>
      {msg.text}
      <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
    </div>
  )
}

function formatFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ========== TAB RESERVAS ==========
function TabReservas() {
  const [citas, setCitas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await api.get('/citas')
    setCitas(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtradas = filtro === 'todas' ? citas : citas.filter(c => c.estado === filtro)
  const counts = { total: citas.length, confirmada: citas.filter(c => c.estado === 'confirmada').length, completada: citas.filter(c => c.estado === 'completada').length }

  const action = async (id, endpoint) => {
    setActionId(id)
    try {
      await api.patch(`/citas/${id}/${endpoint}`)
      setMsg({ type: 'success', text: `Cita ${endpoint === 'completar' ? 'completada' : 'cancelada'}` })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    } finally { setActionId(null) }
  }

  return (
    <div>
      <Alert msg={msg} onClose={() => setMsg(null)} />
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-num">{counts.total}</div><div className="stat-label">Total</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--info)' }}>{counts.confirmada}</div><div className="stat-label">Confirmadas</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{counts.completada}</div><div className="stat-label">Completadas</div></div>
      </div>

      <div className="filter-row">
        {['todas', 'confirmada', 'completada', 'cancelada'].map(e => (
          <button key={e} className={`filter-btn ${filtro === e ? 'active' : ''}`} onClick={() => setFiltro(e)}>
            {e === 'todas' ? 'Todas' : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div> : (
        filtradas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div><div className="empty-title">No hay citas</div></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Fecha</th><th>Servicio</th><th>Cliente</th><th>Empleado</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filtradas.map(c => (
                  <tr key={c.id}>
                    <td className="td-bold">{formatFecha(c.fecha)} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.hora_inicio}</span></td>
                    <td>{c.servicio_nombre}</td>
                    <td>{c.cliente_nombre}</td>
                    <td>{c.empleado_nombre}</td>
                    <td><span className={`badge badge-${c.estado}`}>{c.estado}</span></td>
                    <td>
                      {c.estado === 'confirmada' && (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => action(c.id, 'completar')} disabled={actionId === c.id}>✓</button>
                          <button className="btn btn-danger btn-sm" onClick={() => action(c.id, 'cancelar')} disabled={actionId === c.id}>✗</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

// ========== TAB SERVICIOS ==========
function TabServicios() {
  const [servicios, setServicios] = useState([])
  const [form, setForm] = useState({ nombre: '', descripcion: '', duracion_min: 30, precio: '' })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await api.get('/servicios')
    setServicios(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const startEdit = (s) => {
    setEditing(s.id)
    setForm({ nombre: s.nombre, descripcion: s.descripcion || '', duracion_min: s.duracion_min, precio: s.precio })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/servicios/${editing}`, form)
        setMsg({ type: 'success', text: 'Servicio actualizado' })
        setEditing(null)
      } else {
        await api.post('/servicios', form)
        setMsg({ type: 'success', text: 'Servicio creado' })
      }
      setForm({ nombre: '', descripcion: '', duracion_min: 30, precio: '' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    } finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return
    try {
      await api.delete(`/servicios/${id}`)
      setMsg({ type: 'success', text: 'Servicio eliminado' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
      <div className="card">
        <div className="card-title">{editing ? '✏️ Editar servicio' : '➕ Nuevo servicio'}</div>
        <Alert msg={null} onClose={() => {}} />
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Nombre</label>
            <input className="form-control" name="nombre" placeholder="Ej: Corte de pelo" value={form.nombre} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input className="form-control" name="descripcion" placeholder="Opcional" value={form.descripcion} onChange={handle} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Duración (min)</label>
              <input className="form-control" name="duracion_min" type="number" min="5" step="5" value={form.duracion_min} onChange={handle} required />
            </div>
            <div className="form-group">
              <label>Precio (€)</label>
              <input className="form-control" name="precio" type="number" min="0" step="0.01" placeholder="0.00" value={form.precio} onChange={handle} required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <><span className="spinner" /> Guardando</> : editing ? 'Actualizar' : 'Crear'}
            </button>
            {editing && (
              <button className="btn btn-secondary" type="button" onClick={() => { setEditing(null); setForm({ nombre: '', descripcion: '', duracion_min: 30, precio: '' }) }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <Alert msg={msg} onClose={() => setMsg(null)} />
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nombre</th><th>Duración</th><th>Precio</th><th>Acciones</th></tr></thead>
              <tbody>
                {servicios.map(s => (
                  <tr key={s.id}>
                    <td className="td-bold">{s.nombre}<br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.descripcion}</span></td>
                    <td>{s.duracion_min} min</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.precio}€</td>
                    <td>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(s)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>✕</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ========== TAB HORARIOS ==========
function TabHorarios() {
  const [empleados, setEmpleados] = useState([])
  const [empSel, setEmpSel] = useState('')
  const [turnos, setTurnos] = useState([])
  const [form, setForm] = useState({ dia_semana: 1, hora_entrada: '09:00', hora_salida: '18:00' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.get('/usuarios?rol=empleado').then(r => setEmpleados(r.data))
  }, [])

  useEffect(() => {
    if (empSel) {
      api.get(`/horarios/turnos?empleado_id=${empSel}`).then(r => setTurnos(r.data))
    } else {
      setTurnos([])
    }
  }, [empSel])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/horarios/turnos', { empleado_id: parseInt(empSel), ...form, dia_semana: parseInt(form.dia_semana) })
      setMsg({ type: 'success', text: 'Turno guardado' })
      const { data } = await api.get(`/horarios/turnos?empleado_id=${empSel}`)
      setTurnos(data)
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    } finally { setSaving(false) }
  }

  const delTurno = async (dia) => {
    try {
      await api.delete('/horarios/turnos', { data: { empleado_id: parseInt(empSel), dia_semana: dia } })
      setMsg({ type: 'success', text: 'Turno eliminado' })
      const { data } = await api.get(`/horarios/turnos?empleado_id=${empSel}`)
      setTurnos(data)
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
      <div className="card">
        <div className="card-title">Asignar turno</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Empleado</label>
            <select className="form-control" value={empSel} onChange={e => setEmpSel(e.target.value)} required>
              <option value="">Selecciona un empleado</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellidos}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Día de la semana</label>
            <select className="form-control" value={form.dia_semana} onChange={e => setForm(f => ({ ...f, dia_semana: e.target.value }))}>
              {DIAS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Entrada</label>
              <input className="form-control" type="time" value={form.hora_entrada} onChange={e => setForm(f => ({ ...f, hora_entrada: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Salida</label>
              <input className="form-control" type="time" value={form.hora_salida} onChange={e => setForm(f => ({ ...f, hora_salida: e.target.value }))} required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving || !empSel}>
            {saving ? <><span className="spinner" /> Guardando</> : 'Asignar turno →'}
          </button>
        </form>
      </div>

      <div>
        <Alert msg={msg} onClose={() => setMsg(null)} />
        {!empSel ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>
            Selecciona un empleado para ver sus turnos
          </div>
        ) : turnos.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📆</div><div className="empty-title">Sin turnos asignados</div></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Acción</th></tr></thead>
              <tbody>
                {turnos.map(t => (
                  <tr key={t.dia_semana}>
                    <td className="td-bold">{t.dia_nombre}</td>
                    <td>{t.hora_entrada}</td>
                    <td>{t.hora_salida}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => delTurno(t.dia_semana)}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ========== TAB EMPLEADOS ==========
function TabEmpleados() {
  const [empleados, setEmpleados] = useState([])
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    const { data } = await api.get('/usuarios/all')
    setEmpleados(data)
  }, [])

  useEffect(() => { load() }, [load])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/usuarios', form)
      setMsg({ type: 'success', text: 'Empleado creado' })
      setForm({ nombre: '', apellidos: '', email: '', password: '' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    } finally { setSaving(false) }
  }

  const baja = async (id) => {
    try {
      await api.patch(`/usuarios/${id}/baja`)
      setMsg({ type: 'success', text: 'Empleado dado de baja' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    }
  }

  const reactivar = async (id) => {
    try {
      await api.patch(`/usuarios/${id}/reactivar`)
      setMsg({ type: 'success', text: 'Empleado reactivado' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    }
  }

  const activos = empleados.filter(e => e.activo)
  const inactivos = empleados.filter(e => !e.activo)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
      <div className="card">
        <div className="card-title">➕ Nuevo empleado</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Nombre</label>
            <input className="form-control" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Apellidos</label>
            <input className="form-control" name="apellidos" placeholder="Apellidos" value={form.apellidos} onChange={handle} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" name="email" placeholder="empleado@negocio.com" value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input className="form-control" type="password" name="password" placeholder="Mín. 6 caracteres" value={form.password} onChange={handle} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" /> Creando</> : 'Dar de alta →'}
          </button>
        </form>
      </div>

      <div>
        <Alert msg={msg} onClose={() => setMsg(null)} />
        <div className="card-title" style={{ marginBottom: 12 }}>Empleados activos ({activos.length})</div>
        <div className="table-wrapper" style={{ marginBottom: 24 }}>
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Acción</th></tr></thead>
            <tbody>
              {activos.map(e => (
                <tr key={e.id}>
                  <td className="td-bold">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="emp-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{e.nombre[0]}{e.apellidos?.[0] || ''}</div>
                      {e.nombre} {e.apellidos}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.email}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => baja(e.id)}>Dar de baja</button></td>
                </tr>
              ))}
              {activos.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Sin empleados activos</td></tr>}
            </tbody>
          </table>
        </div>

        {inactivos.length > 0 && (
          <>
            <div className="card-title" style={{ marginBottom: 12, color: 'var(--text-muted)' }}>Empleados inactivos ({inactivos.length})</div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Nombre</th><th>Email</th><th>Acción</th></tr></thead>
                <tbody>
                  {inactivos.map(e => (
                    <tr key={e.id} style={{ opacity: 0.6 }}>
                      <td>{e.nombre} {e.apellidos}</td>
                      <td>{e.email}</td>
                      <td><button className="btn btn-success btn-sm" onClick={() => reactivar(e.id)}>Reactivar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ========== MAIN PANEL ADMIN ==========
export default function PanelAdmin() {
  const [tab, setTab] = useState(0)

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Panel de administración</h1>
        <p className="page-subtitle">Gestiona tu negocio desde aquí</p>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <TabReservas />}
      {tab === 1 && <TabServicios />}
      {tab === 2 && <TabHorarios />}
      {tab === 3 && <TabEmpleados />}
      {ENABLE_ANALYTICS_MODULE && tab === 4 && <TabAnalitica enableReviews={ENABLE_REVIEWS} />}
    </main>
  )
}
