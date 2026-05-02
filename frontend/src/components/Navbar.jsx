import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// SVG icon inline (cuadrado violeta + flecha de flujo)
function AgendaFlowIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="10" width="180" height="180" rx="36" fill="#6C63FF" />
      <rect x="42" y="36" width="22" height="8" rx="4" fill="white" opacity="0.35" />
      <rect x="136" y="36" width="22" height="8" rx="4" fill="white" opacity="0.35" />
      <rect x="34" y="56" width="132" height="108" rx="10" fill="none" stroke="white" strokeWidth="6" strokeOpacity="0.25" />
      <rect x="34" y="74" width="132" height="6" rx="3" fill="white" opacity="0.35" />
      <polygon points="88,104 108,92 108,116" fill="white" />
      <rect x="108" y="95" width="44" height="8" rx="4" fill="white" />
      <rect x="108" y="109" width="32" height="8" rx="4" fill="white" opacity="0.55" />
    </svg>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const homeLink = user?.rol === 'admin' ? '/admin' : user?.rol === 'empleado' ? '/empleado' : '/panel'

  return (
    <nav className="navbar">
      <Link to={homeLink} className="navbar-logo">
        <AgendaFlowIcon size={32} />
        <span className="navbar-logo-text">AgendaFlow</span>
      </Link>
      <div className="navbar-right">
        <div className="navbar-dot" title="Conectado" />
        <div className="navbar-user">
          <span>{user?.nombre} {user?.apellidos}</span>
          <span className={`role-badge ${user?.rol}`}>{user?.rol}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={toggle} title="Cambiar tema">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Salir
        </button>
      </div>
    </nav>
  )
}