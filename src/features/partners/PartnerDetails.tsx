'use client'

import { Handshake, MapPin, Star, UserRound } from 'lucide-react'
import type { Partner } from '@/api/partners/partners.types'
import { Button } from '@/components/ui/button/Button'
import { usePartner } from '@/shared/hooks/usePartners'
import { PartnerContacts } from './PartnerContacts'
import { partnerCategoryLabel } from './partner-labels'
import c from './PartnersPage.module.scss'

export function PartnerDetails({
    id,
    onEdit,
}: {
    id: number
    onEdit?: (partner: Partner) => void
}) {
    const query = usePartner(id)

    if (query.isPending) return <p className={c.state}>Wczytywanie kontaktu…</p>

    if (query.isError)
        return (
            <div className={c.state} role="alert">
                <p>Nie udało się wczytać kontaktu.</p>
                <Button onClick={() => void query.refetch()}>
                    Spróbuj ponownie
                </Button>
            </div>
        )

    const partner = query.data

    return (
        <div className={c.details}>
            <div className={c.detailsHeading}>
                <span className={c.icon}>
                    <Handshake size={24} aria-hidden />
                </span>
                <div>
                    <h3>{partner.name}</h3>
                    <p>{partnerCategoryLabel(partner.category)}</p>
                </div>
            </div>
            {(partner.isFeatured || !partner.isActive) && (
                <div className={c.badges}>
                    {partner.isFeatured && (
                        <span>
                            <Star size={12} aria-hidden />
                            Polecany
                        </span>
                    )}
                    {!partner.isActive && (
                        <span className={c.archived}>Archiwum</span>
                    )}
                </div>
            )}
            {partner.contactPerson && (
                <p className={c.detailRow}>
                    <UserRound size={16} aria-hidden />
                    <span>{partner.contactPerson}</span>
                </p>
            )}
            {(partner.city || partner.address) && (
                <p className={c.detailRow}>
                    <MapPin size={16} aria-hidden />
                    <span>
                        {[partner.city, partner.address]
                            .filter(Boolean)
                            .join(', ')}
                    </span>
                </p>
            )}
            <PartnerContacts partner={partner} />
            {partner.notes && (
                <section className={c.notes}>
                    <h4>Informacje dla zespołu</h4>
                    <p>{partner.notes}</p>
                </section>
            )}
            {onEdit && (
                <Button onClick={() => onEdit(partner)}>
                    Edytuj dane partnera
                </Button>
            )}
        </div>
    )
}
