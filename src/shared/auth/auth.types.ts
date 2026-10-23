import type { Manager } from '@/api/managers/managers.types'

export type AuthStatus =
    | 'loading'
    | 'anonymous'
    | 'authenticated'
    | 'forbidden'
    | 'error'

export interface AuthContextValue {
    status: AuthStatus
    manager: Manager | null
    error: Error | null
    isRefreshing: boolean
    refreshSession: () => Promise<void>
    logout: () => Promise<void>
}

/** Roles are extensible in the backend; these are the built-in names. */
export const MANAGER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    SENDER: 'sender',
} as const
