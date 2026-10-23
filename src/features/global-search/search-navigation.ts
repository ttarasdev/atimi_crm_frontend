import type { SearchItem } from '@/api/search/search.types'

const sections: Record<string, string> = {
    dashboard: '/main',
    clients: '/main/clients',
    leads: '/main/leads',
    tasks: '/main/tasks',
    calendar: '/main/calendar',
    documents: '/main/documents',
    notes: '/main/notes',
    partners: '/main/partners',
    mail: '/main/mail',
    company: '/main/company',
    profile: '/main/profile',
    reports: '/main/reports',
    employees: '/main/managers',
}

export function searchDestination(item: SearchItem) {
    switch (item.type) {
        case 'client':
            return `/main/clients/${item.id}`

        case 'case':
            return `/main/clients/${item.clientId}?processId=${item.id}`

        case 'stage':
            return `/main/clients/${item.clientId}?processId=${item.processId}&stageId=${item.id}`

        case 'note':
            return item.kind === 'manager'
                ? `/main/notes?noteId=${item.id}`
                : item.kind === 'stage'
                  ? `/main/clients/${item.clientId}?processId=${item.processId}&stageId=${item.stageId}&stageNoteId=${item.id}`
                  : `/main/clients/${item.clientId}?tab=notes&noteId=${item.id}`

        case 'lead':
            return `/main/leads?leadId=${item.id}`

        case 'partner':
            return `/main/partners?partnerId=${item.id}`

        case 'employee':
            return `/main/managers?managerId=${item.id}`

        case 'template':
            return `/main/management/${item.kind === 'process' ? 'processes' : item.kind === 'stage' ? 'stages' : 'document-templates'}?templateId=${item.id}`

        case 'section':
            return sections[item.key ?? ''] ?? null

        case 'document':
            return null
    }
}
