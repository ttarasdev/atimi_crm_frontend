'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { taskTypesApi } from '@/api/task-types/task-types.api'
import type {
    CreateTaskTypeDto,
    TaskTypesQuery,
    UpdateTaskTypeDto,
} from '@/api/task-types/task-types.types'
import {
    infiniteTaskTypesQueryOptions,
    taskTypesQueryKeys,
    taskTypesQueryOptions,
} from '@/shared/query/task-types-query'
import { stageTemplateTasksQueryKeys } from '@/shared/query/stage-templates-query'

export function useTaskTypes(query: TaskTypesQuery = {}) {
    return useQuery(taskTypesQueryOptions(query))
}

export function useInfiniteTaskTypes(
    query: Omit<TaskTypesQuery, 'page' | 'limit' | 'offset'>,
) {
    return useInfiniteQuery(infiniteTaskTypesQueryOptions(query))
}

export function useCreateTaskType() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateTaskTypeDto
            signal?: AbortSignal
        }) => taskTypesApi.create(dto, { signal }),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: taskTypesQueryKeys.lists,
            })
        },
    })
}

export function useUpdateTaskType() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateTaskTypeDto
            signal?: AbortSignal
        }) => taskTypesApi.update(id, dto, { signal }),

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: taskTypesQueryKeys.lists,
                }),
                queryClient.invalidateQueries({
                    queryKey: stageTemplateTasksQueryKeys.lists,
                }),
            ])
        },
    })
}
