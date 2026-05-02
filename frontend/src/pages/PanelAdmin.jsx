import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { ENABLE_ANALYTICS_MODULE, ENABLE_REVIEWS } from '../config'
import TabAnalitica from '../components/TabAnalitica'
import DashboardAdmin from '../components/DashboardAdmin'

const TABS_BASE = ['Dashboard', 'Reservas', 'Servicios', 'Horarios', 'Empleados']
const TABS = ENABLE_ANALYTICS_MODULE ? [...TABS_BASE, 'Analítica'] : TABS_BASE
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function Alert({ msg, onClose }) {
  if (!msg) return null
  return (
    <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>
      {msg.text}
      <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>x</button>
    </div>
  )
}

function formatFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ========== TAB RESERVAS ==========

function toISO(date) {
  return date.toISOString().split('T')[0]
}

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

function buildCSV(rows) {
  const cabecera = ['Fecha', 'Dia semana', 'Hora inicio', 'Hora fin', 'Duracion (min)',
    'Servicio', 'Precio (EUR)', 'Cliente', 'Empleado', 'Estado']
  const data = rows.map(c => [
    c.fecha,
    DIAS_ES[new Date(c.fecha + 'T12:00:00').getDay()],
    c.hora_inicio,
    c.hora_fin,
    c.duracion_min,
    c.servicio_nombre,
    parseFloat(c.servicio_precio).toFixed(2),
    c.cliente_nombre,
    c.empleado_nombre,
    c.estado,
  ])
  return [cabecera, ...data]
    .map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';'))
    .join('\n')
}

function descargarCSV(rows, filename) {
  const csv = buildCSV(rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function descargarXLSX(rows, filename) {
  const cabecera = ['Fecha', 'Dia semana', 'Hora inicio', 'Hora fin', 'Duracion (min)',
    'Servicio', 'Precio (EUR)', 'Cliente', 'Empleado', 'Estado']
  const data = rows.map(c => [
    c.fecha,
    DIAS_ES[new Date(c.fecha + 'T12:00:00').getDay()],
    c.hora_inicio,
    c.hora_fin,
    c.duracion_min,
    c.servicio_nombre,
    parseFloat(c.servicio_precio).toFixed(2),
    c.cliente_nombre,
    c.empleado_nombre,
    c.estado,
  ])
  const escXml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const cell = v => {
    const n = parseFloat(v)
    if (!isNaN(n) && v !== '') return '<Cell><Data ss:Type="Number">' + n + '</Data></Cell>'
    return '<Cell><Data ss:Type="String">' + escXml(v) + '</Data></Cell>'
  }
  const hCell = h => '<Cell ss:StyleID="h"><Data ss:Type="String">' + escXml(h) + '</Data></Cell>'
  const headerRow = '<Row>' + cabecera.map(hCell).join('') + '</Row>'
  const dataRows = data.map(row => '<Row>' + row.map(cell).join('') + '</Row>').join('\n')
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '  <Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>',
    '  <Worksheet ss:Name="Citas AgendaFlow">',
    '    <Table>' + headerRow + dataRows + '</Table>',
    '  </Worksheet>',
    '</Workbook>',
  ].join('\n')
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function PanelExportacion({ citas }) {
  const hoy = toISO(new Date())
  const primerDiaMes = hoy.slice(0, 8) + '01'

  const [desde, setDesde] = useState(primerDiaMes)
  const [hasta, setHasta] = useState(hoy)
  const [estadoExp, setEstadoExp] = useState('todas')
  const [formato, setFormato] = useState('csv')
  const [expanded, setExpanded] = useState(false)

  const citasFiltradas = citas.filter(c => {
    const inRange = c.fecha >= desde && c.fecha <= hasta
    const inEstado = estadoExp === 'todas' || c.estado === estadoExp
    return inRange && inEstado
  })

  const ingresos = citasFiltradas
    .filter(c => c.estado === 'completada')
    .reduce((acc, c) => acc + parseFloat(c.servicio_precio || 0), 0)

  const setRango = (tipo) => {
    const hoyDate = new Date()
    if (tipo === 'hoy') {
      setDesde(hoy); setHasta(hoy)
    } else if (tipo === 'semana') {
      const lunes = new Date(hoyDate)
      lunes.setDate(hoyDate.getDate() - ((hoyDate.getDay() + 6) % 7))
      setDesde(toISO(lunes)); setHasta(hoy)
    } else if (tipo === 'mes') {
      setDesde(primerDiaMes); setHasta(hoy)
    } else if (tipo === 'trimestre') {
      const t = new Date(hoyDate)
      t.setMonth(t.getMonth() - 3)
      setDesde(toISO(t)); setHasta(hoy)
    } else if (tipo === 'todo') {
      const fechas = citas.map(c => c.fecha).filter(Boolean).sort()
      if (fechas.length) { setDesde(fechas[0]); setHasta(fechas[fechas.length - 1]) }
    }
  }

  const exportar = () => {
    const ts = desde + '_' + hasta
    const sufijo = estadoExp === 'todas' ? '' : '_' + estadoExp
    if (formato === 'csv') {
      descargarCSV(citasFiltradas, 'agendaflow_' + ts + sufijo + '.csv')
    } else {
      descargarXLSX(citasFiltradas, 'agendaflow_' + ts + sufijo + '.xls')
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 20, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'var(--bg-card-2)',
          border: 'none', cursor: 'pointer', color: 'var(--text)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>
          Exportar citas por periodo
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {!expanded && (
            <span>{citasFiltradas.length} cita{citasFiltradas.length !== 1 ? 's' : ''} en el periodo actual</span>
          )}
          <span style={{ fontSize: 10 }}>{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      {expanded && (
        <div style={{ padding: 16, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Rango rapido:</span>
            {[
              ['hoy', 'Hoy'],
              ['semana', 'Esta semana'],
              ['mes', 'Este mes'],
              ['trimestre', 'Ultimos 3 meses'],
              ['todo', 'Todo el historial'],
            ].map(([id, label]) => (
              <button key={id} className="filter-btn" onClick={() => setRango(id)} style={{ fontSize: 12 }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Desde</label>
              <input className="form-control" type="date" value={desde}
                onChange={e => setDesde(e.target.value)} max={hasta} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Hasta</label>
              <input className="form-control" type="date" value={hasta}
                onChange={e => setHasta(e.target.value)} min={desde} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Estado</label>
              <select className="form-control" value={estadoExp} onChange={e => setEstadoExp(e.target.value)}>
                <option value="todas">Todas</option>
                <option value="confirmada">Confirmadas</option>
                <option value="completada">Completadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: 11 }}>Formato</label>
              <select className="form-control" value={formato} onChange={e => setFormato(e.target.value)}>
                <option value="csv">CSV (separado por ;)</option>
                <option value="xlsx">Excel (.xls)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{citasFiltradas.length}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>citas</span>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{ingresos.toFixed(2)}€</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>ingresos completadas</span>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={exportar}
              disabled={citasFiltradas.length === 0}
              style={{ marginLeft: 'auto' }}
            >
              Descargar {formato.toUpperCase()}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Columnas exportadas: Fecha, Dia semana, Hora inicio, Hora fin, Duracion (min), Servicio, Precio, Cliente, Empleado, Estado
          </div>
        </div>
      )}
    </div>
  )
}

function TabReservas() {
  const [citas, setCitas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
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

  const byEstado = filtro === 'todas' ? citas : citas.filter(c => c.estado === filtro)
  const filtradas = busqueda.trim()
    ? byEstado.filter(c =>
        [c.cliente_nombre, c.empleado_nombre, c.servicio_nombre]
          .join(' ').toLowerCase().includes(busqueda.toLowerCase())
      )
    : byEstado

  const counts = {
    total: citas.length,
    confirmada: citas.filter(c => c.estado === 'confirmada').length,
    completada: citas.filter(c => c.estado === 'completada').length,
    cancelada: citas.filter(c => c.estado === 'cancelada').length,
  }

  const action = async (id, endpoint) => {
    setActionId(id)
    try {
      await api.patch(`/citas/${id}/${endpoint}`)
      setMsg({ type: 'success', text: `Cita ${endpoint === 'completar' ? 'marcada como completada' : 'cancelada'}` })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error' })
    } finally { setActionId(null) }
  }

  const ingresoTotal = citas
    .filter(c => c.estado === 'completada')
    .reduce((acc, c) => acc + (parseFloat(c.servicio_precio) || 0), 0)

  return (
    <div>
      <Alert msg={msg} onClose={() => setMsg(null)} />

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-num">{counts.total}</div>
          <div className="stat-label">Total citas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--info)' }}>{counts.confirmada}</div>
          <div className="stat-label">Confirmadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--success)' }}>{counts.completada}</div>
          <div className="stat-label">Completadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--danger)' }}>{counts.cancelada}</div>
          <div className="stat-label">Canceladas</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--success)', fontSize: 18 }}>{ingresoTotal.toFixed(0)}€</div>
          <div className="stat-label">Ingresos completadas</div>
        </div>
      </div>

      {!loading && <PanelExportacion citas={citas} />}

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="filter-row" style={{ margin: 0 }}>
          {['todas', 'confirmada', 'completada', 'cancelada'].map(e => (
            <button key={e} className={`filter-btn ${filtro === e ? 'active' : ''}`} onClick={() => setFiltro(e)}>
              {e === 'todas' ? 'Todas' : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <input
          className="form-control"
          placeholder="Buscar cliente, empleado o servicio..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        {busqueda && (
          <button className="btn btn-secondary btn-sm" onClick={() => setBusqueda('')}>Limpiar</button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 'auto' }}>
          {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
      ) : filtradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">No hay citas</div>
          <div className="empty-sub">{busqueda ? 'No coincide con tu busqueda.' : 'No hay citas en este estado.'}</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Servicio</th>
                <th>Duracion</th>
                <th>Cliente</th>
                <th>Empleado/a</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => (
                <tr key={c.id}>
                  <td className="td-bold" style={{ whiteSpace: 'nowrap' }}>
                    {formatFecha(c.fecha)}
                  </td>
                  <td style={{ color: 'var(--text-2)', whiteSpace: 'nowrap', fontSize: 13 }}>
                    {c.hora_inicio} - {c.hora_fin}
                  </td>
                  <td className="td-bold">{c.servicio_nombre}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {c.duracion_min} min
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="emp-avatar" style={{ width: 26, height: 26, fontSize: 10, flexShrink: 0 }}>
                        {(c.cliente_nombre || '?')[0]}
                      </div>
                      <span style={{ fontSize: 13 }}>{c.cliente_nombre}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="emp-avatar" style={{ width: 26, height: 26, fontSize: 10, flexShrink: 0, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {(c.empleado_nombre || '?')[0]}
                      </div>
                      <span style={{ fontSize: 13 }}>{c.empleado_nombre}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {parseFloat(c.servicio_precio).toFixed(2)}€
                  </td>
                  <td>
                    <span className={`badge badge-${c.estado}`}>{c.estado}</span>
                  </td>
                  <td>
                    {c.estado === 'confirmada' && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => action(c.id, 'completar')}
                          disabled={actionId === c.id}
                          title="Marcar como completada"
                        >Hecho</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => action(c.id, 'cancelar')}
                          disabled={actionId === c.id}
                          title="Cancelar cita"
                        >Cancelar</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    if (!confirm('Eliminar este servicio?')) return
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
        <div className="card-title">{editing ? 'Editar servicio' : 'Nuevo servicio'}</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Nombre</label>
            <input className="form-control" name="nombre" placeholder="Ej: Corte de pelo" value={form.nombre} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Descripcion</label>
            <input className="form-control" name="descripcion" placeholder="Opcional" value={form.descripcion} onChange={handle} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Duracion (min)</label>
              <input className="form-control" name="duracion_min" type="number" min="5" step="5" value={form.duracion_min} onChange={handle} required />
            </div>
            <div className="form-group">
              <label>Precio (EUR)</label>
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
              <thead><tr><th>Nombre</th><th>Duracion</th><th>Precio</th><th>Acciones</th></tr></thead>
              <tbody>
                {servicios.map(s => (
                  <tr key={s.id}>
                    <td className="td-bold">{s.nombre}<br /><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.descripcion}</span></td>
                    <td>{s.duracion_min} min</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.precio}€</td>
                    <td>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(s)}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>Eliminar</button>
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
            <label>Dia de la semana</label>
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
            {saving ? <><span className="spinner" /> Guardando</> : 'Asignar turno'}
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
          <div className="empty-state"><div className="empty-title">Sin turnos asignados</div></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Dia</th><th>Entrada</th><th>Salida</th><th>Accion</th></tr></thead>
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
        <div className="card-title">Nuevo empleado</div>
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
            <label>Contrasena</label>
            <input className="form-control" type="password" name="password" placeholder="Min. 6 caracteres" value={form.password} onChange={handle} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" /> Creando</> : 'Dar de alta'}
          </button>
        </form>
      </div>

      <div>
        <Alert msg={msg} onClose={() => setMsg(null)} />
        <div className="card-title" style={{ marginBottom: 12 }}>Empleados activos ({activos.length})</div>
        <div className="table-wrapper" style={{ marginBottom: 24 }}>
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Accion</th></tr></thead>
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
                <thead><tr><th>Nombre</th><th>Email</th><th>Accion</th></tr></thead>
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
        <h1 className="page-title">Panel de administracion</h1>
        <p className="page-subtitle">Gestiona tu negocio desde aqui</p>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <DashboardAdmin />}
      {tab === 1 && <TabReservas />}
      {tab === 2 && <TabServicios />}
      {tab === 3 && <TabHorarios />}
      {tab === 4 && <TabEmpleados />}
      {ENABLE_ANALYTICS_MODULE && tab === 5 && <TabAnalitica enableReviews={ENABLE_REVIEWS} />}
    </main>
  )
}