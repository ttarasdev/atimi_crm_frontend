'use client'

import { useEffect, useRef } from 'react'
import type { Manager } from '@/api/managers/managers.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { useSetManagerStatus } from '@/shared/hooks/useManagers'

export function ManagerStatusForm({
    manager,
    status,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    manager: Manager
    status: 'active' | 'blocked' | 'archived'
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const update = useSetManagerStatus()

    const controller = useRef<AbortController | null>(null)

    useEffect(() => {
        onPendingChange(update.isPending)
    }, [update.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    return (
        <FormContainer
            aria-label="Zmiana statusu pracownika"
            submitTitle={
                status === 'active'
                    ? 'Przywróć dostęp'
                    : status === 'blocked'
                      ? 'Zablokuj konto'
                      : 'Archiwizuj konto'
            }
            isPending={update.isPending}
            onCancel={onCancel}
            error={
                update.isError
                    ? 'Nie udało się zmienić statusu. Spróbuj ponownie.'
                    : undefined
            }
            onSubmit={() => {
                controller.current = new AbortController()

                update.mutate(
                    {
                        id: manager.id,
                        status,
                        signal: controller.current.signal,
                    },
                    {
                        onSuccess: () => {
                            onPendingChange(false)

                            onSuccess()
                        },
                    },
                )
            }}
        >
            <p>
                <strong>
                    {manager.name} {manager.surname}
                </strong>
            </p>
            <p>
                {status === 'active'
                    ? 'Pracownik ponownie będzie mógł korzystać z CRM i otrzymywać włączone powiadomienia kalendarza.'
                    : 'Pracownik straci dostęp do CRM i nie będzie otrzymywać powiadomień kalendarza. Jego klienci i sprawy pozostaną dostępne dla administratora.'}
            </p>
            <p>Dotychczasowe sesje logowania zostaną zakończone.</p>
        </FormContainer>
    )
}
