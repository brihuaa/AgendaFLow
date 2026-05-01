import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Registro() {
  const { register } = useAuth()
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
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <img src="/agendaflow_logo.svg" alt="AgendaFlow"  />
          </div>
        </div>

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
