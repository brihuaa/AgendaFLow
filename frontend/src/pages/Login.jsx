import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
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
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <img src="/agendaflow_logo.svg" alt="AgendaFlow" />
          </div>
        </div>

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
          ana@agendaflow.com · empleado123<br />
          cliente@agendaflow.com · cliente123
        </div>
      </div>
    </div>
  )
}
