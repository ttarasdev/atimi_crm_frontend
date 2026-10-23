import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { CalendarPage } from '@/features/calendar/calendar-page/CalendarPage'
import { RoleGuard } from '@/shared/guards/RoleGuard'

export const metadata: Metadata = { title: 'Kalendarz pracownika' }

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const managerId = Number(id)

    if (
        !/^\d+$/.test(id) ||
        !Number.isSafeInteger(managerId) ||
        managerId < 1 ||
        managerId > 2147483647
    )
        notFound()

    return (
        <RoleGuard allowedRoles={['admin']}>
            <Suspense fallback={<p role="status">Wczytywanie kalendarza…</p>}>
                <CalendarPage managerId={managerId} />
            </Suspense>
        </RoleGuard>
    )
}
