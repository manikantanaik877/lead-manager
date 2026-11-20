import { AuthProvider, useAuth } from './AuthContext'
import AuthPage from './components/AuthPage'
import LeadsPage from './components/LeadsPage'

function Gate() {
  const { user, booting } = useAuth()
  if (booting) return <p className="empty muted">Loading…</p>
  return user ? <LeadsPage /> : <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
