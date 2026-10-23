import type { Metadata } from 'next'
import { Suspense } from 'react'
import { EmailRequestForm } from '@/components/auth-components/email-request-form/EmailRequestForm'

export const metadata: Metadata = { title: 'Odzyskaj hasło' }

export default function Page() {
    return (
        <Suspense>
            <EmailRequestForm />
        </Suspense>
    )
}
