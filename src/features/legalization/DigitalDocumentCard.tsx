'use client'

import { useId, type ReactNode } from 'react'
import {
    BadgeCheck,
    CalendarDays,
    CircleAlert,
    Clock3,
    ShieldCheck,
} from 'lucide-react'
import type {
    DocumentCard,
    LegalizationProfile,
} from '@/api/legalization/legalization.types'
import c from './DigitalDocumentCard.module.scss'

interface DigitalDocumentCardProps {
    card: DocumentCard
    client: { name: string; surname?: string | null }
    profile?: LegalizationProfile
    isCurrent?: boolean
    children?: ReactNode
}

const visuals: Record<
    string,
    { variant: string; category: string; motif: string }
> = {
    temporary_residence: {
        variant: 'residence',
        category: 'Dokument pobytowy',
        motif: 'P',
    },
    permanent_residence: {
        variant: 'permanent',
        category: 'Dokument pobytowy',
        motif: 'P',
    },
    eu_resident: {
        variant: 'resident',
        category: 'Rezydent długoterminowy',
        motif: 'UE',
    },
    visa: { variant: 'visa', category: 'Dokument wjazdowy', motif: 'VISA' },
    passport: {
        variant: 'passport',
        category: 'Dokument tożsamości',
        motif: '',
    },
    travel_document: {
        variant: 'travel',
        category: 'Dokument podróży',
        motif: '↗',
    },
    work_permit: {
        variant: 'work',
        category: 'Dokument zatrudnienia',
        motif: 'PRACA',
    },
    blue_card: { variant: 'blue', category: 'Dokument pobytowy', motif: 'UE' },
    polish_card: {
        variant: 'polish',
        category: 'Dokument pochodzenia',
        motif: 'PL',
    },
    citizenship: {
        variant: 'citizenship',
        category: 'Status klienta',
        motif: '',
    },
    permanent_status: {
        variant: 'status',
        category: 'Status pobytowy',
        motif: '∞',
    },
    eu_resident_status: {
        variant: 'residentStatus',
        category: 'Status pobytowy',
        motif: 'UE',
    },
    pesel: { variant: 'pesel', category: 'Dane ewidencyjne', motif: '#' },
}

function dateLabel(value?: string): string {
    if (!value) return '—'

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)

    return match ? `${match[3]}.${match[2]}.${match[1]}` : value
}

function DocumentOrnament({ id, passport }: { id: string; passport: boolean }) {
    return (
        <svg
            className={c.ornament}
            viewBox="0 0 600 380"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <pattern
                    id={id}
                    width="64"
                    height="42"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(-18)"
                >
                    <path
                        d="M-32 21C-16-7 16-7 32 21S80 49 96 21M-32 27C-16-1 16-1 32 27S80 55 96 27"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth=".6"
                    />
                </pattern>
            </defs>
            <rect width="600" height="380" fill={`url(#${id})`} opacity=".35" />
            <g fill="none" stroke="currentColor" strokeWidth=".8" opacity=".65">
                {Array.from({ length: 13 }, (_, index) => (
                    <ellipse
                        key={index}
                        cx="490"
                        cy="168"
                        rx={56 + index * 10}
                        ry={35 + index * 7}
                        transform="rotate(-25 490 168)"
                    />
                ))}
                <path d="M-90 290C100 40 260 500 690 170M-90 297C100 47 260 507 690 177M-90 304C100 54 260 514 690 184" />
            </g>
            {passport && (
                <g
                    className={c.globe}
                    transform="translate(300 170)"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                >
                    <circle r="57" />
                    <ellipse rx="25" ry="57" />
                    <path d="M-57 0H57M-49-28H49M-49 28H49M0-57V57" />
                    <path
                        d="M-75-8C-32-70 51-62 77-16M-75 8C-32 70 51 62 77 16"
                        opacity=".5"
                    />
                </g>
            )}
        </svg>
    )
}

export function DigitalDocumentCard({
    card,
    client,
    profile,
    isCurrent = false,
    children,
}: DigitalDocumentCardProps) {
    const id = useId().replaceAll(':', '')

    const visual = visuals[card.type.code] ?? {
        variant: 'residence',
        category: 'Dokument klienta',
        motif: '',
    }

    const fullName =
        [client.name, client.surname].filter(Boolean).join(' ').trim() || '—'

    const number =
        card.number ||
        (card.type.code === 'pesel' ? profile?.pesel : undefined) ||
        '—'

    const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Warsaw',
    }).format(new Date())

    const daysLeft = card.expiresAt
        ? Math.round(
              (Date.parse(`${card.expiresAt.slice(0, 10)}T00:00:00Z`) -
                  Date.parse(`${today}T00:00:00Z`)) /
                  86400000,
          )
        : undefined

    const expired =
        card.status === 'active' && daysLeft !== undefined && daysLeft < 0

    const expiring =
        card.status === 'active' &&
        daysLeft !== undefined &&
        daysLeft >= 0 &&
        daysLeft <= 90

    const validity =
        card.status === 'replaced'
            ? 'Zastąpiony dokument'
            : card.status === 'archived'
              ? 'Dokument w archiwum'
              : expired
                ? 'Ważność dokumentu upłynęła'
                : daysLeft === 0
                  ? 'Ważny do dzisiaj'
                  : expiring
                    ? `Termin ważności za ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}`
                    : !card.expiresAt && !card.type.requiresExpiry
                      ? 'Bezterminowo'
                      : card.expiresAt
                        ? 'Dokument w ewidencji'
                        : 'Nie podano terminu ważności'

    const details = [
        ['Obywatelstwo', profile?.citizenship],
        [
            'Data urodzenia',
            profile?.birthDate ? dateLabel(profile.birthDate) : undefined,
        ],
        ['Data wydania', card.issuedAt ? dateLabel(card.issuedAt) : undefined],
        ['Kraj wydania', card.issuingCountry],
        ['Organ wydający', card.issuingAuthority],
    ].filter((entry) => entry[1])

    return (
        <article
            className={`${c.record} ${c[visual.variant] ?? ''} ${card.status !== 'active' ? c.inactive : ''}`}
            data-document-type={card.type.code}
            data-card-id={card.id}
            aria-label={`${card.type.title} — ${fullName}`}
        >
            <div className={c.face}>
                <DocumentOrnament
                    id={`atimi-document-${id}`}
                    passport={visual.variant === 'passport'}
                />
                <span className={c.edge} aria-hidden="true" />
                <span className={c.foil} aria-hidden="true">
                    <span />
                </span>
                {visual.motif && (
                    <span className={c.motif} aria-hidden="true">
                        {visual.motif}
                    </span>
                )}
                <div className={c.brandLine}>
                    <span className={c.brand}>
                        ATIMI<span aria-hidden="true"> / </span>
                        <span>KARTA CYFROWA</span>
                    </span>
                    {isCurrent && card.status === 'active' && (
                        <span
                            className={c.basis}
                            title="Podstawa pobytu wskazana przez opiekuna klienta"
                        >
                            <ShieldCheck size={11} aria-hidden />
                            Podstawa pobytu
                        </span>
                    )}
                </div>
                <header className={c.documentHeading}>
                    <p>{visual.category}</p>
                    <h3>{card.type.title}</h3>
                </header>
                <dl className={c.identity}>
                    <div>
                        <dt>Imię i nazwisko</dt>
                        <dd>{fullName}</dd>
                    </div>
                </dl>
                <dl className={c.coreFields}>
                    <div>
                        <dt>
                            {card.type.code === 'pesel'
                                ? 'Numer PESEL'
                                : 'Numer dokumentu'}
                        </dt>
                        <dd className={c.number}>{number}</dd>
                    </div>
                    <div className={c.expiration}>
                        <dt>
                            {!card.expiresAt && !card.type.requiresExpiry
                                ? 'Ważność'
                                : 'Ważny do'}
                        </dt>
                        <dd>
                            {card.expiresAt ? (
                                <time dateTime={card.expiresAt}>
                                    {dateLabel(card.expiresAt)}
                                </time>
                            ) : card.type.requiresExpiry ? (
                                '—'
                            ) : (
                                'Bezterminowo'
                            )}
                        </dd>
                    </div>
                </dl>
                <span className={c.faceCaption}>
                    Cyfrowy zapis dokumentu w CRM
                </span>
            </div>
            <div
                className={`${c.validity} ${expired ? c.expired : expiring ? c.expiring : ''}`}
            >
                {expired ? (
                    <CircleAlert size={14} aria-hidden />
                ) : expiring ? (
                    <Clock3 size={14} aria-hidden />
                ) : card.status !== 'active' ? (
                    <CalendarDays size={14} aria-hidden />
                ) : (
                    <BadgeCheck size={14} aria-hidden />
                )}
                <span>{validity}</span>
            </div>
            {details.length > 0 && (
                <dl className={c.details}>
                    {details.map(([label, value]) => (
                        <div
                            key={label}
                            className={label === 'Organ wydający' ? c.wide : ''}
                        >
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {children && <div className={c.actions}>{children}</div>}
        </article>
    )
}
