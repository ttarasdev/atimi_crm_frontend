export const ACCESS_TOKEN_STORAGE_KEY = 'atimi:access_token'

const TOKEN_EVENT = 'atimi:access-token-changed'

export function subscribeAccessToken(listener: () => void): () => void {
    const onStorage = (event: StorageEvent) => {
        if (event.key === ACCESS_TOKEN_STORAGE_KEY || event.key === null)
            listener()
    }

    window.addEventListener(TOKEN_EVENT, listener)

    window.addEventListener('storage', onStorage)

    return () => {
        window.removeEventListener(TOKEN_EVENT, listener)

        window.removeEventListener('storage', onStorage)
    }
}

/** Browser storage only. Server callers must pass options.token per request. */
export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null

    try {
        return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    } catch {
        return null
    }
}

export function setAccessToken(token: string): void {
    if (typeof window === 'undefined') {
        throw new Error('setAccessToken is only available in the browser')
    }

    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)

    window.dispatchEvent(new Event(TOKEN_EVENT))
}

export function clearAccessToken(): void {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)

        window.dispatchEvent(new Event(TOKEN_EVENT))
    }
}
