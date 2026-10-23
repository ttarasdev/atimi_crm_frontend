import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { leadsApi } from '@/api/leads/leads.api'
import type { LeadsQuery } from '@/api/leads/leads.types'

export const leadsQueryKeys = {
    all: ['leads'] as const,
    lists: ['leads', 'list'] as const,
    list: (query: LeadsQuery) => ['leads', 'list', query] as const,
    detail: (id: number | null) => ['leads', 'detail', id] as const,
}

export function infiniteLeadsQueryOptions(
    query: Omit<LeadsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: leadsQueryKeys.list(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            leadsApi.list({ ...query, page: pageParam, limit: 30 }, { signal }),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function leadQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: leadsQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => leadsApi.getById(id, { signal }),
    })
}
