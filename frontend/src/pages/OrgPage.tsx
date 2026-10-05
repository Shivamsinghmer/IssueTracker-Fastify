import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Modal } from '../components/Modal'
import { Button, EmptyState, ErrorBanner, Field, inputClass } from '../components/ui'
import type { Org, Task, TaskInput, TaskPriority, TaskStatus } from '../types'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'done', label: 'Done' },
]

export function OrgPage() {
  const { orgId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [org, setOrg] = useState<Org | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [taskModal, setTaskModal] = useState<'create' | number | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const token = localStorage.getItem('trackr_token')

  async function load() {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const [orgData, taskData] = await Promise.all([
        api<Org>(`/orgs/${orgId}`, { token }),
        api<Task[]>(`/orgs/${orgId}/tasks`, { token }),
      ])
      setOrg(orgData)
      setTasks(taskData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load org')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [orgId])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-tile-gray" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-64 animate-pulse rounded-2xl bg-tile-gray" />
          <div className="h-64 animate-pulse rounded-2xl bg-tile-gray" />
          <div className="h-64 animate-pulse rounded-2xl bg-tile-gray" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner>{error}</ErrorBanner>
        <Link to="/orgs" className="text-electric-blue hover:underline">
          ← Back to orgs
        </Link>
      </div>
    )
  }

  if (!org) return null

  const isOwner = org.owner_id === user?.id

  async function patchTask(taskId: number, patch: Partial<TaskInput>) {
    try {
      const updated = await api<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: patch, token })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function deleteOrg() {
    if (!org) return
    try {
      await api(`/orgs/${org.id}`, { method: 'DELETE', token })
      navigate('/orgs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete org')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Org header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-micro leading-micro uppercase text-steel">Organization</div>
          <h1 className="text-heading-small leading-heading-small font-medium tracking-heading-small">
            {org.name}
          </h1>
          {org.description && (
            <p className="mt-1 max-w-xl text-body leading-body text-steel">{org.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowInvite(true)}>
            Invite
          </Button>
          <Button onClick={() => setTaskModal('create')}>+ New task</Button>
        </div>
      </div>

      {/* Owner actions */}
      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-tile-gray p-4">
          <span className="text-nav leading-nav text-steel">Owner actions:</span>
          <Button
            variant="outline"
            onClick={() => {
              const name = window.prompt('New org name', org.name)
              if (name && name !== org.name) {
                void api<Org>(`/orgs/${org.id}`, { method: 'PATCH', body: { name }, token }).then(
                  (o) => setOrg(o),
                )
              }
            }}
          >
            Rename
          </Button>
          {!confirmDelete ? (
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              Delete org…
            </Button>
          ) : (
            <>
              <span className="text-nav leading-nav text-carbon">
                Delete this org and all its tasks?
              </span>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button onClick={deleteOrg}>Confirm delete</Button>
            </>
          )}
        </div>
      )}

      {/* Kanban board */}
      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" hint="Create the first task for this org." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.status)
            return (
              <div
                key={col.status}
                className="flex min-h-72 flex-col gap-3 rounded-2xl bg-tile-gray p-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = Number(e.dataTransfer.getData('text/plain'))
                  const task = tasks.find((t) => t.id === id)
                  if (task && task.status !== col.status) {
                    setTasks((prev) =>
                      prev.map((t) => (t.id === id ? { ...t, status: col.status } : t)),
                    )
                    void patchTask(id, { status: col.status })
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-strong leading-body-strong">{col.label}</span>
                  <span className="text-micro leading-micro text-steel">{columnTasks.length}</span>
                </div>
                {columnTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-black/15 p-4 text-center text-micro leading-micro text-steel">
                    Drop tasks here
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
                      className="cursor-grab rounded-lg bg-white p-3 transition-colors hover:bg-mist active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/orgs/${org.id}/tasks/${task.id}`}
                          className="text-body-strong leading-body-strong text-carbon hover:text-electric-blue"
                        >
                          {task.title}
                        </Link>
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            task.priority === 'high'
                              ? 'bg-electric-blue'
                              : task.priority === 'medium'
                                ? 'bg-steel'
                                : 'bg-mist'
                          }`}
                          title={`${task.priority} priority`}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-micro leading-micro text-steel">
                        {task.assignee && <span>@{task.assignee.username}</span>}
                        {task.due_date && (
                          <span>due {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {taskModal !== null && (
        <TaskModal
          orgId={org.id}
          task={typeof taskModal === 'number' ? (tasks.find((t) => t.id === taskModal) ?? null) : null}
          onClose={() => setTaskModal(null)}
          onSaved={() => void load()}
        />
      )}

      {showInvite && (
        <Modal
          title="Invite to org"
          subtitle="Share the org ID and invite code with teammates."
          onClose={() => setShowInvite(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-white p-3">
              <div className="text-micro leading-micro uppercase text-steel">Org ID</div>
              <div className="font-geistmono text-code leading-code">{org.id}</div>
            </div>
            <div className="rounded-lg bg-white p-3">
              <div className="text-micro leading-micro uppercase text-steel">Invite code</div>
              <div className="break-all font-geistmono text-code leading-code">
                {org.invite_code}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TaskModal({
  orgId,
  task,
  onClose,
  onSaved,
}: {
  orgId: number
  task: Task | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : '')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id?.toString() ?? '')
  const [imageUrls, setImageUrls] = useState((task?.image_urls ?? []).join(', '))
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const token = localStorage.getItem('trackr_token')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      const payload: TaskInput = {
        title,
        description: description || null,
        status,
        priority,
        due_date: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        image_urls: imageUrls
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean),
      }
      if (task) await api<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: payload, token })
      else await api<Task>(`/orgs/${orgId}/tasks`, { method: 'POST', body: payload, token })
      onSaved()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={task ? 'Edit task' : 'New task'}
      subtitle={task ? undefined : 'Created in this organization.'}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && <ErrorBanner>{formError}</ErrorBanner>}
        <Field label="Title">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </Field>
          <Field label="Priority">
            <select
              className={inputClass}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
        </div>
        <Field label="Due date">
          <input
            className={inputClass}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
        <Field label="Assignee ID (org member)">
          <input
            className={inputClass}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value.replace(/\D/g, ''))}
            placeholder="Leave empty for unassigned"
            inputMode="numeric"
          />
        </Field>
        <Field label="Image URLs (comma-separated)">
          <input
            className={inputClass}
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
