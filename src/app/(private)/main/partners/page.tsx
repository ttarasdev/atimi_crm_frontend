import type { Metadata } from 'next'
import { PartnersPage } from '@/features/partners/PartnersPage'

export const metadata: Metadata = { title: 'Partnerzy' }

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ partnerId?: string | string[] }>
}) {
    const { partnerId } = await searchParams

    const id =
        typeof partnerId === 'string' &&
        /^[1-9]\d*$/.test(partnerId) &&
        Number(partnerId) <= 2147483647
            ? Number(partnerId)
            : undefined

    return <PartnersPage key={id ?? 'list'} initialPartnerId={id} />
}
