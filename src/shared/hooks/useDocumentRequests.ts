'use client'

import { useEffect } from 'react'
import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { documentRequestsApi } from '@/api/document-requests/document-requests.api'
import type { CreateDocumentRequestDto } from '@/api/document-requests/document-requests.types'
import {
    documentNotificationsQuery,
    documentRequestKeys,
    documentRequestsQuery,
} from '@/shared/query/document-requests-query'
import { clientsQueryKeys } from '@/shared/query/clients-query'

export function useDocumentRequests(clientId: number) {
    return useInfiniteQuery(documentRequestsQuery(clientId))
}

export function useDocumentUploadNotifications() {
    const cache = useQueryClient()

    const query = useInfiniteQuery(documentNotificationsQuery())

    useEffect(() => {
        const clients = new Set(
            query.data?.pages.flatMap((page) =>
                page.rows.map((row) => row.clientId),
            ),
        )

        for (const clientId of clients) {
            void cache.invalidateQueries({
                queryKey: clientsQueryKeys.records(clientId, 'documents'),
            })

            void cache.invalidateQueries({
                queryKey: documentRequestKeys.client(clientId),
            })
        }
    }, [cache, query.data])

    return query
}

export function useCreateDocumentRequest() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            dto,
            signal,
        }: {
            clientId: number
            dto: CreateDocumentRequestDto
            signal?: AbortSignal
        }) => documentRequestsApi.create(clientId, dto, { signal }),
        onSuccess: (_, args) =>
            cache.invalidateQueries({
                queryKey: documentRequestKeys.client(args.clientId),
            }),
    })
}

export function useRenewDocumentRequest() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            id,
            expiresInDays,
            signal,
        }: {
            clientId: number
            id: number
            expiresInDays: number
            signal?: AbortSignal
        }) =>
            documentRequestsApi.renew(clientId, id, expiresInDays, { signal }),
        onSuccess: (_, args) =>
            cache.invalidateQueries({
                queryKey: documentRequestKeys.client(args.clientId),
            }),
    })
}

export function useRevokeDocumentRequest() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            clientId,
            id,
            signal,
        }: {
            clientId: number
            id: number
            signal?: AbortSignal
        }) => documentRequestsApi.revoke(clientId, id, { signal }),
        onSuccess: (_, args) =>
            cache.invalidateQueries({
                queryKey: documentRequestKeys.client(args.clientId),
            }),
    })
}

export function useReadDocumentNotification() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: (id: number) => documentRequestsApi.read(id),
        onSuccess: () =>
            Promise.all([
                cache.invalidateQueries({
                    queryKey: documentRequestKeys.notifications,
                }),
                cache.invalidateQueries({ queryKey: clientsQueryKeys.all }),
            ]),
    })
}

export function usePublicDocumentRequest() {
    return useMutation({
        retry: false,
        meta: { skipAuthHandling: true },
        mutationFn: ({
            token,
            signal,
        }: {
            token: string
            signal?: AbortSignal
        }) => documentRequestsApi.view(token, { signal }),
    })
}

export function useSubmitRequestedDocument() {
    return useMutation({
        retry: false,
        meta: { skipAuthHandling: true },
        mutationFn: ({
            token,
            file,
            signal,
        }: {
            token: string
            file: File
            signal?: AbortSignal
        }) => documentRequestsApi.upload(token, file, { signal }),
    })
}
