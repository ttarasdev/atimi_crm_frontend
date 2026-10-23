import type { Metadata } from 'next'
import { CalendarSettings } from '@/features/calendar/calendar-settings/CalendarSettings'

export const metadata: Metadata = { title: 'Kalendarz — Zarządzanie' }

export default function Page() {
    return <CalendarSettings />
}
