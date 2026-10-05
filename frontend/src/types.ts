export interface User {
  id: number
  username: string
  email: string
  created_at: string
  updated_at: string
}

export interface Org {
  id: number
  name: string
  description: string | null
  owner_id: number
  invite_code: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  image_urls: string[]
  assignee_id: number | null
  assignee: User | null
  org_id: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  content: string
  user_id: number
  author: User | null
  task_id: number
  created_at: string
  updated_at: string
}

export interface TaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  due_date?: string | null
  assignee_id?: number | null
  image_urls?: string[] | null
}
