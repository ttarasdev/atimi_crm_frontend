'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { privateAssetsApi } from '@/api/private-assets/private-assets.api'
import type {
    AssetVisibility,
    CreatePrivateAssetDto,
    PrivateAssetsQuery,
} from '@/api/private-assets/private-assets.types'
import {
    infinitePrivateAssetsQueryOptions,
    privateAssetQueryOptions,
    privateAssetsQueryKeys,
    privateAssetsQueryOptions,
} from '@/shared/query/private-assets-query'

export function usePrivateAssets(query: PrivateAssetsQuery = {}) {
    return useQuery(privateAssetsQueryOptions(query))
}

export function useInfinitePrivateAssets(
    query: Omit<PrivateAssetsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(infinitePrivateAssetsQueryOptions(query))
}

export function usePrivateAsset(id: number | null) {
    return useQuery(privateAssetQueryOptions(id))
}

export function useCreatePrivateAsset() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            dto,
            file,
            signal,
        }: {
            dto: CreatePrivateAssetDto
            file: File
            signal?: AbortSignal
        }) => privateAssetsApi.create(dto, file, { signal }),
        onSuccess: async (asset) => {
            cache.setQueryData(privateAssetsQueryKeys.detail(asset.id), asset)

            await cache.invalidateQueries({
                queryKey: privateAssetsQueryKeys.lists,
            })
        },
    })
}

export function useSetPrivateAssetVisibility() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            visibility,
            signal,
        }: {
            id: number
            visibility: AssetVisibility
            signal?: AbortSignal
        }) => privateAssetsApi.setVisibility(id, visibility, { signal }),
        onSuccess: async (asset) => {
            cache.setQueryData(privateAssetsQueryKeys.detail(asset.id), asset)

            await cache.invalidateQueries({
                queryKey: privateAssetsQueryKeys.lists,
            })
        },
    })
}

export function useDeletePrivateAsset() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            privateAssetsApi.delete(id, { signal }),
        onSuccess: async (_, { id }) => {
            cache.removeQueries({ queryKey: privateAssetsQueryKeys.detail(id) })

            await cache.invalidateQueries({
                queryKey: privateAssetsQueryKeys.lists,
            })
        },
    })
}

export function useDownloadPrivateAsset() {
    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            privateAssetsApi.download(id, { signal }),
    })
}

export function useRenamePrivateAsset() {
    const cache = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            originalName,
            signal,
        }: {
            id: number
            originalName: string
            signal?: AbortSignal
        }) => privateAssetsApi.rename(id, originalName, { signal }),
        onSuccess: async (asset) => {
            cache.setQueryData(privateAssetsQueryKeys.detail(asset.id), asset)

            await cache.invalidateQueries({
                queryKey: privateAssetsQueryKeys.lists,
            })
        },
    })
}
