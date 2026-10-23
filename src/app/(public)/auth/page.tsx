import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth-components/login-form/LoginForm'

export const metadata: Metadata = { title: 'Logowanie' }

export default function Page() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
