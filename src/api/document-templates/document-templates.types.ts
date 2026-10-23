import type { PrivateAsset } from '@/api/private-assets/private-assets.types'

export interface DocumentTemplate {
    id: number
    name: string
    description: string | null
    privateAssetId: number
    typeId?: number | null
    type?: DocumentType
    fields: string[]
    isActive: boolean
    asset?: PrivateAsset
    createdAt: string
    updatedAt: string
}

export interface DocumentTemplateVariable {
    key: string
    label: string
    source: 'system'
    group: string
}

export interface DocumentAnalyzedField {
    key: string
    label: string
    source: 'system' | 'custom' | 'unknown'
    group: string
    suggestions?: Omit<DocumentAnalyzedField, 'suggestions'>[]
}

export interface DocumentTemplateAnalysis {
    keys: string[]
    fields: DocumentAnalyzedField[]
    unknownKeys: string[]
    canCreate: boolean
}

export interface DocumentTemplatesQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    isActive?: boolean
    typeId?: number
}

export interface DocumentTemplatesListResponse {
    rows: DocumentTemplate[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateDocumentTemplateDto {
    name: string
    description?: string
    privateAssetId: number
    typeId?: number
}

export interface UpdateDocumentTemplateDto
    extends Partial<CreateDocumentTemplateDto> {
    isActive?: boolean
}

export interface GenerateDocumentDto {
    originalName: string
    clientId?: number
    values: Record<string, string>
    systemValues?: Record<string, string>
}

export interface DocumentType {
    id: number
    name: string
    description: string | null
    isActive: boolean
}

export interface DocumentField {
    id: number
    key: string
    label: string
    defaultValue: string | null
}

export interface DocumentCatalogResponse<T> {
    rows: T[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface CreateDocumentTypeDto {
    name: string
    description?: string
}

export interface UpdateDocumentTypeDto extends Partial<CreateDocumentTypeDto> {
    isActive?: boolean
}

export interface CreateDocumentFieldDto {
    key: string
    label: string
    defaultValue?: string
}

export interface UpdateDocumentFieldDto {
    label?: string
    defaultValue?: string
}

export interface DocumentPreview {
    templateId: number
    requiresClient: boolean
    canGenerate: boolean
    missingKeys: string[]
    fields: {
        key: string
        label: string
        value: string
        source: 'system' | 'custom'
        group: string
        editable: boolean
        profileMissing: boolean
        required: boolean
        missing: boolean
    }[]
}
