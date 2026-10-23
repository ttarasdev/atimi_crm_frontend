export interface NoteMention {
    managerId: number
    label: string
}

export interface MentionRecipient {
    id: number
    name: string
    surname: string | null
}

export interface NoteMentionNotification {
    id: number
    clientId: number
    kind: 'client_note' | 'stage_note'
    noteId: number
    title: string
    clientName: string
    actorName: string
    processId?: number
    stageId?: number
    readAt: string | null
    createdAt: string
}

export interface MentionPage<T> {
    rows: T[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface MentionNotificationPage
    extends MentionPage<NoteMentionNotification> {
    unreadCount: number
}
