import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

function formatFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PanelEmpleado() {
  const { user } = useAuth()
  const [citas, setCitas] = useState([])
  const [fecha, setFecha] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = fecha ? `?fecha=${fecha}` : ''
      const { data } = await api.get(`/citas${params}`)
      setCitas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]
  const todayCount = citas.filter(c => c.fecha === today && c.estado === 'confirmada').length

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Mis citas asignadas</h1>
        <p className="page-subtitle">Vista de solo lectura — {user?.nombre} {user?.apellidos}</p>
      </div>

      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--info)' }}>{todayCount}</div>
          <div className="stat-label">Citas hoy</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{citas.filter(c => c.estado === 'confirmada').length}</div>
          <div className="stat-label">{fecha ? 'En fecha' : 'Pendientes'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--success)' }}>{citas.filter(c => c.estado === 'completada').length}</div>
          <div className="stat-label">Completadas</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, maxWidth: 240 }}>
          <input
            className="form-control"
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            placeholder="Filtrar por fecha"
          />
        </div>
        {fecha && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFecha('')}>
            Limpiar filtro
          </button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {fecha ? `Mostrando: ${formatFecha(fecha)}` : 'Todas las citas'}
        </span>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
      ) : citas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">Sin citas</div>
          <div className="empty-sub">{fecha ? 'No tienes citas en esta fecha.' : 'No tienes citas asignadas.'}</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Servicio</th>
                <th>Cliente</th>
                <th>Duración</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {citas.map(c => (
                <tr key={c.id}>
                  <td className="td-bold">
                    {new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {c.fecha === today && <span className="badge badge-confirmada" style={{ marginLeft: 8, fontSize: 10 }}>Hoy</span>}
                  </td>
                  <td className="td-bold">{c.hora_inicio} – {c.hora_fin}</td>
                  <td>{c.servicio_nombre}</td>
                  <td>{c.cliente_nombre}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.duracion_min} min</td>
                  <td><span className={`badge badge-${c.estado}`}>{c.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
