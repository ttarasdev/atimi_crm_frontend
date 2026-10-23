'use client'

import {
    useMutation,
    useQuery,
    useQueryClient,
    skipToken,
} from '@tanstack/react-query'
import { tasksApi } from '@/api/tasks/tasks.api'
import type { SaveTaskDto, TasksQuery } from '@/api/tasks/tasks.types'
import { calendarQueryKeys } from '@/shared/query/calendar-query'
import { crmOverviewQueryKeys } from '@/shared/query/crm-overview-query'

export function useTasks(query: TasksQuery = {}) {
    return useQuery({
        queryKey: ['tasks', 'list', query],
        refetchInterval: 60_000,
        refetchIntervalInBackground: false,
        queryFn: ({ signal }) => tasksApi.list(query, { signal }),
    })
}

export function useTask(id: number | null) {
    return useQuery({
        queryKey: ['tasks', 'detail', id],
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => tasksApi.get(id, { signal }),
    })
}

export function useSaveTask() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id?: number
            dto: SaveTaskDto
            signal?: AbortSignal
        }) =>
            id
                ? tasksApi.update(id, dto, { signal })
                : tasksApi.create(dto, { signal }),
        onSuccess: async (task) => {
            queryClient.setQueryData(['tasks', 'detail', task.id], task)

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                queryClient.invalidateQueries({
                    queryKey: calendarQueryKeys.all,
                }),
                queryClient.invalidateQueries({
                    queryKey: ['client-stage-records'],
                }),
                queryClient.invalidateQueries({
                    queryKey: crmOverviewQueryKeys.all,
                }),
            ])
        },
    })
}

export function useDeleteTask() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            tasksApi.remove(id, { signal }),
        onSuccess: async (_, { id }) => {
            queryClient.removeQueries({ queryKey: ['tasks', 'detail', id] })

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tasks'] }),
                queryClient.invalidateQueries({
                    queryKey: calendarQueryKeys.all,
                }),
                queryClient.invalidateQueries({
                    queryKey: ['client-stage-records'],
                }),
                queryClient.invalidateQueries({
                    queryKey: crmOverviewQueryKeys.all,
                }),
            ])
        },
    })
}
