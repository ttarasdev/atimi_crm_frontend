'use client'

import { useEffect } from 'react'
import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { noteMentionsApi } from '@/api/note-mentions/note-mentions.api'
import type { ClientStageScope } from '@/api/client-stage-records/client-stage-records.types'
import { clientsQueryKeys } from '@/shared/query/clients-query'
import { clientProcessesQueryKeys } from '@/shared/query/client-processes-query'

export const noteMentionKeys = {
    all: ['note-mentions'] as const,
    notifications: ['note-mentions', 'notifications'] as const,
}

export function useMentionRecipients(
    clientId: number,
    search: string,
    enabled: boolean,
) {
    return useInfiniteQuery({
        queryKey: [...noteMentionKeys.all, 'recipients', clientId, search],
        initialPageParam: 1,
        enabled,
        queryFn: ({ signal, pageParam }) =>
            noteMentionsApi.recipients(clientId, search, pageParam, { signal }),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
        staleTime: 0,
    })
}

export function useMentionNotifications() {
    const cache = useQueryClient()

    const query = useInfiniteQuery({
        queryKey: noteMentionKeys.notifications,
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            noteMentionsApi.notifications(pageParam, { signal }),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
        refetchInterval: 30000,
    })

    useEffect(() => {
        for (const row of query.data?.pages.flatMap((page) => page.rows) ??
            []) {
            void cache.invalidateQueries({
                queryKey: clientsQueryKeys.records(row.clientId, 'notes'),
            })

            if (row.processId && row.stageId)
                void cache.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.records(
                        row.clientId,
                        row.processId,
                        row.stageId,
                        'notes',
                    ),
                })
        }
    }, [cache, query.data])

    return query
}

export function useReadMentionNotification() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: (id: number) => noteMentionsApi.read(id),
        onSuccess: () =>
            cache.invalidateQueries({
                queryKey: noteMentionKeys.notifications,
            }),
    })
}

export function useExactClientNote(clientId: number, id: number | undefined) {
    return useQuery({
        queryKey: [
            ...clientsQueryKeys.records(clientId, 'notes'),
            'detail',
            id,
        ],
        enabled: !!id,
        retry: false,
        queryFn: ({ signal }) =>
            noteMentionsApi.clientNote(clientId, id!, { signal }),
    })
}

export function useExactStageNote(
    scope: ClientStageScope,
    id: number | undefined,
) {
    return useQuery({
        queryKey: [
            ...clientProcessesQueryKeys.records(
                scope.clientId,
                scope.processId,
                scope.stageId,
                'notes',
            ),
            'detail',
            id,
        ],
        enabled: !!id,
        retry: false,
        queryFn: ({ signal }) =>
            noteMentionsApi.stageNote(scope, id!, { signal }),
    })
}
