import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'
import { Navbar } from '../components/Navbar'

/** Renders the app shell only when authenticated; otherwise redirects to /login. */
export function ProtectedLayout() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
