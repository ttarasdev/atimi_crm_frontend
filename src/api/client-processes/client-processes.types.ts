export interface ClientCaseData {
    serviceType?: string
    office?: string
    referenceNumber?: string
    submittedAt?: string
    fingerprintsAt?: string
    decisionAt?: string
    collectionAt?: string
}

export type ClientProcessStatus = 'active' | 'completed' | 'archived'

export interface ClientProcess {
    id: number
    clientId: number
    managerId: number
    title: string
    caseData?: ClientCaseData
    status: ClientProcessStatus
    completedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface ClientProcessesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: ClientProcessStatus
}

export interface ClientProcessesListResponse {
    rows: ClientProcess[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateClientProcessDto {
    caseData?: ClientCaseData
    processTemplateId?: number
    title: string
}

export type UpdateClientProcessDto = Partial<CreateClientProcessDto>
