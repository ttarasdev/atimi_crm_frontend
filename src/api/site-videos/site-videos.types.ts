export interface SiteVideoTranslation {
    title: string
    description: string
}

export interface SiteVideo {
    id: number
    translations: Record<'pl' | 'en' | 'ua' | 'de', SiteVideoTranslation>
    url: string
    isActive: boolean
    sortKey: number
    createdAt: string
    updatedAt: string
}

export interface CreateSiteVideoDto {
    translations: SiteVideo['translations']
    url: string
    isActive?: boolean
}

export type UpdateSiteVideoDto = Partial<CreateSiteVideoDto>

export interface SiteVideosQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    isActive?: boolean
}

export interface SiteVideosListResponse {
    rows: SiteVideo[]
    total: number
    page: number
    limit: number
    offset: number
}
