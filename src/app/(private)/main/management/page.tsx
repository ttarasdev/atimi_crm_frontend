import type { Metadata } from 'next'
import { ManagementPage } from '@/features/management/ManagementPage'

export const metadata: Metadata = { title: 'Zarządzanie' }

export default function Page() {
    return <ManagementPage />
}
