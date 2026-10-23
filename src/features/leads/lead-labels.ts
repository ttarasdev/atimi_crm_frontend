import type { LeadSource, LeadStatus } from '@/api/leads/leads.types'

export const leadSources: Record<LeadSource, string> = {
    website: 'Strona internetowa',
    instagram: 'Instagram',
    facebook: 'Facebook',
    manual: 'Ręcznie',
    other: 'Inne',
}

export const leadStatuses: Record<
    LeadStatus,
    { title: string; color: string }
> = {
    new: { title: 'Nowy', color: '#4676B4' },
    contacted: { title: 'Po kontakcie', color: '#9075B6' },
    qualified: { title: 'Zainteresowany', color: '#469487' },
    lost: { title: 'Odrzucony', color: '#BD6A78' },
    converted: { title: 'Klient', color: '#469487' },
}

export const leadLanguages = [
    { title: 'Polski', value: 'pl' as const },
    { title: 'English', value: 'en' as const },
    { title: 'Українська', value: 'ua' as const },
    { title: 'Deutsch', value: 'de' as const },
]
