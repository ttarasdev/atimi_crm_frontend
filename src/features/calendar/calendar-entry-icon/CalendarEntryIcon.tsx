import { Bell, CheckCheck, Flag } from 'lucide-react'
import type { CalendarEntry } from '@/api/calendars/calendars.types'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'

export function CalendarEntryIcon({
    entry,
    size = 18,
}: {
    entry: CalendarEntry
    size?: number
}) {
    if (entry.kind === 'deadline')
        return <Flag size={size} aria-hidden="true" />

    if (entry.kind === 'reminder')
        return <Bell size={size} aria-hidden="true" />

    return entry.taskType?.iconId ? (
        <ThemedIcon iconId={entry.taskType.iconId} size={size} />
    ) : (
        <CheckCheck size={size} aria-hidden="true" />
    )
}
