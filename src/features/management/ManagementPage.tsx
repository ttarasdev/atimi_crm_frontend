'use client'

import Link from 'next/link'
import {
    ArrowRight,
    BriefcaseBusiness,
    CalendarDays,
    CreditCard,
    FileText,
    Globe,
    Layers3,
    Mail,
    Shapes,
    SlidersHorizontal,
} from 'lucide-react'
import { managementSections } from '@/features/crm/catalog'
import { useRoles } from '@/shared/hooks/useRoles'
import c from './ManagementPage.module.scss'

const details = {
    '/main/management/stages': {
        icon: Layers3,
        description:
            'Etapy obsługi z zadaniami, notatkami i dokumentami do wykorzystania w sprawach klientów.',
    },
    '/main/management/processes': {
        icon: BriefcaseBusiness,
        description:
            'Gotowe ścieżki legalizacji z uporządkowanymi etapami. Wybierzesz je przy tworzeniu sprawy.',
    },
    '/main/management/document-cards': {
        icon: CreditCard,
        description:
            'Rodzaje dokumentów i statusów oraz domyślne terminy przypomnień o końcu ich ważności.',
    },
    '/main/management/icons': {
        icon: Shapes,
        description:
            'Wspólna biblioteka ikon używanych w etapach spraw i typach zadań.',
    },
    '/main/management/calendar': {
        icon: CalendarDays,
        description:
            'Typy wydarzeń i zadań, ich kolory oraz domyślne przypomnienia kalendarza.',
    },
    '/main/management/email-templates': {
        icon: Mail,
        description:
            'Wspólne treści wiadomości i wygląd e-maili wysyłanych przez zespół.',
    },
    '/main/management/document-templates': {
        icon: FileText,
        description:
            'Szablony DOCX, rodzaje dokumentów i własne pola. Generuj dokumenty z danych klienta.',
    },
    '/main/management/website': {
        icon: Globe,
        description:
            'Opinie klientów i filmy publikowane na stronie Atlantis w dostępnych wersjach językowych.',
    },
} as const

export function ManagementPage() {
    const { hasAnyRole, hasRole } = useRoles()

    const sections = managementSections.filter(
        (section) => !section.roles || hasAnyRole(section.roles),
    )

    return (
        <section className={c.page} aria-label="Zarządzanie CRM">
            <header className={c.header}>
                <h1>
                    <SlidersHorizontal size={23} aria-hidden />
                    Zarządzanie
                </h1>
                <p>
                    {hasRole('admin')
                        ? 'Przygotuj wspólne szablony i ustawienia, które ułatwią zespołowi codzienną obsługę klientów.'
                        : 'Przeglądaj wspólne szablony i materiały wykorzystywane podczas obsługi klientów.'}
                </p>
            </header>
            <div className={c.grid}>
                {sections.map((section) => {
                    const info = details[section.path as keyof typeof details]

                    const Icon = info?.icon ?? SlidersHorizontal

                    return (
                        <Link
                            key={section.path}
                            href={section.path}
                            className={c.card}
                        >
                            <span className={c.icon}>
                                <Icon size={23} aria-hidden />
                            </span>
                            <h2>{section.title}</h2>
                            <p>{info?.description}</p>
                            <span className={c.open}>
                                Otwórz
                                <ArrowRight size={15} aria-hidden />
                            </span>
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
