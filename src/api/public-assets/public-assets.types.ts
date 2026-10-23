export enum PublicBucket {
    ICONS = 'icons',
    PROPERTY_IMAGES = 'property_images',
    SYSTEM_FILES = 'system_files',
}

export interface PublicAsset {
    id: number
    bucket: PublicBucket
    relPath: string
    originalName: string
    mimeType: string
    sizeBytes: number
    isPopular: boolean
    createdByManagerId: number
    createdAt: string
    updatedAt: string
}

export interface PublicAssetsQuery {
    bucket?: PublicBucket
    page?: number
    limit?: number
    offset?: number
    search?: string
    isPopular?: boolean
}

export interface CreatePublicAssetDto {
    bucket: PublicBucket
    originalName: string
}

export interface PublicAssetsListResponse {
    rows: PublicAsset[]
    total: number
    page: number
    limit: number
    offset: number
}

export interface TogglePublicAssetPopularResponse {
    success: true
    isPopular: boolean
}
