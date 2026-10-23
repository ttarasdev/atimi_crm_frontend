export interface ProcessTemplate {
    id: number
    title: string
    description?: string
    stageTemplateIds: number[]
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface ProcessTemplatesQuery {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
}

export interface ProcessTemplatesList {
    rows: ProcessTemplate[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface SaveProcessTemplateDto {
    title: string
    description?: string
    stageTemplateIds: number[]
    isActive?: boolean
}
