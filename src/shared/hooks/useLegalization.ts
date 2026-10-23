'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { legalizationApi } from '@/api/legalization/legalization.api'
import type {
    ClientRelation,
    DocumentCardType,
    LegalizationProfile,
    SaveDocumentCardDto,
} from '@/api/legalization/legalization.types'

const keys = {
    client: (id: number) => ['legalization', id] as const,
    types: ['document-card-types'] as const,
}

export function useLegalization(clientId: number) {
    return useQuery({
        queryKey: [...keys.client(clientId), 'profile'],
        queryFn: ({ signal }) => legalizationApi.get(clientId, { signal }),
    })
}

export function useSaveLegalization(clientId: number) {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: Partial<LegalizationProfile>
            signal?: AbortSignal
        }) => legalizationApi.update(clientId, dto, { signal }),
        onSuccess: async (profile) => {
            qc.setQueryData([...keys.client(clientId), 'profile'], profile)

            await qc.invalidateQueries({
                queryKey: ['client-activity', clientId],
            })
        },
    })
}

export function useDocumentCardTypes() {
    return useQuery({
        queryKey: keys.types,
        queryFn: ({ signal }) => legalizationApi.types({ signal }),
    })
}

export function useUpdateDocumentCardType() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: Pick<
                DocumentCardType,
                'reminderMonths' | 'reminderTime' | 'notificationEmail'
            >
            signal?: AbortSignal
        }) => legalizationApi.updateType(id, dto, { signal }),
        onSuccess: () => qc.invalidateQueries({ queryKey: keys.types }),
    })
}

export function useDocumentCards(clientId: number) {
    return useInfiniteQuery({
        queryKey: [...keys.client(clientId), 'cards'],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            legalizationApi.cards(clientId, pageParam, { signal }),
        getNextPageParam: (last) =>
            last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useSaveDocumentCard(clientId: number) {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id?: number
            dto: SaveDocumentCardDto
            signal?: AbortSignal
        }) =>
            id
                ? legalizationApi.updateCard(clientId, id, dto, { signal })
                : legalizationApi.createCard(clientId, dto, { signal }),
        onSuccess: () =>
            Promise.all([
                qc.invalidateQueries({
                    queryKey: [...keys.client(clientId), 'cards'],
                }),
                qc.invalidateQueries({ queryKey: ['calendars'] }),
            ]),
    })
}

export function useClientRelations(clientId: number) {
    return useInfiniteQuery({
        queryKey: [...keys.client(clientId), 'relations'],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            legalizationApi.relations(clientId, pageParam, { signal }),
        getNextPageParam: (last) =>
            last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function useSaveClientRelation(clientId: number) {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: Pick<ClientRelation, 'relatedClientId' | 'type'>
            signal?: AbortSignal
        }) => legalizationApi.createRelation(clientId, dto, { signal }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['legalization'] }),
    })
}

export function useDeleteClientRelation(clientId: number) {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            legalizationApi.deleteRelation(clientId, id, { signal }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['legalization'] }),
    })
}
