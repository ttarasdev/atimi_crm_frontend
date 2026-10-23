'use client'

import type { ReactNode } from 'react'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { useClientSubmit } from './useClientSubmit'
import c from './Clients.module.scss'

export function ClientConfirmForm({
    message,
    onConfirm,
    onSaved,
    onCancel,
    onPendingChange,
    submitTitle = 'Potwierdź',
    children,
}: {
    message: string
    onConfirm: (signal: AbortSignal) => Promise<unknown>
    onSaved: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
    submitTitle?: string
    children?: ReactNode
}) {
    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Potwierdzenie operacji"
            isPending={submit.pending}
            error={submit.error}
            submitTitle={submitTitle}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    await onConfirm(signal)

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <p className={c.hint}>{message}</p>
            {children}
        </FormContainer>
    )
}
