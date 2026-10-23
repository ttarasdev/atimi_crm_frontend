'use client'

import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { searchApi } from '@/api/search/search.api'
import type { SearchType } from '@/api/search/search.types'

export function useGlobalSearch(text: string, type?: SearchType) {
    const q = text.trim().slice(0, 120)

    const [debounced, setDebounced] = useState(q)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(q), 300)

        return () => clearTimeout(timer)
    }, [q])

    const preview = useQuery({
        queryKey: ['global-search', 'preview', debounced],
        enabled: !type,
        queryFn: ({ signal }) => searchApi.search(debounced, { signal }),
        staleTime: 0,
    })

    const pages = useInfiniteQuery({
        queryKey: ['global-search', 'page', type, debounced],
        enabled: !!type,
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) => {
            if (!type) throw new Error('Search category is required')

            return searchApi.page(type, debounced, pageParam, { signal })
        },
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
        staleTime: 0,
    })

    const query = type ? pages : preview

    const waiting = q !== debounced

    const rows = Array.from(
        new Map(
            (pages.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (item) => [`${item.kind}:${item.id}`, item],
            ),
        ).values(),
    )

    return {
        loading: waiting || query.isPending,
        error: waiting ? null : query.error,
        groups: waiting
            ? []
            : type
              ? [{ type, items: rows, hasMore: !!pages.hasNextPage }]
              : (preview.data?.groups ?? []),
        total: pages.data?.pages[0]?.total,
        fetchNextPage: pages.fetchNextPage,
        fetchingMore: pages.isFetchingNextPage,
        hasNextPage: pages.hasNextPage,
        refetch: query.refetch,
    }
}
