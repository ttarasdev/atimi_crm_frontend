import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { managersApi } from '@/api/managers/managers.api'
import type { ManagersQuery } from '@/api/managers/managers.types'

export const managersQueryKeys = {
    all: ['managers'] as const,
    lists: ['managers', 'list'] as const,
    list: (query: ManagersQuery) => ['managers', 'list', query] as const,
    detail: (id: number | null) => ['managers', 'detail', id] as const,
    roles: ['roles', 'list'] as const,
}

export function managersQueryOptions(query: ManagersQuery = {}) {
    return queryOptions({
        queryKey: managersQueryKeys.list(query),
        queryFn: ({ signal }) => managersApi.list(query, { signal }),
    })
}

export function managerQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: managersQueryKeys.detail(id),
        queryFn: ({ signal }) => {
            if (id === null) throw new Error('Manager ID is required')

            return managersApi.getById(id, { signal })
        },
        enabled: id !== null,
    })
}

export function infiniteManagersQueryOptions(
    query: Omit<ManagersQuery, 'page' | 'limit' | 'offset'>,
) {
    return infiniteQueryOptions({
        queryKey: [...managersQueryKeys.lists, 'infinite', query],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            managersApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
