import type { PrivateAsset } from '@/api/private-assets/private-assets.types'

export interface StageTemplateDocument {
    id: number
    stageTemplateId: number
    privateAssetId: number
    title: string
    createdAt: string
    updatedAt: string
    privateAsset?: PrivateAsset
}

export interface StageTemplateDocumentsQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
}

export interface StageTemplateDocumentsListResponse {
    rows: StageTemplateDocument[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateStageTemplateDocumentDto {
    title: string
    privateAssetId: number
}

export interface UpdateStageTemplateDocumentDto {
    title?: string
}
