import type { TaskType } from '@/api/task-types/task-types.types'

export type CalendarEntryKind = 'event' | 'reminder' | 'deadline'

export type RepeatFrequency = 'daily' | 'weekly' | 'monthly'

export type SeriesScope = 'one' | 'following' | 'all'

export type DeleteScope = 'local' | 'everywhere'

export interface Calendar {
    id: number
    managerId: number
    timeZone: string
    createdAt: string
    updatedAt: string
}

export interface CalendarEvent {
    clientId?: number
    clientCardId?: number
    id: number
    calendarId: number | null
    clientStageId: number | null
    title: string
    description: string | null
    taskTypeId: number
    taskType?: TaskType
    date: string | null
    weekStart?: string | null
    startAt: string | null
    endAt: string | null
    location: string | null
    isDone: boolean
    doneAt: string | null
    sortKey: number
    assignedManagerId: number | null
    dueAt: string | null
    seriesKey: string | null
    repeat: RepeatFrequency | null
    repeatUntil: string | null
    timeZone: string | null
    createdAt: string
    updatedAt: string
}

export interface CalendarReminder {
    id: number
    calendarId: number | null
    clientStageId: number | null
    clientTaskId: number | null
    managerId: number
    title: string
    remindAt: string
    sentAt: string | null
    createdAt: string
    updatedAt: string
}

export interface CalendarDeadline {
    id: number
    calendarId: number | null
    clientStageId: number | null
    title: string
    description: string | null
    dueAt: string
    isDone: boolean
    reminderMinutes: number[]
    createdAt: string
    updatedAt: string
}

export type CalendarEntry =
    | (CalendarEvent & { kind: 'event'; at: number })
    | (CalendarReminder & { kind: 'reminder'; at: number })
    | (CalendarDeadline & { kind: 'deadline'; at: number })

export interface CalendarEntriesQuery {
    from: string
    to: string
    kind?: CalendarEntryKind
    search?: string
    overdue?: boolean
    page?: number
    limit?: number
    offset?: number
}

export interface CalendarEntriesListResponse {
    rows: CalendarEntry[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CalendarMutationQuery {
    seriesScope?: SeriesScope
    deleteScope?: DeleteScope
}

export interface CreateCalendarEventDto {
    taskTypeId?: number
    title: string
    description?: string | null
    clientStageId?: number | null
    date?: string | null
    weekStart?: string | null
    startAt?: string | null
    endAt?: string | null
    location?: string | null
    isDone?: boolean
    repeat?: RepeatFrequency | null
    repeatUntil?: string | null
}

export type UpdateCalendarEventDto = Partial<CreateCalendarEventDto>

export interface CalendarEventWarning {
    code: 'TIME_OVERLAP'
    event: Pick<CalendarEvent, 'id' | 'title' | 'startAt' | 'endAt'>
}

export interface CalendarEventMutationResponse {
    rows: CalendarEvent[]
    warnings: CalendarEventWarning[]
}

export interface CreateCalendarReminderDto {
    title: string
    remindAt: string
    clientStageId?: number | null
    clientTaskId?: number | null
}

export type UpdateCalendarReminderDto = Partial<CreateCalendarReminderDto>

export interface CreateCalendarDeadlineDto {
    title: string
    description?: string | null
    clientStageId?: number | null
    dueAt: string
    isDone?: boolean
    reminderMinutes: number[]
}

export type UpdateCalendarDeadlineDto = Partial<CreateCalendarDeadlineDto>

export interface UpdateCalendarDto {
    timeZone: string
}

export interface DeleteCalendarEntryResponse {
    success: true
}
