export interface DocumentRequest {
    id: number
    clientId: number
    title: string
    instructions?: string | null
    status: 'pending' | 'submitted' | 'revoked' | 'expired'
    expiresAt: string
    submittedAt?: string | null
    clientDocumentId?: number | null
    createdAt: string
}

export interface DocumentRequestLink extends DocumentRequest {
    uploadUrl: string
}

export interface CreateDocumentRequestDto {
    title: string
    instructions?: string
    expiresInDays: number
}

export interface DocumentRequestPage<T> {
    rows: T[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface DocumentUploadNotification {
    id: number
    clientId: number
    requestId: number
    title: string
    clientName: string
    clientDocumentId?: number | null
    readAt?: string | null
    createdAt: string
}

export interface DocumentUploadNotificationsPage
    extends DocumentRequestPage<DocumentUploadNotification> {
    unreadCount: number
}

export interface PublicDocumentRequest {
    title: string
    instructions?: string | null
    expiresAt: string
    status: 'pending' | 'submitted'
}
