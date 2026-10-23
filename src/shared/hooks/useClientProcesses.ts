'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { clientProcessesApi } from '@/api/client-processes/client-processes.api'
import type {
    ClientCaseData,
    ClientProcessStatus,
} from '@/api/client-processes/client-processes.types'
import { clientProcessesQueryKeys } from '@/shared/query/client-processes-query'
import { clientsQueryKeys } from '@/shared/query/clients-query'

export function useClientProcesses(clientId: number) {
    return useInfiniteQuery({
        queryKey: clientProcessesQueryKeys.lists(clientId),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientProcessesApi.list(
                clientId,
                { page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useSaveClientProcess() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            id,
            title,
            processTemplateId,
            caseData,
            signal,
        }: {
            clientId: number
            id?: number
            title: string
            processTemplateId?: number
            caseData?: ClientCaseData
            signal?: AbortSignal
        }) =>
            id
                ? clientProcessesApi.update(
                      clientId,
                      id,
                      { title, caseData },
                      { signal },
                  )
                : clientProcessesApi.create(
                      clientId,
                      {
                          title,
                          caseData,
                          ...(processTemplateId ? { processTemplateId } : {}),
                      },
                      { signal },
                  ),
        onSuccess: async (_, v) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.lists(v.clientId),
                }),
                qc.invalidateQueries({ queryKey: clientsQueryKeys.lists }),
                qc.invalidateQueries({
                    queryKey: clientsQueryKeys.detail(v.clientId),
                }),
            ])
        },
    })
}

export function useClientProcessStatus() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            id,
            status,
            signal,
        }: {
            clientId: number
            id: number
            status: ClientProcessStatus
            signal?: AbortSignal
        }) => clientProcessesApi.setStatus(clientId, id, status, { signal }),
        onSuccess: async (_, v) => {
            await Promise.all([
                qc.invalidateQueries({
                    queryKey: clientProcessesQueryKeys.lists(v.clientId),
                }),
                qc.invalidateQueries({ queryKey: clientsQueryKeys.lists }),
                qc.invalidateQueries({
                    queryKey: clientsQueryKeys.detail(v.clientId),
                }),
            ])
        },
    })
}
