import type { Metadata } from 'next'
import { MailTemplateLibrary } from '@/features/mail/mail-template-library/MailTemplateLibrary'

export const metadata: Metadata = { title: 'Szablony e-mail' }

export default function Page() {
    return <MailTemplateLibrary />
}
