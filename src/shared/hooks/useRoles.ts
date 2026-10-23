'use client'

import { useMemo } from 'react'
import { hasAllRoles, hasAnyRole } from '../auth/permissions'
import { useAuth } from './useAuth'

export function useRoles() {
    const { manager, status } = useAuth()

    const roles = useMemo(
        () => manager?.roles?.map((role) => role.name) ?? [],
        [manager],
    )

    const authenticated = status === 'authenticated'

    return {
        roles,
        isReady: authenticated,

        hasRole: (role: string) =>
            authenticated && roles.some((value) => value === role),

        hasAnyRole: (allowed: readonly string[]) =>
            authenticated && hasAnyRole(roles, allowed),

        hasAllRoles: (required: readonly string[]) =>
            authenticated && hasAllRoles(roles, required),
    }
}
