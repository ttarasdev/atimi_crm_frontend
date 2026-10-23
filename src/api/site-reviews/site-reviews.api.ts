import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    SiteReview,
    SiteReviewsListResponse,
    SiteReviewsQuery,
    CreateSiteReviewDto,
    UpdateSiteReviewDto,
} from './site-reviews.types'

const BASE = '/site-reviews'

function path(id: number) {
    if (!Number.isInteger(id) || id < 1 || id > 2147483647)
        throw new RangeError('A positive ID is required')

    return `${BASE}/${id}`
}

export const siteReviewsApi = {
    list: (query: SiteReviewsQuery = {}, options?: RequestOptions) =>
        http.get<SiteReviewsListResponse>(BASE, {
            ...options,
            query: { ...query },
        }),
    create: (dto: CreateSiteReviewDto, options?: RequestOptions) =>
        http.post<SiteReview>(BASE, dto, options),
    update: (id: number, dto: UpdateSiteReviewDto, options?: RequestOptions) =>
        http.patch<SiteReview>(path(id), dto, options),
    reorder: (id: number, direction: 'up' | 'down', options?: RequestOptions) =>
        http.patch<SiteReview[]>(`${path(id)}/order`, { direction }, options),
}
