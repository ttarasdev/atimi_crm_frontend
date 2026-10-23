import type { NoteMention } from '@/api/note-mentions/note-mentions.types'
import type {
    CalendarEvent,
    CalendarReminder,
    CalendarDeadline,
    CreateCalendarDeadlineDto,
} from '@/api/calendars/calendars.types'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'

export interface ClientStageScope {
    clientId: number
    processId: number
    stageId: number
}

export interface ClientStageNote {
    mentions?: NoteMention[] | null
    id: number
    clientStageId: number
    title: string | null
    body: string
    createdAt: string
}

export interface ClientStageDocument {
    id: number
    clientStageId: number
    privateAssetId: number
    asset?: PrivateAsset
    title: string
    createdAt: string
    updatedAt: string
}

export interface CreateClientStageTaskDto {
    title: string
    taskTypeId?: number
    description?: string | null
    calendarId?: number | null
    date?: string | null
    weekStart?: string | null
    startAt?: string | null
    endAt?: string | null
    location?: string | null
    isDone?: boolean
    assignedManagerId?: number | null
    dueAt?: string | null
}

export interface CreateClientStageReminderDto {
    title: string
    remindAt: string
    clientTaskId?: number | null
}

export interface CreateClientStageNoteDto {
    mentionedManagerIds?: number[]
    title?: string | null
    body: string
}

export interface CreateClientStageDocumentDto {
    title: string
    privateAssetId: number
}

export interface ClientStageRecords {
    tasks: CalendarEvent
    reminders: CalendarReminder
    deadlines: CalendarDeadline
    notes: ClientStageNote
    documents: ClientStageDocument
}

export interface ClientStageRecordDtos {
    tasks: CreateClientStageTaskDto
    reminders: CreateClientStageReminderDto
    deadlines: Omit<CreateCalendarDeadlineDto, 'clientStageId'>
    notes: CreateClientStageNoteDto
    documents: CreateClientStageDocumentDto
}

export type SaveClientStageRecordVariables = {
    [K in keyof ClientStageRecordDtos]: ClientStageScope & {
        kind: K
        id?: number
        dto: ClientStageRecordDtos[K]
        signal?: AbortSignal
    }
}[keyof ClientStageRecordDtos]
