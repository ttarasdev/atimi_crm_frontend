'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { partnersApi } from '@/api/partners/partners.api'
import type {
    PartnersQuery,
    CreatePartnerDto,
    UpdatePartnerDto,
} from '@/api/partners/partners.types'
import {
    infinitePartnersQueryOptions,
    partnerQueryOptions,
    partnersQueryKeys,
} from '@/shared/query/partners-query'

export function usePartner(id: number | null) {
    return useQuery(partnerQueryOptions(id))
}

export function usePartners(
    query: Omit<PartnersQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infinitePartnersQueryOptions(query))
}

export function useCreatePartner() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreatePartnerDto
            signal?: AbortSignal
        }) => partnersApi.create(dto, { signal }),
        onSuccess: async (partner) => {
            cache.setQueryData(partnersQueryKeys.detail(partner.id), partner)

            await cache.invalidateQueries({ queryKey: partnersQueryKeys.lists })
        },
    })
}

export function useUpdatePartner() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdatePartnerDto
            signal?: AbortSignal
        }) => partnersApi.update(id, dto, { signal }),
        onSuccess: async (partner) => {
            cache.setQueryData(partnersQueryKeys.detail(partner.id), partner)

            await cache.invalidateQueries({ queryKey: partnersQueryKeys.lists })
        },
    })
}
