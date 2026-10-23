import { ExternalLink, Mail, Phone } from 'lucide-react'
import type { Partner } from '@/api/partners/partners.types'
import {
    partnerEmailHref,
    partnerPhoneHref,
    partnerWebsiteHref,
} from './partner-labels'
import c from './PartnersPage.module.scss'

export function PartnerContacts({
    partner,
    compact = false,
}: {
    partner: Partner
    compact?: boolean
}) {
    const phone = partnerPhoneHref(partner.phone)

    const additionalPhone = partnerPhoneHref(partner.additionalPhone)

    const email = partnerEmailHref(partner.email)

    const website = partnerWebsiteHref(partner.website)

    return (
        <div className={c.contacts}>
            {phone && (
                <a
                    href={phone}
                    aria-label={`Zadzwoń: ${partner.name}, ${partner.phone}`}
                >
                    <Phone size={14} aria-hidden />
                    <span>{partner.phone}</span>
                </a>
            )}
            {(!compact || !phone) && additionalPhone && (
                <a
                    href={additionalPhone}
                    aria-label={`Drugi telefon: ${partner.name}, ${partner.additionalPhone}`}
                >
                    <Phone size={14} aria-hidden />
                    <span>{partner.additionalPhone}</span>
                </a>
            )}
            {email && (
                <a href={email} aria-label={`Napisz e-mail: ${partner.name}`}>
                    <Mail size={14} aria-hidden />
                    <span>{compact ? 'E-mail' : partner.email}</span>
                </a>
            )}
            {website && (
                <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Strona internetowa: ${partner.name}`}
                >
                    <ExternalLink size={14} aria-hidden />
                    <span>
                        {compact ? 'Strona' : new URL(website).hostname}
                    </span>
                </a>
            )}
            {!phone && !email && !website && !additionalPhone && (
                <p className={c.hint}>Brak danych kontaktowych.</p>
            )}
        </div>
    )
}
