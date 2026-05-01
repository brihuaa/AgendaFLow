/**
 * MÓDULO: Reseñas post-cita
 * Componente: botón "Dejar reseña" que aparece en la fila de una cita completada.
 * Solo se monta si ENABLE_REVIEWS = true (el padre lo controla).
 */

import { useState, useEffect } from 'react'
import api from '../api/client'

// Modal inline de reseña
function ModalResena({ cita, onClose, onSuccess }) {
  const [puntuacion, setPuntuacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.post('/resenas', { cita_id: cita.id, puntuacion, comentario })
      onSuccess()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar reseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: 28, maxWidth: 420, width: '100%', boxShadow: 'var(--shadow)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Dejar reseña</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          {cita.servicio_nombre} con {cita.empleado_nombre}
        </div>

        {/* Estrellas */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Valoración *</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setPuntuacion(n)}
                style={{
                  fontSize: 28, background: 'none', border: 'none', cursor: 'pointer',
                  color: n <= puntuacion ? 'var(--warning)' : 'var(--border)',
                  transition: 'color 0.15s',
                  padding: '2px 4px',
                }}
                title={`${n} estrella${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][puntuacion]}
          </div>
        </div>

        {/* Comentario */}
        <div className="form-group">
          <label style={{ fontSize: 12 }}>Comentario (opcional)</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Cuéntanos tu experiencia..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            maxLength={500}
            style={{ resize: 'vertical' }}
          />
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
            {comentario.length}/500
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <><span className="spinner" /> Enviando</> : 'Enviar reseña'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Botón principal que se monta en cada fila de cita completada
export default function ReviewButton({ cita, onReviewed }) {
  const [estado, setEstado] = useState('loading') // loading | pendiente | enviada
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get(`/resenas/cita/${cita.id}`)
      .then(r => { if (!cancelled) setEstado(r.data ? 'enviada' : 'pendiente') })
      .catch(() => { if (!cancelled) setEstado('pendiente') })
    return () => { cancelled = true }
  }, [cita.id])

  if (estado === 'loading') return null
  if (estado === 'enviada') {
    return (
      <span style={{ color: 'var(--success)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        ★ Reseña enviada
      </span>
    )
  }

  return (
    <>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => setShowModal(true)}
        style={{ fontSize: 12 }}
        title="Dejar una reseña sobre esta cita"
      >
        ★ Reseñar
      </button>

      {showModal && (
        <ModalResena
          cita={cita}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setEstado('enviada')
            setShowModal(false)
            onReviewed?.()
          }}
        />
      )}
    </>
  )
}
