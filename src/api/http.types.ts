export type QueryValue = string | number | boolean | null | undefined

export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>

export interface RequestOptions {
    signal?: AbortSignal
    headers?: HeadersInit
    /** Explicit token for server requests; null disables the stored browser token. */
    token?: string | null
    /** API origin, optionally with a path prefix. Defaults to NEXT_PUBLIC_API_URL. */
    baseUrl?: string
}

export interface HttpOptions extends RequestOptions {
    query?: QueryParams
    auth?: boolean
}
