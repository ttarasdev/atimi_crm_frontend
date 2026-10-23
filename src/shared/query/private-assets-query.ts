import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { privateAssetsApi } from '@/api/private-assets/private-assets.api'
import type { PrivateAssetsQuery } from '@/api/private-assets/private-assets.types'

export const privateAssetsQueryKeys = {
    all: ['private-assets'] as const,
    lists: ['private-assets', 'list'] as const,
    list: (query: PrivateAssetsQuery) =>
        ['private-assets', 'list', query] as const,
    infinite: (query: PrivateAssetsQuery) =>
        ['private-assets', 'list', 'infinite', query] as const,
    detail: (id: number | null) => ['private-assets', 'detail', id] as const,
}

export function privateAssetsQueryOptions(query: PrivateAssetsQuery = {}) {
    return queryOptions({
        queryKey: privateAssetsQueryKeys.list(query),
        queryFn: ({ signal }) => privateAssetsApi.list(query, { signal }),
    })
}

export function infinitePrivateAssetsQueryOptions(
    query: Omit<PrivateAssetsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: privateAssetsQueryKeys.infinite(query),
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            privateAssetsApi.list(
                { ...query, page: pageParam, limit: 50 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function privateAssetQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: privateAssetsQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => privateAssetsApi.get(id, { signal }),
    })
}
