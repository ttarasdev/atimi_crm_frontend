import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CalendarPage } from '@/features/calendar/calendar-page/CalendarPage'

export const metadata: Metadata = { title: 'Przypomnienia — Kalendarz' }

export default function Page() {
    return (
        <Suspense fallback={<p role="status">Wczytywanie kalendarza…</p>}>
            <CalendarPage initialTab="reminders" />
        </Suspense>
    )
}
