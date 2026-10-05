import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Button, EmptyState, ErrorBanner, inputClass } from '../components/ui'
import type { Comment, Org, Task, TaskPriority, TaskStatus } from '../types'

export function TaskPage() {
  const { taskId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const token = localStorage.getItem('trackr_token')

  async function load() {
    if (!taskId) return
    setLoading(true)
    setError(null)
    try {
      const taskData = await api<Task>(`/tasks/${taskId}`, { token })
      setTask(taskData)
      const [commentsData, orgData] = await Promise.all([
        api<Comment[]>(`/tasks/${taskId}/comments`, { token }),
        api<Org>(`/orgs/${taskData.org_id}`, { token }),
      ])
      setComments(commentsData)
      setOrg(orgData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [taskId])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-96 animate-pulse rounded-md bg-tile-gray" />
        <div className="h-64 animate-pulse rounded-2xl bg-tile-gray" />
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

  if (!task || !org) return null

  const isOwner = org.owner_id === user?.id

  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !task) return
    setCommentError(null)
    setBusy(true)
    try {
      const created = await api<Comment>(`/tasks/${task.id}/comments`, {
        method: 'POST',
        body: { content: newComment.trim() },
        token,
      })
      setComments((prev) => [...prev, created])
      setNewComment('')
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setBusy(false)
    }
  }

  async function saveCommentEdit(commentId: number) {
    if (!editText.trim()) return
    setCommentError(null)
    try {
      const updated = await api<Comment>(`/comments/${commentId}`, {
        method: 'PATCH',
        body: { content: editText.trim() },
        token,
      })
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      setEditingCommentId(null)
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to edit comment')
    }
  }

  async function deleteComment(commentId: number) {
    setCommentError(null)
    try {
      await api(`/comments/${commentId}`, { method: 'DELETE', token })
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  async function patchTask(patch: Record<string, unknown>) {
    try {
      const updated = await api<Task>(`/tasks/${task!.id}`, { method: 'PATCH', body: patch, token })
      setTask(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function deleteTask() {
    if (!task) return
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE', token })
      navigate(`/orgs/${task.org_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  const priorityDot =
    task.priority === 'high'
      ? 'bg-electric-blue'
      : task.priority === 'medium'
        ? 'bg-steel'
        : 'bg-mist'

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/orgs/${task.org_id}`}
        className="w-fit text-nav leading-nav text-steel hover:text-electric-blue"
      >
        ← {org.name}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-2xl bg-tile-gray p-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-heading-small leading-heading-small font-medium tracking-heading-small">
                {task.title}
              </h1>
              <span
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${priorityDot}`}
                title={`${task.priority} priority`}
              />
            </div>
            {task.description ? (
              <p className="mt-3 text-body-large leading-body-large text-carbon">
                {task.description}
              </p>
            ) : (
              <p className="mt-3 text-body-large leading-body-large text-steel">No description.</p>
            )}

            {task.image_urls.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {task.image_urls.map((url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt={`Attachment ${i + 1}`}
                    className="h-24 w-36 rounded-lg border border-black/10 bg-white object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <section className="flex flex-col gap-4">
            <h2 className="text-body-strong leading-body-strong">
              Comments <span className="text-steel">({comments.length})</span>
            </h2>
            {commentError && <ErrorBanner>{commentError}</ErrorBanner>}

            {comments.length === 0 ? (
              <EmptyState title="No comments yet" hint="Start the discussion below." />
            ) : (
              <ul className="flex flex-col gap-3">
                {comments.map((comment) => {
                  const isMine = comment.user_id === user?.id
                  const isEditing = editingCommentId === comment.id
                  return (
                    <li key={comment.id} className="rounded-2xl bg-tile-gray p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-nav leading-nav font-medium">
                          {comment.author?.username ?? `user ${comment.user_id}`}
                        </span>
                        <span className="text-micro leading-micro text-steel">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <textarea
                            className={inputClass}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => void saveCommentEdit(comment.id)}
                              disabled={!editText.trim()}
                            >
                              Save
                            </Button>
                            <Button variant="outline" onClick={() => setEditingCommentId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-body leading-body">{comment.content}</p>
                      )}
                      {!isEditing && (isMine || isOwner) && (
                        <div className="mt-3 flex gap-2">
                          {isMine && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingCommentId(comment.id)
                                setEditText(comment.content)
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button variant="outline" onClick={() => void deleteComment(comment.id)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <form onSubmit={addComment} className="flex flex-col gap-2">
              <textarea
                className={inputClass}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={busy || !newComment.trim()}>
                  Comment
                </Button>
              </div>
            </form>
          </section>
        </div>

        {/* Side panel */}
        <aside className="flex h-fit flex-col gap-4 rounded-2xl bg-tile-gray p-5">
          <div>
            <div className="text-micro leading-micro uppercase text-steel">Status</div>
            <select
              className={inputClass + ' mt-1'}
              value={task.status}
              onChange={(e) => void patchTask({ status: e.target.value as TaskStatus })}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <div className="text-micro leading-micro uppercase text-steel">Priority</div>
            <select
              className={inputClass + ' mt-1'}
              value={task.priority}
              onChange={(e) => void patchTask({ priority: e.target.value as TaskPriority })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <div className="text-micro leading-micro uppercase text-steel">Assignee</div>
            <div className="mt-1 text-body leading-body">
              {task.assignee ? `@${task.assignee.username}` : 'Unassigned'}
            </div>
          </div>
          <div>
            <div className="text-micro leading-micro uppercase text-steel">Due date</div>
            <div className="mt-1 text-body leading-body">
              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
            </div>
          </div>
          <div>
            <div className="text-micro leading-micro uppercase text-steel">Created</div>
            <div className="mt-1 text-body leading-body">
              {new Date(task.created_at).toLocaleString()}
            </div>
          </div>
          <Button variant="outline" onClick={deleteTask} className="mt-2 border-black/20">
            Delete task
          </Button>
        </aside>
      </div>
    </div>
  )
}
