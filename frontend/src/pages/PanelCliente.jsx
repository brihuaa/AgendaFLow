import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ENABLE_REVIEWS } from '../config'
import ReviewButton from '../components/ReviewButton'

const ESTADOS = ['todas', 'confirmada', 'completada', 'cancelada']

function formatFecha(fecha) {
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PanelCliente() {
  const { user } = useAuth()
  const [citas, setCitas] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/citas')
      setCitas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtradas = filtro === 'todas' ? citas : citas.filter(c => c.estado === filtro)

  const handleCancelar = async (id) => {
    setCancelingId(id)
    try {
      await api.patch(`/citas/${id}/cancelar`)
      setMsg({ type: 'success', text: 'Cita cancelada correctamente' })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Error al cancelar' })
    } finally {
      setCancelingId(null)
      setConfirmId(null)
    }
  }

  const counts = {
    total: citas.length,
    confirmada: citas.filter(c => c.estado === 'confirmada').length,
    completada: citas.filter(c => c.estado === 'completada').length,
    cancelada: citas.filter(c => c.estado === 'cancelada').length,
  }

  return (
    <main className="page">
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Mis citas</h1>
          <p className="page-subtitle">Gestiona tus reservas</p>
        </div>
        <Link to="/reservar" className="btn btn-primary">+ Nueva reserva</Link>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: 20 }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-num">{counts.total}</div><div className="stat-label">Total reservas</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--info)' }}>{counts.confirmada}</div><div className="stat-label">Confirmadas</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--success)' }}>{counts.completada}</div><div className="stat-label">Completadas</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: 'var(--danger)' }}>{counts.cancelada}</div><div className="stat-label">Canceladas</div></div>
      </div>

      <div className="filter-row">
        {ESTADOS.map(e => (
          <button key={e} className={`filter-btn ${filtro === e ? 'active' : ''}`} onClick={() => setFiltro(e)}>
            {e === 'todas' ? 'Todas' : e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" style={{ width: 32, height: 32 }} /></div>
      ) : filtradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No hay citas</div>
          <div className="empty-sub">
            {filtro === 'todas' ? 'Aún no tienes reservas.' : `No hay citas ${filtro}s.`}
          </div>
          {filtro === 'todas' && (
            <Link to="/reservar" className="btn btn-primary" style={{ marginTop: 16 }}>Reservar ahora</Link>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Servicio</th>
                <th>Empleado</th>
                <th>Precio</th>
                <th>Estado</th>
                {ENABLE_REVIEWS && <th>Reseña</th>}
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => (
                <tr key={c.id}>
                  <td className="td-bold">{formatFecha(c.fecha)}</td>
                  <td>{c.hora_inicio} – {c.hora_fin}</td>
                  <td className="td-bold">{c.servicio_nombre}</td>
                  <td>{c.empleado_nombre}</td>
                  <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{c.servicio_precio}€</td>
                  <td><span className={`badge badge-${c.estado}`}>{c.estado}</span></td>
                  {ENABLE_REVIEWS && (
                    <td>
                      {c.estado === 'completada' && (
                        <ReviewButton cita={c} />
                      )}
                    </td>
                  )}
                  <td>
                    {c.estado === 'confirmada' && (
                      confirmId === c.id ? (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancelar(c.id)} disabled={cancelingId === c.id}>
                            {cancelingId === c.id ? '...' : '¿Seguro?'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmId(null)}>No</button>
                        </span>
                      ) : (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(c.id)}>
                          Cancelar
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
