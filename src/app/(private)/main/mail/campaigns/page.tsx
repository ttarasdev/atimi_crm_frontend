import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MailCampaignsPage } from '@/features/mail/mail-campaigns/MailCampaignsPage'

export const metadata: Metadata = { title: 'Rozsyłki e-mail' }

export default function Page() {
    return (
        <Suspense fallback={<p>Wczytywanie rozsyłek…</p>}>
            <MailCampaignsPage />
        </Suspense>
    )
}
