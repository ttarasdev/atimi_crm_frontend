export interface SiteReviewTranslation {
    authorName: string
    text: string
}

export interface SiteReview {
    id: number
    translations: Record<'pl' | 'en' | 'ua' | 'de', SiteReviewTranslation>
    rating: number
    source: string
    imageId: number | null
    imagePath: string | null
    isActive: boolean
    sortKey: number
    createdAt: string
    updatedAt: string
}

export interface CreateSiteReviewDto {
    translations: SiteReview['translations']
    rating?: number
    source?: string
    imageId?: number | null
    imagePath?: string | null
    isActive?: boolean
}

export type UpdateSiteReviewDto = Partial<CreateSiteReviewDto>

export interface SiteReviewsQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    isActive?: boolean
}

export interface SiteReviewsListResponse {
    rows: SiteReview[]
    total: number
    page: number
    limit: number
    offset: number
}
