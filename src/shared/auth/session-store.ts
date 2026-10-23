import { getAccessToken } from '../../api/auth-token'

export interface SessionSnapshot {
    token: string | null
    revision: number
    initialized: boolean
}

const serverSnapshot: SessionSnapshot = {
    token: null,
    revision: 0,
    initialized: false,
}

let browserSnapshot = serverSnapshot

export function getServerSessionSnapshot(): SessionSnapshot {
    return serverSnapshot
}

export function getSessionSnapshot(): SessionSnapshot {
    if (typeof window === 'undefined') return serverSnapshot

    const token = getAccessToken()

    if (!browserSnapshot.initialized || browserSnapshot.token !== token) {
        browserSnapshot = {
            token,
            revision: browserSnapshot.revision + 1,
            initialized: true,
        }
    }

    return browserSnapshot
}
