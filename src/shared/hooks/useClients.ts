'use client'

import {
    useInfiniteQuery,
    useQuery,
    useMutation,
    useQueryClient,
    skipToken,
} from '@tanstack/react-query'
import { clientsApi } from '@/api/clients/clients.api'
import type {
    ClientsQuery,
    CreateClientDto,
    UpdateClientDto,
} from '@/api/clients/clients.types'
import { clientRecordsApi } from '@/api/client-records/client-records.api'
import type {
    SaveClientRecordVariables,
    ClientRecordDtos,
} from '@/api/client-records/client-records.types'
import {
    clientsQueryKeys,
    infiniteClientsQueryOptions,
    clientQueryOptions,
} from '@/shared/query/clients-query'

export function useInfiniteClients(
    query: Omit<ClientsQuery, 'page' | 'limit' | 'offset'> = {},
    enabled = true,
) {
    return useInfiniteQuery({ ...infiniteClientsQueryOptions(query), enabled })
}

export function useClient(id: number | null) {
    return useQuery(clientQueryOptions(id))
}

export function useClientSources() {
    return useInfiniteQuery({
        queryKey: clientsQueryKeys.sources,
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientRecordsApi.sources(
                { isActive: true, page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useClientManagerCalendar(managerId: number | null) {
    return useQuery({
        queryKey: clientsQueryKeys.calendar(managerId),
        queryFn:
            managerId === null
                ? skipToken
                : ({ signal }) =>
                      clientRecordsApi.managerCalendar(managerId, { signal }),
    })
}

export function useCreateClient() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateClientDto
            signal?: AbortSignal
        }) => clientsApi.create(dto, { signal }),
        onSuccess: async (client) => {
            qc.setQueryData(clientsQueryKeys.detail(client.id), client)

            await qc.invalidateQueries({ queryKey: clientsQueryKeys.lists })

            await qc.invalidateQueries({ queryKey: ['crm-overview'] })
        },
    })
}

export function useUpdateClient() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateClientDto
            signal?: AbortSignal
        }) => clientsApi.update(id, dto, { signal }),
        onSuccess: async (client, { dto }) => {
            await qc.cancelQueries({
                queryKey: clientsQueryKeys.detail(client.id),
            })

            qc.setQueryData(clientsQueryKeys.detail(client.id), client)

            await qc.invalidateQueries({ queryKey: clientsQueryKeys.lists })

            if (
                dto.paymentStatus !== undefined ||
                dto.paymentAmount !== undefined ||
                dto.paymentCurrency !== undefined ||
                dto.managerId !== undefined
            )
                await qc.invalidateQueries({ queryKey: ['crm-overview'] })

            if (dto.managerId !== undefined)
                await qc.invalidateQueries({ queryKey: ['calendars'] })
        },
    })
}

export function useArchiveClient() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            archived,
            signal,
        }: {
            id: number
            archived: boolean
            signal?: AbortSignal
        }) => clientsApi.archive(id, archived, { signal }),
        onSuccess: async (client) => {
            qc.setQueryData(clientsQueryKeys.detail(client.id), client)

            await qc.invalidateQueries({ queryKey: clientsQueryKeys.lists })

            await qc.invalidateQueries({ queryKey: ['crm-overview'] })
        },
    })
}

export function useClientContacts(clientId: number) {
    return useInfiniteQuery({
        queryKey: clientsQueryKeys.records(clientId, 'contacts'),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientRecordsApi.contacts.list(
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

export function useClientPreferences(clientId: number) {
    return useInfiniteQuery({
        queryKey: clientsQueryKeys.records(clientId, 'preferences'),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientRecordsApi.preferences.list(
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

export function useClientNotes(clientId: number) {
    return useInfiniteQuery({
        queryKey: clientsQueryKeys.records(clientId, 'notes'),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientRecordsApi.notes.list(
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

export function useClientDocuments(clientId: number) {
    return useInfiniteQuery({
        queryKey: clientsQueryKeys.records(clientId, 'documents'),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            clientRecordsApi.documents.list(
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

export function useSaveClientRecord() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: async (v: SaveClientRecordVariables) => {
            const options = { signal: v.signal }

            switch (v.kind) {
                case 'contacts':
                    return v.id
                        ? clientRecordsApi.contacts.update(
                              v.clientId,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientRecordsApi.contacts.create(
                              v.clientId,
                              v.dto,
                              options,
                          )

                case 'preferences':
                    return v.id
                        ? clientRecordsApi.preferences.update(
                              v.clientId,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientRecordsApi.preferences.create(
                              v.clientId,
                              v.dto,
                              options,
                          )

                case 'notes':
                    return v.id
                        ? clientRecordsApi.notes.update(
                              v.clientId,
                              v.id,
                              v.dto,
                              options,
                          )
                        : clientRecordsApi.notes.create(
                              v.clientId,
                              v.dto,
                              options,
                          )

                case 'documents':
                    return v.id
                        ? clientRecordsApi.documents.update(
                              v.clientId,
                              v.id,
                              { title: v.dto.title, category: v.dto.category },
                              options,
                          )
                        : clientRecordsApi.documents.create(
                              v.clientId,
                              v.dto,
                              options,
                          )
            }
        },
        onSuccess: (_, v) =>
            qc.invalidateQueries({
                queryKey: clientsQueryKeys.records(v.clientId, v.kind),
            }),
    })
}

export function useDeleteClientRecord() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            kind,
            id,
            signal,
        }: {
            clientId: number
            kind: keyof ClientRecordDtos
            id: number
            signal?: AbortSignal
        }) => clientRecordsApi[kind].delete(clientId, id, { signal }),
        onSuccess: (_, v) =>
            qc.invalidateQueries({
                queryKey: clientsQueryKeys.records(v.clientId, v.kind),
            }),
    })
}
