import { infiniteQueryOptions } from '@tanstack/react-query'
import { siteReviewsApi } from '@/api/site-reviews/site-reviews.api'
import { siteVideosApi } from '@/api/site-videos/site-videos.api'
import type { SiteReviewsQuery } from '@/api/site-reviews/site-reviews.types'
import type { SiteVideosQuery } from '@/api/site-videos/site-videos.types'

export const websiteContentQueryKeys = {
    reviews: ['site-reviews'] as const,
    videos: ['site-videos'] as const,
    reviewsList: (query: SiteReviewsQuery) =>
        ['site-reviews', 'list', query] as const,
    videosList: (query: SiteVideosQuery) =>
        ['site-videos', 'list', query] as const,
}

export function siteReviewsQueryOptions(
    query: Omit<SiteReviewsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: websiteContentQueryKeys.reviewsList(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            siteReviewsApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function siteVideosQueryOptions(
    query: Omit<SiteVideosQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: websiteContentQueryKeys.videosList(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            siteVideosApi.list(
                { ...query, page: pageParam, limit: 100 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
