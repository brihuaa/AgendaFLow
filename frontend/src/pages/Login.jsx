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

export default function Login() {
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      const dest = user.rol === 'admin' ? '/admin' : user.rol === 'empleado' ? '/empleado' : '/panel'
      navigate(dest, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
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

        <h2 className="auth-title">Iniciar sesión</h2>
        <p className="auth-sub">Accede con tus credenciales</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input
              className="form-control"
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={handle}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              className="form-control"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handle}
              required
            />
          </div>
          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Entrando...</> : 'Entrar →'}
          </button>
        </form>

        <div className="auth-link">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </div>

        <hr className="divider" />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--text-2)' }}>Cuentas de prueba</strong><br />
          admin@agendaflow.com · admin123<br />
          sara@agendaflow.com · empleado123<br />
          carlos@agendaflow.com · cliente123
        </div>
      </div>
    </div>
  )
}