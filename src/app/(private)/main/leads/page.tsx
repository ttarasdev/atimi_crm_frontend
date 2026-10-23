import type { Metadata } from 'next'
import { LeadsPage } from '@/features/leads/LeadsPage'

export const metadata: Metadata = { title: 'Leady' }

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ leadId?: string | string[] }>
}) {
    const { leadId } = await searchParams

    const id =
        typeof leadId === 'string' &&
        /^[1-9]\d*$/.test(leadId) &&
        Number(leadId) <= 2147483647
            ? Number(leadId)
            : undefined

    return <LeadsPage key={id ?? 'list'} initialLeadId={id} />
}
