'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { mailCampaignsApi } from '@/api/mail-campaigns/mail-campaigns.api'
import type {
    CampaignFilters,
    CampaignFilterOptionKind,
    CampaignsQuery,
    CreateCampaignDto,
} from '@/api/mail-campaigns/mail-campaigns.types'

export function useCampaignFilterOptions(
    kind: CampaignFilterOptionKind,
    enabled = true,
) {
    return useInfiniteQuery({
        queryKey: ['mail-campaigns', 'filter-options', kind],
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            mailCampaignsApi.filterOptions(kind, pageParam, { signal }),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
        enabled,
    })
}

export function useCampaignAudience() {
    return useMutation({
        retry: false,
        mutationFn: ({
            filters,
            signal,
        }: {
            filters: CampaignFilters
            signal?: AbortSignal
        }) => mailCampaignsApi.audience(filters, { signal }),
    })
}

export function useCreateCampaign() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateCampaignDto
            signal?: AbortSignal
        }) => mailCampaignsApi.create(dto, { signal }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-campaigns'] }),
    })
}

export function useCampaigns(query: CampaignsQuery) {
    return useQuery({
        queryKey: ['mail-campaigns', 'list', query],
        queryFn: ({ signal }) => mailCampaignsApi.list(query, { signal }),
        refetchInterval: 10000,
    })
}

export function useCampaignRecipients(id: number, page: number) {
    return useQuery({
        queryKey: ['mail-campaigns', 'recipients', id, page],
        queryFn: ({ signal }) =>
            mailCampaignsApi.recipients(id, page, { signal }),
        refetchInterval: 10000,
    })
}

export function useCampaign(id: number) {
    return useQuery({
        queryKey: ['mail-campaigns', 'detail', id],
        queryFn: ({ signal }) => mailCampaignsApi.get(id, { signal }),
        refetchInterval: 10000,
    })
}

export function useCancelCampaign() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: (id: number) => mailCampaignsApi.cancel(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-campaigns'] }),
    })
}
