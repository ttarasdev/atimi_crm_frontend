'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { siteReviewsApi } from '@/api/site-reviews/site-reviews.api'
import { siteVideosApi } from '@/api/site-videos/site-videos.api'
import type {
    SiteReviewsQuery,
    CreateSiteReviewDto,
    UpdateSiteReviewDto,
} from '@/api/site-reviews/site-reviews.types'
import type {
    SiteVideosQuery,
    CreateSiteVideoDto,
    UpdateSiteVideoDto,
} from '@/api/site-videos/site-videos.types'
import {
    siteReviewsQueryOptions,
    siteVideosQueryOptions,
    websiteContentQueryKeys,
} from '@/shared/query/website-content-query'

export function useSiteReviews(
    query: Omit<SiteReviewsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(siteReviewsQueryOptions(query))
}

export function useSiteVideos(
    query: Omit<SiteVideosQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return useInfiniteQuery(siteVideosQueryOptions(query))
}

export function useSaveSiteReview() {
    const client = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id?: number
            dto: CreateSiteReviewDto
            signal?: AbortSignal
        }) =>
            id
                ? siteReviewsApi.update(id, dto, { signal })
                : siteReviewsApi.create(dto, { signal }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: websiteContentQueryKeys.reviews,
            }),
    })
}

export function useUpdateSiteReview() {
    const client = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateSiteReviewDto
            signal?: AbortSignal
        }) => siteReviewsApi.update(id, dto, { signal }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: websiteContentQueryKeys.reviews,
            }),
    })
}

export function useSaveSiteVideo() {
    const client = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id?: number
            dto: CreateSiteVideoDto
            signal?: AbortSignal
        }) =>
            id
                ? siteVideosApi.update(id, dto, { signal })
                : siteVideosApi.create(dto, { signal }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: websiteContentQueryKeys.videos,
            }),
    })
}

export function useUpdateSiteVideo() {
    const client = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            dto,
            signal,
        }: {
            id: number
            dto: UpdateSiteVideoDto
            signal?: AbortSignal
        }) => siteVideosApi.update(id, dto, { signal }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: websiteContentQueryKeys.videos,
            }),
    })
}

export function useReorderSiteReview() {
    const client = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            direction,
            signal,
        }: {
            id: number
            direction: 'up' | 'down'
            signal?: AbortSignal
        }) => siteReviewsApi.reorder(id, direction, { signal }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: websiteContentQueryKeys.reviews,
            }),
    })
}

export function useReorderSiteVideo() {
    const client = useQueryClient()

    return useMutation({
        retry: false,
        mutationFn: ({
            id,
            direction,
            signal,
        }: {
            id: number
            direction: 'up' | 'down'
            signal?: AbortSignal
        }) => siteVideosApi.reorder(id, direction, { signal }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: websiteContentQueryKeys.videos,
            }),
    })
}
