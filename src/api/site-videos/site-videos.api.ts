import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    SiteVideo,
    SiteVideosListResponse,
    SiteVideosQuery,
    CreateSiteVideoDto,
    UpdateSiteVideoDto,
} from './site-videos.types'

const BASE = '/site-videos'

function path(id: number) {
    if (!Number.isInteger(id) || id < 1 || id > 2147483647)
        throw new RangeError('A positive ID is required')

    return `${BASE}/${id}`
}

export const siteVideosApi = {
    list: (query: SiteVideosQuery = {}, options?: RequestOptions) =>
        http.get<SiteVideosListResponse>(BASE, {
            ...options,
            query: { ...query },
        }),
    create: (dto: CreateSiteVideoDto, options?: RequestOptions) =>
        http.post<SiteVideo>(BASE, dto, options),
    update: (id: number, dto: UpdateSiteVideoDto, options?: RequestOptions) =>
        http.patch<SiteVideo>(path(id), dto, options),
    reorder: (id: number, direction: 'up' | 'down', options?: RequestOptions) =>
        http.patch<SiteVideo[]>(`${path(id)}/order`, { direction }, options),
}
