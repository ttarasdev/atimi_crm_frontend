export enum PrivateBucket {
    MANAGER_AVATARS = 'manager_avatars',
    MANAGER_FILES = 'manager_files',
    CLIENT_DOCUMENTS = 'client_documents',
    PROPERTY_FILES = 'property_files',
    TASK_ATTACHMENTS = 'task_attachments',
    MANAGER_DOCUMENTS = 'manager_documents',
    USER_DOCUMENTS = 'user_documents',
    DOCUMENT_TEMPLATES = 'document_templates',
}

export type AssetVisibility = 'author' | 'team'

export interface PrivateAsset {
    id: number
    bucket: PrivateBucket
    relPath: string
    originalName: string
    mimeType: string
    sizeBytes: number
    visibility: AssetVisibility
    createdByManagerId: number
    createdAt: string
    updatedAt: string
}

export interface PrivateAssetsQuery {
    page?: number
    limit?: number
    offset?: number
    bucket?: PrivateBucket
    search?: string
    visibility?: AssetVisibility
    ownOnly?: boolean
    documentsOnly?: boolean
}

export interface CreatePrivateAssetDto {
    bucket: PrivateBucket
    originalName: string
    visibility?: AssetVisibility
}

export interface PrivateAssetsListResponse {
    rows: PrivateAsset[]
    total: number
    page: number
    limit: number
    offset: number
}
