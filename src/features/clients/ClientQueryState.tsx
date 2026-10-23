'use client'

import { Button } from '@/components/ui/button/Button'
import c from './Clients.module.scss'

export function ClientQueryState({
    pending,
    error,
    empty,
    onRetry,
    emptyTitle = 'Brak wpisów.',
}: {
    pending: boolean
    error: boolean
    empty: boolean
    onRetry: () => void
    emptyTitle?: string
}) {
    if (pending) return <p className={c.state}>Wczytywanie…</p>

    if (error)
        return (
            <div className={c.state} role="alert">
                <p>Nie udało się wczytać danych.</p>
                <Button className={c.secondary} onClick={onRetry}>
                    Spróbuj ponownie
                </Button>
            </div>
        )

    if (empty) return <p className={c.state}>{emptyTitle}</p>

    return null
}
