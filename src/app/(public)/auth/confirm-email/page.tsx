import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ConfirmEmailForm } from '@/components/auth-components/confirm-email-form/ConfirmEmailForm'

export const metadata: Metadata = { title: 'Potwierdź e-mail' }

export default function Page() {
    return (
        <Suspense>
            <ConfirmEmailForm />
        </Suspense>
    )
}
