import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { publicAssetsApi } from '@/api/public-assets/public-assets.api'
import type { PublicAssetsQuery } from '@/api/public-assets/public-assets.types'

export const publicAssetsQueryKeys = {
    all: ['public-assets'] as const,
    lists: ['public-assets', 'list'] as const,

    list: (query: PublicAssetsQuery = {}) =>
        ['public-assets', 'list', query] as const,

    infinite: (query: Omit<PublicAssetsQuery, 'page' | 'limit' | 'offset'>) =>
        ['public-assets', 'list', 'infinite', query] as const,

    details: ['public-assets', 'detail'] as const,

    detail: (id: number | null) => ['public-assets', 'detail', id] as const,
}

export function publicAssetsQueryOptions(query: PublicAssetsQuery = {}) {
    return queryOptions({
        queryKey: publicAssetsQueryKeys.list(query),
        queryFn: ({ signal }) => publicAssetsApi.list(query, { signal }),
    })
}

export function publicAssetQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: publicAssetsQueryKeys.detail(id),

        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => publicAssetsApi.getById(id, { signal }),
    })
}

export function infinitePublicAssetsQueryOptions(
    query: Omit<PublicAssetsQuery, 'page' | 'limit' | 'offset'>,
) {
    return infiniteQueryOptions({
        queryKey: publicAssetsQueryKeys.infinite(query),
        initialPageParam: 1,

        queryFn: ({ signal, pageParam }) =>
            publicAssetsApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
