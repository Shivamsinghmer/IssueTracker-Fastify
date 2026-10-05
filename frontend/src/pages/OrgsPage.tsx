import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Modal } from '../components/Modal'
import { Button, EmptyState, ErrorBanner, Field, inputClass } from '../components/ui'
import type { Org } from '../types'

export function OrgsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [joinOrgId, setJoinOrgId] = useState('')
  const [joinCode, setJoinCode] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setOrgs(await api<Org[]>('/orgs', { token: localStorage.getItem('trackr_token') }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orgs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function createOrg(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      const org = await api<Org>('/orgs', {
        method: 'POST',
        body: { name, description: description || null },
        token: localStorage.getItem('trackr_token'),
      })
      setShowCreate(false)
      setName('')
      setDescription('')
      navigate(`/orgs/${org.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create org')
    } finally {
      setBusy(false)
    }
  }

  async function joinOrg(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const org = await api<Org>(`/orgs/${joinOrgId}/join`, {
        method: 'POST',
        body: { invite_code: joinCode.trim() },
        token: localStorage.getItem('trackr_token'),
      })
      setJoinOrgId('')
      setJoinCode('')
      navigate(`/orgs/${org.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join org')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-heading-small leading-heading-small font-medium tracking-heading-small">
            Your organizations
          </h1>
          <p className="mt-1 text-nav leading-nav text-steel">
            Signed in as {user?.username ?? '…'} ·{' '}
            <Link to="/settings" className="text-electric-blue hover:underline">
              Settings
            </Link>
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New org</Button>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="rounded-2xl bg-tile-gray p-5">
        <div className="text-body-strong leading-body-strong">Join with an invite code</div>
        <p className="mt-1 text-nav leading-nav text-steel">
          Ask the org owner for its ID and invite code.
        </p>
        <form onSubmit={joinOrg} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className={inputClass + ' w-28'}
            value={joinOrgId}
            onChange={(e) => setJoinOrgId(e.target.value.replace(/\D/g, ''))}
            placeholder="Org ID"
            inputMode="numeric"
            required
          />
          <input
            className={inputClass + ' max-w-xs flex-1'}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Invite code"
            required
          />
          <Button type="submit" variant="outline" disabled={busy || !joinOrgId || !joinCode.trim()}>
            Join org
          </Button>
        </form>
      </div>

      {loading ? (
        <div className="flex gap-4">
          <div className="h-36 w-72 animate-pulse rounded-2xl bg-tile-gray" />
          <div className="h-36 w-72 animate-pulse rounded-2xl bg-tile-gray" />
        </div>
      ) : orgs.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          hint="Create your first org, or join one with an invite code."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Link
              key={org.id}
              to={`/orgs/${org.id}`}
              className="flex min-h-36 flex-col justify-between rounded-2xl bg-tile-gray p-5 transition-colors hover:bg-mist"
            >
              <div>
                <div className="text-body-strong leading-body-strong">{org.name}</div>
                <p className="mt-1 line-clamp-2 text-nav leading-nav text-steel">
                  {org.description ?? 'No description'}
                </p>
              </div>
              <div className="text-micro leading-micro text-steel">
                {org.owner_id === user?.id ? 'You own this org' : 'Member'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal
          title="New organization"
          subtitle="You become its owner and first member."
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={createOrg} className="flex flex-col gap-4">
            {formError && <ErrorBanner>{formError}</ErrorBanner>}
            <Field label="Name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="backend-team"
                required
                minLength={1}
                maxLength={100}
              />
            </Field>
            <Field label="Description (optional)">
              <textarea
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this team do?"
                rows={3}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Creating…' : 'Create org'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
