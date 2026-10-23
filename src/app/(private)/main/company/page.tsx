import type { Metadata } from 'next'
import { CompanySettingsPage } from '@/features/company/company-settings/CompanySettingsPage'

export const metadata: Metadata = { title: 'Dane firmy' }

export default function Page() {
    return <CompanySettingsPage />
}
