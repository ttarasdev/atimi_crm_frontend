'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { mailPresetsApi } from '@/api/mail-presets/mail-presets.api'
import type {
    MailPresetsQuery,
    CreateMailPresetDto,
    UpdateMailPresetDto,
} from '@/api/mail/mail.types'
import {
    infiniteMailPresetsQueryOptions,
    mailPresetQueryOptions,
    mailPresetsQueryKeys,
} from '@/shared/query/mail-presets-query'

export function useMailPreset(id: number | null) {
    return useQuery(mailPresetQueryOptions(id))
}

export function useMailPresets(
    query: Omit<MailPresetsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infiniteMailPresetsQueryOptions(query))
}

export function useCreateMailPreset() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            signal,
        }: {
            dto: CreateMailPresetDto
            signal?: AbortSignal
        }) => mailPresetsApi.create(dto, { signal }),
        onSuccess: async (preset) => {
            cache.setQueryData(mailPresetsQueryKeys.detail(preset.id), preset)

            await cache.invalidateQueries({
                queryKey: mailPresetsQueryKeys.lists,
            })
        },
    })
}

export function useUpdateMailPreset() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateMailPresetDto
            signal?: AbortSignal
        }) => mailPresetsApi.update(id, dto, { signal }),
        onSuccess: async (preset) => {
            cache.setQueryData(mailPresetsQueryKeys.detail(preset.id), preset)

            await cache.invalidateQueries({
                queryKey: mailPresetsQueryKeys.lists,
            })
        },
    })
}

export function useDeleteMailPreset() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            mailPresetsApi.delete(id, { signal }),
        onSuccess: async (_, { id }) => {
            cache.removeQueries({ queryKey: mailPresetsQueryKeys.detail(id) })

            await cache.invalidateQueries({
                queryKey: mailPresetsQueryKeys.lists,
            })
        },
    })
}
