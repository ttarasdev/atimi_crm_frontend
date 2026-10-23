'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { publicAssetsApi } from '@/api/public-assets/public-assets.api'
import type {
    CreatePublicAssetDto,
    PublicAsset,
    PublicAssetsQuery,
} from '@/api/public-assets/public-assets.types'
import {
    infinitePublicAssetsQueryOptions,
    publicAssetQueryOptions,
    publicAssetsQueryKeys,
    publicAssetsQueryOptions,
} from '@/shared/query/public-assets-query'

export function usePublicAssets(query: PublicAssetsQuery = {}) {
    return useQuery(publicAssetsQueryOptions(query))
}

export function useInfinitePublicAssets(
    query: Omit<PublicAssetsQuery, 'page' | 'limit' | 'offset'>,
) {
    return useInfiniteQuery(infinitePublicAssetsQueryOptions(query))
}

export function usePublicAsset(id: number | null) {
    return useQuery(publicAssetQueryOptions(id))
}

export function useTogglePublicAssetPopular() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            publicAssetsApi.togglePopular(id, { signal }),

        onSuccess: async (result, { id }) => {
            queryClient.setQueryData<PublicAsset>(
                publicAssetsQueryKeys.detail(id),
                (asset) =>
                    asset ? { ...asset, isPopular: result.isPopular } : asset,
            )

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: publicAssetsQueryKeys.lists,
                }),
                queryClient.invalidateQueries({
                    queryKey: publicAssetsQueryKeys.detail(id),
                }),
            ])
        },
    })
}

export function useCreatePublicAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            dto,
            file,
            signal,
        }: {
            dto: CreatePublicAssetDto
            file: File
            signal?: AbortSignal
        }) => publicAssetsApi.create(dto, file, { signal }),

        onSuccess: async (asset) => {
            queryClient.setQueryData(
                publicAssetsQueryKeys.detail(asset.id),
                asset,
            )

            await queryClient.invalidateQueries({
                queryKey: publicAssetsQueryKeys.lists,
            })
        },
    })
}

export function useDeletePublicAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({ id, signal }: { id: number; signal?: AbortSignal }) =>
            publicAssetsApi.delete(id, { signal }),
        onSuccess: async (_, { id }) => {
            queryClient.removeQueries({
                queryKey: publicAssetsQueryKeys.detail(id),
            })

            await queryClient.invalidateQueries({
                queryKey: publicAssetsQueryKeys.lists,
            })
        },
    })
}
