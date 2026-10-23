import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { taskTypesApi } from '@/api/task-types/task-types.api'
import type { TaskTypesQuery } from '@/api/task-types/task-types.types'

export const taskTypesQueryKeys = {
    all: ['task-types'] as const,
    lists: ['task-types', 'list'] as const,

    list: (query: TaskTypesQuery = {}) =>
        ['task-types', 'list', query] as const,

    infinite: (query: Omit<TaskTypesQuery, 'page' | 'limit' | 'offset'>) =>
        ['task-types', 'list', 'infinite', query] as const,
}

export function taskTypesQueryOptions(query: TaskTypesQuery = {}) {
    return queryOptions({
        queryKey: taskTypesQueryKeys.list(query),
        queryFn: ({ signal }) => taskTypesApi.list(query, { signal }),
    })
}

export function infiniteTaskTypesQueryOptions(
    query: Omit<TaskTypesQuery, 'page' | 'limit' | 'offset'>,
) {
    return infiniteQueryOptions({
        queryKey: taskTypesQueryKeys.infinite(query),
        initialPageParam: 1,

        queryFn: ({ signal, pageParam }) =>
            taskTypesApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
