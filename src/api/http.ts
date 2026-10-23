import { API_URL } from '@/shared/config/api'
import type { HttpOptions, QueryParams } from './http.types'
import { ApiError, ApiResponseError } from './api-error'
import { getAccessToken } from './auth-token'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

function buildUrl(path: string, options: HttpOptions): string {
    const base = options.baseUrl ?? API_URL

    if (!base) throw new Error('Set NEXT_PUBLIC_API_URL before calling the API')

    const origin = new URL(base)

    if (
        !/^https?:$/.test(origin.protocol) ||
        origin.username ||
        origin.password
    ) {
        throw new Error(
            'API base URL must be an HTTP(S) URL without credentials',
        )
    }

    if (
        origin.search ||
        origin.hash ||
        !path.startsWith('/') ||
        path.startsWith('//')
    ) {
        throw new Error(
            'Use an API base URL without query/hash and a relative endpoint path',
        )
    }

    const url = new URL(base.replace(/\/$/, '') + path)

    appendQuery(url.searchParams, options.query)

    return url.toString()
}

export function apiUrl(path: string, options: HttpOptions = {}): string {
    return buildUrl(path, options)
}

function appendQuery(search: URLSearchParams, query?: QueryParams): void {
    for (const [key, value] of Object.entries(query ?? {})) {
        for (const item of Array.isArray(value) ? value : [value]) {
            if (item !== undefined && item !== null)
                search.append(key, String(item))
        }
    }
}

async function request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: HttpOptions = {},
    responseType: 'json' | 'blob' = 'json',
): Promise<T> {
    const url = buildUrl(path, options)

    const headers = new Headers(options.headers)

    const multipart = body instanceof FormData

    if (!headers.has('Accept')) {
        headers.set(
            'Accept',
            responseType === 'blob' ? '*/*' : 'application/json',
        )
    }

    if (multipart) headers.delete('Content-Type')
    else if (body !== undefined) headers.set('Content-Type', 'application/json')

    if (options.auth === false) headers.delete('Authorization')
    else {
        const token =
            options.token === undefined ? getAccessToken() : options.token

        if (token) headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(url, {
        method,
        headers,
        body:
            body === undefined
                ? undefined
                : multipart
                  ? body
                  : JSON.stringify(body),
        signal: options.signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
    })

    if (!response.ok) {
        const text = await response.text()

        let data: unknown = text || null

        try {
            data = JSON.parse(text)
        } catch {
            // Preserve non-JSON error bodies for diagnostics.
        }

        throw new ApiError(response.status, data, url)
    }

    if (response.status === 204 || response.status === 205)
        return undefined as T

    if (responseType === 'blob') return (await response.blob()) as T

    const text = await response.text()

    if (!text.trim()) throw new ApiResponseError(response.status, url)

    try {
        return JSON.parse(text) as T
    } catch {
        throw new ApiResponseError(response.status, url)
    }
}

export const http = {
    get: <T>(path: string, options?: HttpOptions) =>
        request<T>('GET', path, undefined, options),

    post: <T>(path: string, body?: unknown, options?: HttpOptions) =>
        request<T>('POST', path, body, options),

    put: <T>(path: string, body?: unknown, options?: HttpOptions) =>
        request<T>('PUT', path, body, options),

    patch: <T>(path: string, body?: unknown, options?: HttpOptions) =>
        request<T>('PATCH', path, body, options),

    delete: <T>(path: string, options?: HttpOptions) =>
        request<T>('DELETE', path, undefined, options),

    getBlob: (path: string, options?: HttpOptions) =>
        request<Blob>('GET', path, undefined, options, 'blob'),
}
