import type { PartnerCategory } from '@/api/partners/partners.types'

export const partnerCategories: readonly {
    title: string
    value: PartnerCategory
}[] = [
    { title: 'Notariusz', value: 'notary' },
    { title: 'Prawnik', value: 'legal' },
    { title: 'Tłumacz przysięgły', value: 'translation' },
    { title: 'Edukacja', value: 'education' },
    { title: 'Zatrudnienie', value: 'employment' },
    { title: 'Księgowość', value: 'accounting' },
    { title: 'Ubezpieczenia', value: 'insurance' },
    { title: 'Inne', value: 'other' },
]

export function partnerCategoryLabel(category: PartnerCategory) {
    return (
        partnerCategories.find((item) => item.value === category)?.title ??
        'Inne'
    )
}

export function partnerWebsiteHref(value: string | null) {
    if (!value) return undefined

    try {
        const url = new URL(value)

        return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
    } catch {
        return undefined
    }
}

export function partnerPhoneHref(value: string | null) {
    return value && /^\+?[0-9][0-9 ()-]*[0-9]$/.test(value)
        ? `tel:${value.replace(/[ ()-]/g, '')}`
        : undefined
}

export function partnerEmailHref(value: string | null) {
    return value && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
        ? `mailto:${encodeURIComponent(value)}`
        : undefined
}
