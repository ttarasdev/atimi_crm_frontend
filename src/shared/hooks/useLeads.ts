'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { leadsApi } from '@/api/leads/leads.api'
import type {
    ConvertLeadDto,
    CreateLeadDto,
    LeadsQuery,
    UpdateLeadDto,
} from '@/api/leads/leads.types'
import {
    infiniteLeadsQueryOptions,
    leadQueryOptions,
    leadsQueryKeys,
} from '@/shared/query/leads-query'
import { clientsQueryKeys } from '@/shared/query/clients-query'

export function useInfiniteLeads(
    query: Omit<LeadsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infiniteLeadsQueryOptions(query))
}

export function useLead(id: number | null) {
    return useQuery(leadQueryOptions(id))
}

export function useCreateLead() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateLeadDto
            signal?: AbortSignal
        }) => leadsApi.create(dto, { signal }),
        onSuccess: async (lead) => {
            qc.setQueryData(leadsQueryKeys.detail(lead.id), lead)

            await qc.invalidateQueries({ queryKey: leadsQueryKeys.lists })
        },
    })
}

export function useUpdateLead() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateLeadDto
            signal?: AbortSignal
        }) => leadsApi.update(id, dto, { signal }),
        onSuccess: async (lead) => {
            await qc.cancelQueries({ queryKey: leadsQueryKeys.detail(lead.id) })

            qc.setQueryData(leadsQueryKeys.detail(lead.id), lead)

            await qc.invalidateQueries({ queryKey: leadsQueryKeys.lists })
        },
    })
}

export function useConvertLead() {
    const qc = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: ConvertLeadDto
            signal?: AbortSignal
        }) => leadsApi.convert(id, dto, { signal }),
        onSuccess: async (result) => {
            await qc.cancelQueries({
                queryKey: leadsQueryKeys.detail(result.lead.id),
            })

            qc.setQueryData(leadsQueryKeys.detail(result.lead.id), result.lead)

            await Promise.all([
                qc.invalidateQueries({ queryKey: leadsQueryKeys.lists }),
                qc.invalidateQueries({ queryKey: clientsQueryKeys.all }),
                qc.invalidateQueries({
                    queryKey: clientsQueryKeys.records(result.clientId),
                }),
                qc.invalidateQueries({ queryKey: clientsQueryKeys.sources }),
                qc.invalidateQueries({ queryKey: ['crm-overview'] }),
            ])
        },
    })
}
