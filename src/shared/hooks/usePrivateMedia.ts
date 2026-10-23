'use client'

import { skipToken, useQuery } from '@tanstack/react-query'
import { privateAssetsApi } from '@/api/private-assets/private-assets.api'
import { privateVariantsApi } from '@/api/private-variants/private-variants.api'

export function usePrivateVariant(id: number | null) {
    return useQuery({
        queryKey: ['private-variants', 'detail', id],
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => privateVariantsApi.getById(id, { signal }),
        staleTime: 60_000,
    })
}

export function usePrivateAssetFile(id: number | null) {
    return useQuery({
        queryKey: ['private-assets', 'file', id],
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => privateAssetsApi.download(id, { signal }),
        staleTime: 60_000,
    })
}
