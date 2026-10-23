import type { Metadata } from 'next'
import { DocumentsLibrary } from '@/features/documents/documents-library/DocumentsLibrary'

export const metadata: Metadata = { title: 'Dokumenty' }

export default function Page() {
    return <DocumentsLibrary />
}
