import type { ManagerRole } from '@/api/managers/managers.types'

export interface CrmSection {
    path: string
    title: string
    icon: string
    group: string
    roles: readonly ManagerRole[]
}

const team: readonly ManagerRole[] = ['admin', 'manager']

export const sections: readonly CrmSection[] = [
    {
        path: '/main',
        title: 'Pulpit',
        icon: 'dashboard',
        group: 'PRZESTRZEŃ PRACY',
        roles: team,
    },
    {
        path: '/main/clients',
        title: 'Klienci',
        icon: 'clients',
        group: 'PRZESTRZEŃ PRACY',
        roles: team,
    },
    {
        path: '/main/leads',
        title: 'Leady',
        icon: 'leads',
        group: 'PRZESTRZEŃ PRACY',
        roles: team,
    },
    {
        path: '/main/tasks',
        title: 'Zadania',
        icon: 'tasks',
        group: 'ORGANIZACJA',
        roles: ['admin', 'manager', 'sender'],
    },
    {
        path: '/main/calendar',
        title: 'Kalendarz',
        icon: 'calendar',
        group: 'ORGANIZACJA',
        roles: team,
    },
    {
        path: '/main/mail',
        title: 'Poczta',
        icon: 'mail',
        group: 'ORGANIZACJA',
        roles: ['admin', 'manager', 'sender'],
    },
    {
        path: '/main/mail/campaigns',
        title: 'Rozsyłki',
        icon: 'mail',
        group: 'ORGANIZACJA',
        roles: ['admin', 'sender'],
    },
    {
        path: '/main/documents',
        title: 'Dokumenty',
        icon: 'documents',
        group: 'ORGANIZACJA',
        roles: team,
    },
    {
        path: '/main/notes',
        title: 'Notatki',
        icon: 'notes',
        group: 'ORGANIZACJA',
        roles: team,
    },
    {
        path: '/main/reports',
        title: 'Raporty',
        icon: 'reports',
        group: 'FIRMA',
        roles: ['admin'],
    },
    {
        path: '/main/partners',
        title: 'Partnerzy',
        icon: 'partners',
        group: 'FIRMA',
        roles: team,
    },
    {
        path: '/main/managers',
        title: 'Pracownicy',
        icon: 'managers',
        group: 'FIRMA',
        roles: ['admin'],
    },
    {
        path: '/main/management',
        title: 'Zarządzanie',
        icon: 'management',
        group: 'FIRMA',
        roles: team,
    },
    {
        path: '/main/company',
        title: 'Dane firmy',
        icon: 'company',
        group: 'FIRMA',
        roles: team,
    },
]

export const managementSections: readonly {
    path: string
    title: string
    roles?: readonly ManagerRole[]
}[] = [
    { path: '/main/management/stages', title: 'Konstruktor etapów' },
    { path: '/main/management/processes', title: 'Szablony spraw' },
    { path: '/main/management/document-cards', title: 'Karty dokumentów' },
    { path: '/main/management/icons', title: 'Galeria ikon' },
    { path: '/main/management/calendar', title: 'Kalendarz' },
    {
        path: '/main/management/email-templates',
        title: 'Szablony wiadomości',
        roles: ['admin'],
    },
    {
        path: '/main/management/document-templates',
        title: 'Szablony dokumentów',
    },
    {
        path: '/main/management/website',
        title: 'Strona internetowa',
        roles: ['admin'],
    },
]

export function sectionForPath(path: string) {
    const section =
        sections.find((section) => section.path === path) ??
        sections
            .filter(
                (section) =>
                    section.path !== '/main' &&
                    path.startsWith(`${section.path}/`),
            )
            .sort((left, right) => right.path.length - left.path.length)[0]

    const management = managementSections.find(
        (item) => path === item.path || path.startsWith(`${item.path}/`),
    )

    return section && management?.roles
        ? { ...section, roles: management.roles }
        : section
}
