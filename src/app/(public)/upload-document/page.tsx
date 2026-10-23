import type { Metadata } from 'next'
import { PublicDocumentUpload } from '@/features/document-requests/PublicDocumentUpload'

export const metadata: Metadata = {
    title: 'Prześlij dokument',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
}

export default function UploadDocumentPage() {
    return <PublicDocumentUpload />
}
