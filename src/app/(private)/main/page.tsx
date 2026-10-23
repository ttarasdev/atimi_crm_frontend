import type { Metadata } from 'next'
import { DashboardPage } from '@/features/overview/DashboardPage'

export const metadata: Metadata = { title: 'Pulpit' }

export default function Page() {
    return <DashboardPage />
}
