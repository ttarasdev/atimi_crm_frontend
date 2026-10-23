import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CalendarPage } from '@/features/calendar/calendar-page/CalendarPage'

export const metadata: Metadata = { title: 'Terminy — Kalendarz' }

export default function Page() {
    return (
        <Suspense fallback={<p role="status">Wczytywanie kalendarza…</p>}>
            <CalendarPage initialTab="deadlines" />
        </Suspense>
    )
}
