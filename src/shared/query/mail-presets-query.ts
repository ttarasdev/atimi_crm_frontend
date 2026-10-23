import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { mailPresetsApi } from '@/api/mail-presets/mail-presets.api'
import type { MailPresetsQuery } from '@/api/mail/mail.types'

export const mailPresetsQueryKeys = {
    lists: ['mail-presets', 'list'] as const,
    infinite: (query: MailPresetsQuery) =>
        ['mail-presets', 'list', query] as const,
    detail: (id: number | null) => ['mail-presets', 'detail', id] as const,
}

export function mailPresetQueryOptions(id: number | null) {
    return queryOptions({
        queryKey: mailPresetsQueryKeys.detail(id),
        queryFn:
            id === null
                ? skipToken
                : ({ signal }) => mailPresetsApi.get(id, { signal }),
    })
}

export function infiniteMailPresetsQueryOptions(
    query: Omit<MailPresetsQuery, 'page' | 'limit' | 'offset'> = {},
) {
    return infiniteQueryOptions({
        queryKey: mailPresetsQueryKeys.infinite(query),
        initialPageParam: 1,
        queryFn: ({ signal, pageParam }) =>
            mailPresetsApi.list(
                { ...query, page: pageParam, limit: 30 },
                { signal },
            ),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
