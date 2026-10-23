export type ClientProcessStageStatus = 'planned' | 'active' | 'done'

export interface ClientProcessStage {
    id: number
    clientProcessId: number
    stageTemplateId: number | null
    title: string
    iconId: number | null
    color: string
    assignedManagerId: number | null
    sortKey: number
    status: ClientProcessStageStatus
    plannedAt: string | null
    completedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface ClientProcessStagesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: ClientProcessStageStatus
}

export interface ClientProcessStagesListResponse {
    rows: ClientProcessStage[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateClientProcessStageDto {
    stageTemplateId?: number
    title?: string
    iconId?: number | null
    color?: string
    assignedManagerId?: number | null
    plannedAt?: string | null
}

export type UpdateClientProcessStageDto = Partial<
    Omit<CreateClientProcessStageDto, 'stageTemplateId'>
>
