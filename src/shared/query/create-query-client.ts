import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError, ApiResponseError } from '../../api/api-error'

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
    if (error.name === 'AbortError' || error instanceof ApiResponseError)
        return false

    if (error instanceof ApiError && error.status < 500) return false

    return failureCount < 2
}

export function createQueryClient(
    onUnauthorized: () => void = () => {},
): QueryClient {
    const handleError = (error: Error, skipAuthHandling?: unknown) => {
        if (
            !skipAuthHandling &&
            error instanceof ApiError &&
            error.status === 401
        )
            onUnauthorized()
    }

    const client: QueryClient = new QueryClient({
        queryCache: new QueryCache({
            onError: (error, query) =>
                handleError(error, query.meta?.skipAuthHandling),
        }),
        mutationCache: new MutationCache({
            onError: (error, _variables, _context, mutation) =>
                handleError(error, mutation.meta?.skipAuthHandling),
            onSuccess: () =>
                client.invalidateQueries({ queryKey: ['crm-overview'] }),
        }),
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                gcTime: 5 * 60_000,
                retry: shouldRetryQuery,
                refetchOnWindowFocus: true,
            },
            mutations: { retry: false, networkMode: 'always' },
        },
    })

    return client
}
