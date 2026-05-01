import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const homeLink = user?.rol === 'admin' ? '/admin' : user?.rol === 'empleado' ? '/empleado' : '/panel'

  return (
    <nav className="navbar">
      <Link to={homeLink} className="navbar-logo">
        <div className="navbar-logo-icon">📅</div>
        <span className="navbar-logo-text">AgendaFlow</span>
      </Link>
      <div className="navbar-right">
        <div className="navbar-dot" title="Conectado" />
        <div className="navbar-user">
          <span>{user?.nombre} {user?.apellidos}</span>
          <span className={`role-badge ${user?.rol}`}>{user?.rol}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Salir
        </button>
      </div>
    </nav>
  )
}
