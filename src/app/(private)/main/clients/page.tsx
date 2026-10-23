import type { Metadata } from 'next'
import { ClientsPage } from '@/features/clients/clients-list/ClientsPage'

export const metadata: Metadata = { title: 'Klienci' }

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ create?: string; managerId?: string }>
}) {
    const query = await searchParams

    const managerId = Number(query.managerId)

    return (
        <ClientsPage
            createOnLoad={query.create === '1'}
            initialManagerId={
                Number.isSafeInteger(managerId) &&
                managerId > 0 &&
                managerId <= 2147483647
                    ? managerId
                    : null
            }
        />
    )
}
