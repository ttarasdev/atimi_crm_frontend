import type { ReactNode } from 'react'
import { AuthGuard } from '@/shared/guards/AuthGuard'
import { AppShell } from '@/components/layout-components/app-shell/AppShell'

export default function PrivateLayout({ children }: { children: ReactNode }) {
    return (
        <AuthGuard>
            <AppShell>{children}</AppShell>
        </AuthGuard>
    )
}
