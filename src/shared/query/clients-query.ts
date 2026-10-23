import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { clientsApi } from '@/api/clients/clients.api'
import type { ClientsQuery } from '@/api/clients/clients.types'

export const clientsQueryKeys = {
    all: ['clients'] as const,
    lists: ['clients', 'list'] as const,
    list: (query: ClientsQuery) =>
        ['clients', 'list', 'workspace', query] as const,
    detail: (id: number | null) => ['clients', 'detail', id] as const,
    records: (clientId: number, kind?: string) =>
        ['client-records', clientId, ...(kind ? [kind] : [])] as const,
    sources: ['client-sources', 'list'] as const,
    calendar: (managerId: number | null) =>
        ['calendars', 'manager', managerId] as const,
}

export function infiniteClientsQueryOptions(
    query: Omit<ClientsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: clientsQueryKeys.list(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientsApi.list(
                { ...query, page: pageParam, limit: 30 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function clientQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: clientsQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => clientsApi.getById(id, { signal }),
    })
}
