import type { Metadata } from 'next'
import { DocumentCardTypesPage } from '@/features/legalization/DocumentCardTypesPage'

export const metadata: Metadata = { title: 'Karty dokumentów' }

export default function Page() {
    return <DocumentCardTypesPage />
}
