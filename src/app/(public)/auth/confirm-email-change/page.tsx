import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ConfirmManagerChangeForm } from '@/components/auth-components/confirm-manager-change-form/ConfirmManagerChangeForm'

export const metadata: Metadata = {
    title: 'Potwierdź zmianę e-maila',
    referrer: 'no-referrer',
}

export default function Page() {
    return (
        <Suspense>
            <ConfirmManagerChangeForm operation="email" />
        </Suspense>
    )
}
