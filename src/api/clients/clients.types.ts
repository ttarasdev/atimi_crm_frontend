import type { ClientProcessStage } from '@/api/client-process-stages/client-process-stages.types'

export type ClientStatus = 'new' | 'active' | 'paused' | 'completed' | 'lost'

export type ClientPriority = 'normal' | 'high' | 'vip'

export type ClientPaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface Client {
    id: number
    isPrivate: boolean
    name: string
    surname: string | null
    managerId: number
    sourceId: number | null
    activeStageId?: number | null
    activeStage?: Pick<
        ClientProcessStage,
        | 'id'
        | 'clientProcessId'
        | 'stageTemplateId'
        | 'title'
        | 'iconId'
        | 'color'
    > | null
    language: string | null
    address: string | null
    preferredContactTime: string | null
    status: ClientStatus
    priority: ClientPriority
    paymentStatus: ClientPaymentStatus
    paymentAmount?: string | null
    paymentCurrency?: string
    paymentComment?: string | null
    archivedAt: string | null
    createdAt: string
    updatedAt: string
    manager?: {
        id: number
        name: string
        surname: string
        email: string
    }
    source?: {
        id: number
        name: string
        isActive: boolean
    } | null
}

export interface ClientsQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: ClientStatus
    paymentStatus?: ClientPaymentStatus
    priority?: ClientPriority
    managerId?: number
    sourceId?: number
    stageTemplateId?: number
    archived?: boolean
}

export interface ClientsListResponse {
    rows: Client[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateClientDto {
    email?: string
    phone?: string
    isPrivate?: boolean
    name: string
    surname?: string | null
    managerId?: number
    sourceId?: number | null
    language?: string | null
    address?: string | null
    preferredContactTime?: string | null
    status?: ClientStatus
    priority?: ClientPriority
    paymentStatus?: ClientPaymentStatus
    paymentAmount?: string | null
    paymentCurrency?: string
    paymentComment?: string | null
}

export type UpdateClientDto = Partial<Omit<CreateClientDto, 'email' | 'phone'>>

export interface DuplicateClientsQuery {
    page?: number
    limit?: number
    offset?: number
    email?: string
    phone?: string
    pesel?: string
    passportNumber?: string
    excludeClientId?: number
}

export interface DuplicateClientsResponse {
    rows: {
        id: number
        name: string
        surname: string | null
        managerId: number
        archivedAt: string | null
        canEdit: boolean
        matchedFields: ('email' | 'phone' | 'pesel' | 'passportNumber')[]
    }[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface ClientActivity {
    id: number
    clientId: number
    managerId: number
    action: string
    fields: string[]
    createdAt: string
    manager?: { id: number; name: string; surname: string }
}

export interface ClientActivityList {
    rows: ClientActivity[]
    total: number
    page: number
    limit: number
    offset: number
}
