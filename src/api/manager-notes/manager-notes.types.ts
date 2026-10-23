import type { JSONContent } from '@tiptap/react'

export interface ManagerNote {
    id: number
    managerId: number
    title: string
    content: JSONContent
    plainText: string
    color: string
    isPinned: boolean
    createdAt: string
    updatedAt: string
}

export interface ManagerNotesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    isPinned?: boolean
    managerId?: number
}

export interface CreateManagerNoteDto {
    title: string
    content: JSONContent
    color?: string
    isPinned?: boolean
}

export type UpdateManagerNoteDto = Partial<CreateManagerNoteDto>

export interface ManagerNotesListResponse {
    rows: ManagerNote[]
    total: number
    page: number
    limit: number
    offset: number
}
