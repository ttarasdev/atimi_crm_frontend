import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth-components/reset-password-form/ResetPasswordForm'

export const metadata: Metadata = { title: 'Nowe hasło' }

export default function Page() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    )
}
