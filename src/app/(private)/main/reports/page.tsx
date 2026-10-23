import type { Metadata } from 'next'
import { StatisticsPage } from '@/features/overview/StatisticsPage'

export const metadata: Metadata = { title: 'Raporty' }

export default function Page() {
    return <StatisticsPage />
}
