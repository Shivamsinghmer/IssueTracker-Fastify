import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { ProtectedLayout } from './components/ProtectedLayout'

const OrgsPage = lazy(() => import('./pages/OrgsPage').then((m) => ({ default: m.OrgsPage })))
const OrgPage = lazy(() => import('./pages/OrgPage').then((m) => ({ default: m.OrgPage })))
const TaskPage = lazy(() => import('./pages/TaskPage').then((m) => ({ default: m.TaskPage })))
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="h-8 w-8 animate-pulse rounded-md bg-tile-gray" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/orgs" element={<OrgsPage />} />
            <Route path="/orgs/:orgId" element={<OrgPage />} />
            <Route path="/orgs/:orgId/tasks/:taskId" element={<TaskPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/orgs" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
