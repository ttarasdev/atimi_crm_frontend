'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clearAccessToken } from '@/api/auth-token'
import { useAuth } from '../hooks/useAuth'
import { getSafeReturnPath, routes } from '../config/routes'
import { AccessState } from '@/components/feedback/AccessState'
import { Button } from '@/components/ui/button/Button'

export function AuthGuard({ children }: { children: ReactNode }) {
    const { status, refreshSession, isRefreshing } = useAuth()

    const pathname = usePathname()

    const router = useRouter()

    const [retrying, setRetrying] = useState(false)

    useEffect(() => {
        if (status === 'anonymous')
            router.replace(
                `${routes.auth}?next=${encodeURIComponent(getSafeReturnPath(pathname + window.location.search + window.location.hash))}`,
            )
    }, [status, pathname, router])

    if (status === 'authenticated') return children

    if (status === 'error' || status === 'forbidden')
        return (
            <AccessState
                title={
                    status === 'forbidden'
                        ? 'Brak dostępu do CRM'
                        : 'Nie można sprawdzić sesji'
                }
            >
                <p>
                    {status === 'forbidden'
                        ? 'Skontaktuj się z administratorem, aby sprawdzić dostęp do konta.'
                        : 'Sprawdź połączenie z internetem i spróbuj ponownie.'}
                </p>
                <Button
                    pending={retrying || isRefreshing}
                    onClick={async () => {
                        setRetrying(true)

                        try {
                            await refreshSession()
                        } finally {
                            setRetrying(false)
                        }
                    }}
                >
                    Spróbuj ponownie
                </Button>
                <Button onClick={() => clearAccessToken()}>
                    Wróć do logowania
                </Button>
            </AccessState>
        )

    return (
        <AccessState title="Sprawdzanie sesji…">
            <p role="status">Za chwilę otworzymy Twoją przestrzeń pracy.</p>
        </AccessState>
    )
}
