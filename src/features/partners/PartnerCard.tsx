import {
    Archive,
    ArchiveRestore,
    Handshake,
    MapPin,
    Pencil,
    Star,
} from 'lucide-react'
import type { Partner } from '@/api/partners/partners.types'
import { ActionMenu } from '@/components/ui/action-menu/ActionMenu'
import { PartnerContacts } from './PartnerContacts'
import { partnerCategoryLabel } from './partner-labels'
import c from './PartnersPage.module.scss'

export function PartnerCard({
    partner,
    admin,
    disabled,
    onOpen,
    onEdit,
    onArchive,
    onFeature,
}: {
    partner: Partner
    admin: boolean
    disabled: boolean
    onOpen: () => void
    onEdit: () => void
    onArchive: () => void
    onFeature: () => void
}) {
    return (
        <article
            className={`${c.card} ${partner.isFeatured ? c.featured : ''}`}
            aria-label={`Partner: ${partner.name}`}
        >
            <header>
                <span className={c.icon}>
                    <Handshake size={21} aria-hidden />
                </span>
                <div className={c.cardTitle}>
                    <button className={c.name} type="button" onClick={onOpen}>
                        {partner.name}
                    </button>
                    <span>{partnerCategoryLabel(partner.category)}</span>
                </div>
                {admin && (
                    <ActionMenu
                        label={`Opcje partnera ${partner.name}`}
                        disabled={disabled}
                        items={[
                            {
                                label: 'Edytuj',
                                icon: <Pencil size={15} />,
                                onSelect: onEdit,
                            },
                            {
                                label: partner.isFeatured
                                    ? 'Usuń polecenie'
                                    : 'Poleć partnera',
                                icon: <Star size={15} />,
                                onSelect: onFeature,
                            },
                            {
                                label: partner.isActive
                                    ? 'Archiwizuj'
                                    : 'Przywróć',
                                icon: partner.isActive ? (
                                    <Archive size={15} />
                                ) : (
                                    <ArchiveRestore size={15} />
                                ),
                                onSelect: onArchive,
                            },
                        ]}
                    />
                )}
            </header>
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
                <p className={c.person}>{partner.contactPerson}</p>
            )}
            {partner.city && (
                <p className={c.city}>
                    <MapPin size={13} aria-hidden />
                    {partner.city}
                </p>
            )}
            {partner.notes && <p className={c.excerpt}>{partner.notes}</p>}
            <PartnerContacts partner={partner} compact />
            <button className={c.detailsButton} type="button" onClick={onOpen}>
                Szczegóły kontaktu
            </button>
        </article>
    )
}
