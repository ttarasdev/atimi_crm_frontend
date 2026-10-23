import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { SearchPage, SearchResponse, SearchType } from './search.types'

export const searchApi = {
    search: (q: string, options?: RequestOptions) =>
        http.get<SearchResponse>('/search', { ...options, query: { q } }),
    page: (
        type: SearchType,
        q: string,
        page: number,
        options?: RequestOptions,
    ) =>
        http.get<SearchPage>(`/search/${type}`, {
            ...options,
            query: { q, page, limit: 20 },
        }),
}
