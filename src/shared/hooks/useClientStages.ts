'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { clientProcessStagesApi } from '@/api/client-process-stages/client-process-stages.api'
import type {
    ClientProcessStageStatus,
    CreateClientProcessStageDto,
    UpdateClientProcessStageDto,
} from '@/api/client-process-stages/client-process-stages.types'
import { clientStageRecordsApi } from '@/api/client-stage-records/client-stage-records.api'
import type {
    ClientStageScope,
    ClientStageRecords,
    SaveClientStageRecordVariables,
} from '@/api/client-stage-records/client-stage-records.types'
import type { DeleteScope } from '@/api/calendars/calendars.types'
import { clientProcessesQueryKeys } from '@/shared/query/client-processes-query'
import { calendarQueryKeys } from '@/shared/query/calendar-query'
import { clientsQueryKeys } from '@/shared/query/clients-query'

export function useClientStages(clientId: number, processId: number) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.stages(clientId, processId),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientProcessStagesApi.list(
                clientId,
                processId,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useSaveClientStage() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            processId,
            id,
            dto,
            signal,
        }: {
            clientId: number
            processId: number
            id?: number
            dto: CreateClientProcessStageDto | UpdateClientProcessStageDto
            signal?: AbortSignal
        }) =>
            id
                ? clientProcessStagesApi.update(clientId, processId, id, dto, {
                      signal,
                  })
                : clientProcessStagesApi.create(clientId, processId, dto, {
                      signal,
                  }),
        onSuccess: async (_, v) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.stages(
                        v.clientId,
                        v.processId,
                    ),
                }),
                qc.invalidateQueries({ queryKey: clientsQueryKeys.lists }),
                qc.invalidateQueries({
                    queryKey: clientsQueryKeys.detail(v.clientId),
                }),
            ])
        },
    })
}

export function useClientStageAction() {
    const qc = useQueryClient()

    type Variables = {
        clientId: number
        processId: number
        id: number
        signal?: AbortSignal
    } & (
        | { action: 'status'; status: ClientProcessStageStatus }
        | { action: 'order'; direction: 'up' | 'down' }
        | { action: 'delete' }
    )

    return useMutation({
        retry: false,
        mutationFn: async (v: Variables) => {
            if (v.action === 'status')
                return clientProcessStagesApi.setStatus(
                    v.clientId,
                    v.processId,
                    v.id,
                    v.status,
                    { signal: v.signal },
                )

            if (v.action === 'order')
                return clientProcessStagesApi.reorder(
                    v.clientId,
                    v.processId,
                    v.id,
                    v.direction,
                    { signal: v.signal },
                )

            return clientProcessStagesApi.delete(
                v.clientId,
                v.processId,
                v.id,
                { signal: v.signal },
            )
        },
        onSuccess: async (_, v) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.stages(
                        v.clientId,
                        v.processId,
                    ),
                }),
                qc.invalidateQueries({ queryKey: calendarQueryKeys.all }),
                qc.invalidateQueries({ queryKey: ['tasks'] }),
                qc.invalidateQueries({ queryKey: clientsQueryKeys.lists }),
                qc.invalidateQueries({
                    queryKey: clientsQueryKeys.detail(v.clientId),
                }),
            ])
        },
    })
}

export function useClientStageTasks(scope: ClientStageScope) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.records(
            scope.clientId,
            scope.processId,
            scope.stageId,
            'tasks',
        ),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientStageRecordsApi.tasks.list(
                scope,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useClientStageReminders(scope: ClientStageScope) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.records(
            scope.clientId,
            scope.processId,
            scope.stageId,
            'reminders',
        ),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientStageRecordsApi.reminders.list(
                scope,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useClientStageDeadlines(scope: ClientStageScope) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.records(
            scope.clientId,
            scope.processId,
            scope.stageId,
            'deadlines',
        ),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientStageRecordsApi.deadlines.list(
                scope,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useClientStageNotes(scope: ClientStageScope) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.records(
            scope.clientId,
            scope.processId,
            scope.stageId,
            'notes',
        ),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientStageRecordsApi.notes.list(
                scope,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useClientStageDocuments(scope: ClientStageScope) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.records(
            scope.clientId,
            scope.processId,
            scope.stageId,
            'documents',
        ),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientStageRecordsApi.documents.list(
                scope,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useSaveClientStageRecord() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: async (v: SaveClientStageRecordVariables) => {
            const options = { signal: v.signal }

            switch (v.kind) {
                case 'tasks':
                    return v.id
                        ? clientStageRecordsApi.tasks.update(
                              v,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientStageRecordsApi.tasks.create(v, v.dto, options)

                case 'reminders':
                    return v.id
                        ? clientStageRecordsApi.reminders.update(
                              v,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientStageRecordsApi.reminders.create(
                              v,
                              v.dto,
                              options,
                          )

                case 'deadlines':
                    return v.id
                        ? clientStageRecordsApi.deadlines.update(
                              v,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientStageRecordsApi.deadlines.create(
                              v,
                              v.dto,
                              options,
                          )

                case 'notes':
                    return v.id
                        ? clientStageRecordsApi.notes.update(
                              v,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientStageRecordsApi.notes.create(v, v.dto, options)

                case 'documents':
                    return v.id
                        ? clientStageRecordsApi.documents.update(
                              v,
                              v.id,
                              { title: v.dto.title },
                              options,
                          )
                        : clientStageRecordsApi.documents.create(
                              v,
                              v.dto,
                              options,
                          )
            }
        },
        onSuccess: async (_, v) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.records(
                        v.clientId,
                        v.processId,
                        v.stageId,
                    ),
                }),
                qc.invalidateQueries({ queryKey: calendarQueryKeys.all }),
                qc.invalidateQueries({ queryKey: ['tasks'] }),
            ])
        },
    })
}

export function useDeleteClientStageRecord() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            scope,
            kind,
            id,
            deleteScope,
            signal,
        }: {
            scope: ClientStageScope
            kind: keyof ClientStageRecords
            id: number
            deleteScope?: DeleteScope
            signal?: AbortSignal
        }) =>
            clientStageRecordsApi[kind].delete(scope, id, deleteScope, {
                signal,
            }),
        onSuccess: async (_, v) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.records(
                        v.scope.clientId,
                        v.scope.processId,
                        v.scope.stageId,
                    ),
                }),
                qc.invalidateQueries({ queryKey: calendarQueryKeys.all }),
                qc.invalidateQueries({ queryKey: ['tasks'] }),
            ])
        },
    })
}

export function useReorderClientStageTask() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            scope,
            id,
            direction,
            signal,
        }: {
            scope: ClientStageScope
            id: number
            direction: 'up' | 'down'
            signal?: AbortSignal
        }) =>
            clientStageRecordsApi.reorderTask(scope, id, direction, { signal }),
        onSuccess: (_, v) =>
            qc.invalidateQueries({
                queryKey: clientProcessesQueryKeys.records(
                    v.scope.clientId,
                    v.scope.processId,
                    v.scope.stageId,
                    'tasks',
                ),
            }),
    })
}
