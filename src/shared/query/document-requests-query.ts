import { infiniteQueryOptions } from '@tanstack/react-query'
import { documentRequestsApi } from '@/api/document-requests/document-requests.api'

export const documentRequestKeys = {
    all: ['document-requests'] as const,
    client: (clientId: number) =>
        ['document-requests', 'client', clientId] as const,
    notifications: ['document-requests', 'notifications'] as const,
}

export function documentRequestsQuery(clientId: number) {
    return infiniteQueryOptions({
        queryKey: documentRequestKeys.client(clientId),
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            documentRequestsApi.list(clientId, pageParam, { signal }),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
        refetchInterval: 30000,
    })
}

export function documentNotificationsQuery() {
    return infiniteQueryOptions({
        queryKey: documentRequestKeys.notifications,
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            documentRequestsApi.notifications(pageParam, { signal }),
        getNextPageParam: (last) =>
            last.rows.length && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
        refetchInterval: 30000,
    })
}
