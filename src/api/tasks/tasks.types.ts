export type TaskStatus = 'todo' | 'in_progress' | 'done'

export type TaskPriority = 'normal' | 'high' | 'urgent'

export type TaskView =
    | 'today'
    | 'overdue'
    | 'upcoming'
    | 'no_due'
    | 'completed'
    | 'all'

export type TaskScope = 'mine' | 'team'

export interface Task {
    id: number
    title: string
    description: string | null
    status: TaskStatus
    priority: TaskPriority
    isDone: boolean
    assignedManagerId: number
    assignedManagerName: string
    clientId: number | null
    clientName: string | null
    processId: number | null
    processTitle: string | null
    clientStageId: number | null
    clientStageTitle: string | null
    calendarId: number | null
    dueDate: string | null
    dueTime: string | null
    dueAt: string | null
    date: string | null
    weekStart: string | null
    startAt: string | null
    endAt: string | null
    scheduleKind: 'none' | 'date' | 'deadline' | 'event' | 'week'
    isRecurring: boolean
    canEdit: boolean
    canDelete: boolean
    createdAt: string
    updatedAt: string
}

export interface TasksQuery {
    page?: number
    limit?: number
    offset?: number
    view?: TaskView
    scope?: TaskScope
    managerId?: number
    search?: string
    status?: TaskStatus
    priority?: TaskPriority
}

export interface TasksPage {
    rows: Task[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface SaveTaskDto {
    title?: string
    description?: string | null
    assignedManagerId?: number
    clientId?: number | null
    clientStageId?: number | null
    dueDate?: string | null
    dueTime?: string | null
    priority?: TaskPriority
    status?: TaskStatus
}
