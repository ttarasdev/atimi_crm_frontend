import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MailComposer } from '@/features/mail/mail-composer/MailComposer'

export const metadata: Metadata = { title: 'Poczta' }

export default function Page() {
    return (
        <Suspense fallback={<p>Wczytywanie poczty…</p>}>
            <MailComposer />
        </Suspense>
    )
}
