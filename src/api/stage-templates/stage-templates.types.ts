import type { PublicAsset } from '@/api/public-assets/public-assets.types'

export interface StageTemplate {
    id: number
    title: string
    iconId: number | null
    description: string | null
    color: string
    isActive: boolean
    createdAt: string
    updatedAt: string
    icon?: PublicAsset
}

export interface StageTemplatesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    isActive?: boolean
}

export interface StageTemplatesListResponse {
    rows: StageTemplate[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateStageTemplateDto {
    title: string
    iconId?: number | null
    description?: string | null
    color?: string
    isActive?: boolean
}

export type UpdateStageTemplateDto = Partial<CreateStageTemplateDto>
