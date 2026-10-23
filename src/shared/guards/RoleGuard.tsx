'use client'

import type { ReactNode } from 'react'
import { useRoles } from '../hooks/useRoles'
import { AccessState } from '@/components/feedback/AccessState'

export function RoleGuard({
    children,
    allowedRoles,
}: {
    children: ReactNode
    allowedRoles: readonly string[]
}) {
    const { isReady, hasAnyRole } = useRoles()

    if (!isReady) return null

    if (!hasAnyRole(allowedRoles))
        return (
            <AccessState title="Brak uprawnień">
                <p>Nie masz dostępu do tej sekcji.</p>
            </AccessState>
        )

    return children
}
