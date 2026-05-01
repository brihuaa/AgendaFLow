/**
 * MÓDULO: Analítica / Contabilidad (Tab en PanelAdmin)
 * Solo se renderiza si ENABLE_ANALYTICS_MODULE = true
 * Muestra métricas de empleados basadas en citas COMPLETADAS.
 */

import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const RANGOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Última semana' },
  { value: 'mes', label: 'Último mes' },
  { value: 'personalizado', label: 'Personalizado' },
]

// Mini barra horizontal para las gráficas inline
function BarChart({ data, valueKey, labelKey, color = 'var(--accent)', unit = '' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d[valueKey]), 0.01)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: 12, color: 'var(--text-2)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d[labelKey]}
          </div>
          <div style={{ flex: 1, background: 'var(--bg-card-2)', borderRadius: 4, height: 22, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: `${(d[valueKey] / max) * 100}%`,
              height: '100%',
              background: color,
              borderRadius: 4,
              transition: 'width 0.4s ease',
              minWidth: d[valueKey] > 0 ? 4 : 0,
            }} />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>
              {d[valueKey]}{unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StarRating({ media, total }) {
  if (media === null) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin reseñas</span>
  const stars = Math.round(media)
  return (
    <span title={`${media} / 5 (${total} reseñas)`} style={{ fontSize: 13 }}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 11 }}>{media} ({total})</span>
    </span>
  )
}

export default function TabAnalitica({ enableReviews }) {
  const [rango, setRango] = useState('mes')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [data, setData] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [ratings, setRatings] = useState({}) // empleadoId -> {media, total}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [grafica, setGrafica] = useState('ingresos') // qué gráfica mostrar

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ rango })
      if (rango === 'personalizado') {
        if (fechaDesde) params.append('fechaDesde', fechaDesde)
        if (fechaHasta) params.append('fechaHasta', fechaHasta)
      }
      const [empRes, resRes] = await Promise.all([
        api.get(`/analytics/empleados?${params}`),
        api.get(`/analytics/resumen?${params}`),
      ])
      setData(empRes.data)
      setResumen(resRes.data)

      // Cargar ratings si el módulo está activo
      if (enableReviews && empRes.data.empleados?.length) {
        const ratingPromises = empRes.data.empleados.map(e =>
          api.get(`/resenas/empleado/${e.empleado_id}`)
            .then(r => ({ id: e.empleado_id, media: r.data.media, total: r.data.total }))
            .catch(() => ({ id: e.empleado_id, media: null, total: 0 }))
        )
        const ratingResults = await Promise.all(ratingPromises)
        const map = {}
        ratingResults.forEach(r => { map[r.id] = r })
        setRatings(map)
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [rango, fechaDesde, fechaHasta, enableReviews])

  useEffect(() => { load() }, [load])

  const graficaData = data?.empleados?.map(e => ({
    ...e,
    label: e.nombre,
    ingresos: e.ingresos,
    horas_trabajadas: e.horas_trabajadas,
    total_citas: e.total_citas,
  })) || []

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {RANGOS.map(r => (
          <button
            key={r.value}
            className={`filter-btn ${rango === r.value ? 'active' : ''}`}
            onClick={() => setRango(r.value)}
          >
            {r.label}
          </button>
        ))}
        {rango === 'personalizado' && (
          <>
            <input className="form-control" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 150 }} />
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <input className="form-control" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 150 }} />
          </>
        )}
        {loading && <div className="spinner" style={{ width: 18, height: 18 }} />}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="stats-row" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-num" style={{ color: 'var(--success)' }}>{resumen.ingresos_totales}€</div>
            <div className="stat-label">Ingresos totales</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{ color: 'var(--accent)' }}>{resumen.horas_totales}h</div>
            <div className="stat-label">Horas trabajadas</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{resumen.total_citas_completadas}</div>
            <div className="stat-label">Citas completadas</div>
          </div>
          <div className="stat-card">
            <div className="stat-num" style={{ color: 'var(--info)' }}>{resumen.clientes_unicos}</div>
            <div className="stat-label">Clientes únicos</div>
          </div>
        </div>
      )}

      {/* Gráficas comparativas */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Panel gráficas */}
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[
                { key: 'ingresos', label: '💰 Ingresos', color: 'var(--success)' },
                { key: 'horas_trabajadas', label: '⏱ Horas', color: 'var(--accent)' },
                { key: 'total_citas', label: '📅 Citas', color: 'var(--info)' },
              ].map(g => (
                <button key={g.key} className={`filter-btn ${grafica === g.key ? 'active' : ''}`} onClick={() => setGrafica(g.key)} style={{ fontSize: 12 }}>
                  {g.label}
                </button>
              ))}
            </div>
            {graficaData.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Sin datos en este período</div>
            ) : (
              <BarChart
                data={graficaData}
                valueKey={grafica}
                labelKey="label"
                color={grafica === 'ingresos' ? 'var(--success)' : grafica === 'horas_trabajadas' ? 'var(--accent)' : 'var(--info)'}
                unit={grafica === 'ingresos' ? '€' : grafica === 'horas_trabajadas' ? 'h' : ''}
              />
            )}
          </div>

          {/* Tabla detalle */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 0', fontWeight: 600, fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
              Detalle por empleado
            </div>
            <div className="table-wrapper" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Horas</th>
                    <th>Citas</th>
                    <th>Ingresos</th>
                    {enableReviews && <th>Rating</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.empleados.map(e => (
                    <tr key={e.empleado_id}>
                      <td className="td-bold">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="emp-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {e.nombre[0]}{e.apellidos?.[0] || ''}
                          </div>
                          {e.nombre}
                        </div>
                      </td>
                      <td style={{ color: 'var(--accent)' }}>{e.horas_trabajadas}h</td>
                      <td>{e.total_citas}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{e.ingresos}€</td>
                      {enableReviews && (
                        <td>
                          <StarRating media={ratings[e.empleado_id]?.media ?? null} total={ratings[e.empleado_id]?.total ?? 0} />
                        </td>
                      )}
                    </tr>
                  ))}
                  {data.empleados.length === 0 && (
                    <tr><td colSpan={enableReviews ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Sin datos en este período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        * Las métricas se calculan únicamente a partir de citas con estado "completada".
        {data && <> Período: <strong>{data.desde}</strong> → <strong>{data.hasta}</strong></>}
      </div>
    </div>
  )
}
