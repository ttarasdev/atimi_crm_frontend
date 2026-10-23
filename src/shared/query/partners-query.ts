import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { partnersApi } from '@/api/partners/partners.api'
import type { PartnersQuery } from '@/api/partners/partners.types'

export const partnersQueryKeys = {
    lists: ['partners', 'list'] as const,
    infinite: (query: PartnersQuery) => ['partners', 'list', query] as const,
    detail: (id: number | null) => ['partners', 'detail', id] as const,
}

export function partnerQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: partnersQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => partnersApi.get(id, { signal }),
    })
}

export function infinitePartnersQueryOptions(
    query: Omit<PartnersQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: partnersQueryKeys.infinite(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            partnersApi.list(
                { ...query, page: pageParam, limit: 30 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
