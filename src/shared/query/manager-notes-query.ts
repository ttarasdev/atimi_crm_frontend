import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { managerNotesApi } from '@/api/manager-notes/manager-notes.api'
import type { ManagerNotesQuery } from '@/api/manager-notes/manager-notes.types'

export const managerNotesQueryKeys = {
    all: ['manager-notes'] as const,
    lists: ['manager-notes', 'list'] as const,
    list: (query: ManagerNotesQuery) =>
        ['manager-notes', 'list', query] as const,
    infinite: (query: ManagerNotesQuery) =>
        ['manager-notes', 'list', 'infinite', query] as const,
    detail: (id: number | null) => ['manager-notes', 'detail', id] as const,
}

export function managerNotesQueryOptions(query: ManagerNotesQuery = {}) {
    return queryOptions({
        queryKey: managerNotesQueryKeys.list(query),
        queryFn: ({ signal }) => managerNotesApi.list(query, { signal }),
    })
}

export function infiniteManagerNotesQueryOptions(
    query: Omit<ManagerNotesQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: managerNotesQueryKeys.infinite(query),
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            managerNotesApi.list(
                { ...query, page: pageParam, limit: 30 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function managerNoteQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: managerNotesQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => managerNotesApi.get(id, { signal }),
    })
}
