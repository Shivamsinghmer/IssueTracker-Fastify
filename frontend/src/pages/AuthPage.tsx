import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Button, ErrorBanner, Field, inputClass } from '../components/ui'

type Mode = 'login' | 'register'

export function AuthPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/orgs'

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isRegister = mode === 'register'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isRegister) await register(username, email, password)
      else await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-black/10">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-carbon">
            <span className="h-2 w-2 rounded-[2px] bg-white" />
          </span>
          <span className="text-body-strong leading-body-strong">Trackr</span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-display leading-display font-medium tracking-display">
            {isRegister ? (
              <>
                Create your
                <br />
                <span className="text-electric-blue">account</span>
              </>
            ) : (
              <>
                Welcome
                <br />
                <span className="text-electric-blue">back</span>
              </>
            )}
          </h1>
          <p className="mt-4 text-body-large leading-body-large text-steel">
            {isRegister
              ? 'One account for every org you own or join.'
              : 'Sign in to pick up where your team left off.'}
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Field label="Username">
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="dev"
                autoComplete="username"
                required
                minLength={3}
                maxLength={50}
              />
            </Field>
            {isRegister && (
              <Field label="Email">
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@example.com"
                  autoComplete="email"
                  required
                />
              </Field>
            )}
            <Field label="Password">
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                minLength={8}
                maxLength={72}
              />
            </Field>
            <Button type="submit" disabled={busy} className="mt-2 w-full py-2">
              {busy ? 'Working…' : isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-nav leading-nav text-steel">
            {isRegister ? 'Already have an account? ' : 'New to Trackr? '}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="text-electric-blue hover:underline"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
