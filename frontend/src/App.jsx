import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Registro from './pages/Registro'
import PanelCliente from './pages/PanelCliente'
import ReservarCita from './pages/ReservarCita'
import PanelAdmin from './pages/PanelAdmin'
import PanelEmpleado from './pages/PanelEmpleado'

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) {
    const redirect = user.rol === 'admin' ? '/admin' : user.rol === 'empleado' ? '/empleado' : '/panel'
    return <Navigate to={redirect} replace />
  }
  return children
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      {children}
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.rol)} /> : <Login />} />
      <Route path="/registro" element={user ? <Navigate to={homeFor(user.rol)} /> : <Registro />} />

      <Route path="/panel" element={
        <ProtectedRoute roles={['cliente']}>
          <AppLayout><PanelCliente /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/reservar" element={
        <ProtectedRoute roles={['cliente']}>
          <AppLayout><ReservarCita /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AppLayout><PanelAdmin /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/empleado" element={
        <ProtectedRoute roles={['empleado']}>
          <AppLayout><PanelEmpleado /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={
        <Navigate to={user ? homeFor(user.rol) : '/login'} replace />
      } />
    </Routes>
  )
}

function homeFor(rol) {
  if (rol === 'admin') return '/admin'
  if (rol === 'empleado') return '/empleado'
  return '/panel'
}
