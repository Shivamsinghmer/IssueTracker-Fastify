import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Button, ErrorBanner, Field, inputClass } from '../components/ui'
import type { User } from '../types'

export function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const token = localStorage.getItem('trackr_token')

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setProfileError(null)
    setProfileSaved(false)
    setProfileBusy(true)
    try {
      const updated = await api<User>(`/users/${user.id}`, {
        method: 'PATCH',
        body: {
          username: username !== user.username ? username : undefined,
          email: email !== user.email ? email : undefined,
          password: password || undefined,
        },
        token,
      })
      updateUser(updated)
      setPassword('')
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setProfileBusy(false)
    }
  }

  async function deleteAccount() {
    if (!user) return
    setDeleteError(null)
    try {
      await api(`/users/${user.id}`, { method: 'DELETE', token })
      logout()
      navigate('/login')
    } catch (err) {
      // Backend rejects account deletion while the user still owns orgs.
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleteConfirm(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-heading-small leading-heading-small font-medium tracking-heading-small">
        Settings
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Profile */}
        <section className="w-full rounded-2xl bg-tile-gray p-6 lg:w-1/2">
          <h2 className="text-body-strong leading-body-strong">Profile</h2>
          <p className="mt-1 text-nav leading-nav text-steel">
            Member since {user ? new Date(user.created_at).toLocaleDateString() : '…'}
          </p>
          <form onSubmit={saveProfile} className="mt-4 flex flex-col gap-4">
            {profileError && <ErrorBanner>{profileError}</ErrorBanner>}
            {profileSaved && (
              <ErrorBanner>Profile saved.</ErrorBanner>
            )}
            <Field label="Username">
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={50}
                required
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="New password (leave empty to keep)">
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={profileBusy}>
                {profileBusy ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </section>

        {/* Danger zone */}
        <section className="w-full rounded-2xl border border-black/10 bg-paper p-6 lg:w-1/2">
          <h2 className="text-body-strong leading-body-strong">Danger zone</h2>
          <p className="mt-1 text-nav leading-nav text-steel">
            Deleting your account unassigns your tasks and removes your comments. Orgs you own must
            be deleted first.
          </p>
          {deleteError && (
            <div className="mt-4">
              <ErrorBanner>{deleteError}</ErrorBanner>
            </div>
          )}
          <div className="mt-4">
            {!deleteConfirm ? (
              <Button variant="outline" onClick={() => setDeleteConfirm(true)}>
                Delete account…
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-nav leading-nav text-carbon">
                  This cannot be undone. Delete your account?
                </span>
                <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={deleteAccount}>Confirm delete</Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
