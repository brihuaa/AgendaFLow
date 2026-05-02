import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function AgendaFlowLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
      <svg width="48" height="48" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="10" y="10" width="180" height="180" rx="36" fill="#6C63FF" />
        <rect x="42" y="36" width="22" height="8" rx="4" fill="white" opacity="0.35" />
        <rect x="136" y="36" width="22" height="8" rx="4" fill="white" opacity="0.35" />
        <rect x="34" y="56" width="132" height="108" rx="10" fill="none" stroke="white" strokeWidth="6" strokeOpacity="0.25" />
        <rect x="34" y="74" width="132" height="6" rx="3" fill="white" opacity="0.35" />
        <polygon points="88,104 108,92 108,116" fill="white" />
        <rect x="108" y="95" width="44" height="8" rx="4" fill="white" />
        <rect x="108" y="109" width="32" height="8" rx="4" fill="white" opacity="0.55" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>AgendaFlow</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', fontWeight: 500 }}>BOOKING · MADE SIMPLE</span>
      </div>
    </div>
  )
}

export default function Registro() {
  const { register } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden')
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    setLoading(true)
    try {
      await register({ nombre: form.nombre, apellidos: form.apellidos, email: form.email, password: form.password })
      navigate('/panel', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <button
        onClick={toggle}
        title="Cambiar tema"
        style={{
          position: 'fixed', top: 16, right: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
          fontSize: 16, color: 'var(--text-2)', lineHeight: 1,
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <div className="auth-box">
        <AgendaFlowLogo />

        <h2 className="auth-title">Crear cuenta</h2>
        <p className="auth-sub">Únete a AgendaFlow como cliente</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input className="form-control" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handle} required />
            </div>
            <div className="form-group">
              <label>Apellidos</label>
              <input className="form-control" name="apellidos" placeholder="Apellidos" value={form.apellidos} onChange={handle} />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" name="email" placeholder="tu@email.com" value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input className="form-control" type="password" name="password" placeholder="Mín. 6 caracteres" value={form.password} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input className="form-control" type="password" name="confirm" placeholder="Repite la contraseña" value={form.confirm} onChange={handle} required />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Creando...</> : 'Registrarse →'}
          </button>
        </form>

        <div className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  )
}