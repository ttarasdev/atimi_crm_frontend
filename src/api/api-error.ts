function errorMessages(data: unknown): string[] {
    if (typeof data !== 'object' || data === null || !('message' in data)) {
        return []
    }

    const message = data.message

    if (typeof message === 'string') return [message]

    if (Array.isArray(message)) {
        return message.filter(
            (value): value is string => typeof value === 'string',
        )
    }

    return []
}

export class ApiError extends Error {
    readonly messages: string[]

    constructor(
        readonly status: number,
        readonly data: unknown,
        readonly url: string,
    ) {
        const messages = errorMessages(data)

        super(messages.length ? messages.join('\n') : `HTTP ${status}`)

        this.name = 'ApiError'

        this.messages = messages
    }
}

/** A successful response that could not be decoded as JSON. */
export class ApiResponseError extends Error {
    constructor(
        readonly status: number,
        readonly url: string,
    ) {
        super(`Expected a JSON response from ${url}`)

        this.name = 'ApiResponseError'
    }
}
