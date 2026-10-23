import type { CalendarEntry } from '@/api/calendars/calendars.types'
import { calendarDateParts } from './calendar-date'

export function addCalendarDays(date: string, days: number) {
    const value = new Date(`${date}T12:00:00Z`)

    value.setUTCDate(value.getUTCDate() + days)

    return value.toISOString().split('T')[0]
}

export function isCalendarDateInRange(date: string) {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        date < '1000-01-01' ||
        date > '9999-12-31'
    )
        return false

    const value = new Date(`${date}T12:00:00Z`)

    return (
        !Number.isNaN(value.getTime()) &&
        value.toISOString().split('T')[0] === date
    )
}

export function calendarWeekStart(date: string) {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay()

    return addCalendarDays(date, -(day === 0 ? 6 : day - 1))
}

export function calendarDayLabel(date: string, short = false) {
    return new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'UTC',
        weekday: short ? 'short' : 'long',
        day: 'numeric',
        month: short ? 'short' : 'long',
    }).format(new Date(`${date}T12:00:00Z`))
}

export function calendarMonthLabel(date: string) {
    return new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'UTC',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${date}T12:00:00Z`))
}

export function calendarEntryDate(entry: CalendarEntry, timeZone: string) {
    if (entry.kind === 'event' && entry.weekStart) return entry.weekStart

    return entry.kind === 'event' && entry.date
        ? entry.date
        : calendarDateParts(entry.at, timeZone).date
}

export function calendarEntryTime(entry: CalendarEntry, timeZone: string) {
    if (entry.kind === 'event' && entry.weekStart)
        return 'Na tydzień · bez godziny'

    if (entry.kind === 'event' && entry.date)
        return entry.dueAt
            ? `Termin: ${calendarDateParts(entry.dueAt, timeZone).time}`
            : 'Bez godziny'

    const start = calendarDateParts(entry.at, timeZone).time

    return entry.kind === 'event' && entry.endAt
        ? `${start}–${calendarDateParts(entry.endAt, timeZone).time}`
        : start
}

export function calendarMinutes(value: string | number, timeZone: string) {
    const [hours, minutes] = calendarDateParts(value, timeZone)
        .time.split(':')
        .map(Number)

    return hours * 60 + minutes
}

export function calendarEntryColor(entry: CalendarEntry) {
    if (entry.kind === 'deadline') return 'var(--negative)'

    return entry.kind === 'event'
        ? (entry.taskType?.color ?? 'var(--primary)')
        : 'var(--primary)'
}

export function calendarEntryOverdue(
    entry: CalendarEntry,
    now: number,
    timeZone: string,
) {
    if (entry.kind === 'deadline') return !entry.isDone && entry.at < now

    if (entry.kind === 'event' && entry.weekStart)
        return (
            !entry.isDone &&
            addCalendarDays(entry.weekStart, 6) <
                calendarDateParts(now, timeZone).date
        )

    if (entry.kind === 'event' && entry.date)
        return (
            !entry.isDone &&
            (entry.dueAt
                ? new Date(entry.dueAt).getTime() < now
                : entry.date < calendarDateParts(now, timeZone).date)
        )

    return entry.kind === 'event' && !entry.isDone && !!entry.endAt
        ? new Date(entry.endAt).getTime() < now
        : false
}

export function layoutCalendarEvents(
    events: Extract<CalendarEntry, { kind: 'event' }>[],
    timeZone: string,
    minimumDuration = 36,
) {
    const positions = events
        .filter((event) => event.startAt && event.endAt)
        .map((event) => ({
            event,
            start: calendarMinutes(event.startAt!, timeZone),
            end: calendarMinutes(event.endAt!, timeZone),
            column: 0,
            columns: 1,
        }))
        .sort(
            (first, second) =>
                first.start - second.start || first.event.id - second.event.id,
        )

    let group: typeof positions = []

    let groupEnd = 0

    const finishGroup = () => {
        const columns = Math.max(1, ...group.map((item) => item.column + 1))

        group.forEach((item) => {
            item.columns = columns
        })
    }

    for (const position of positions) {
        if (position.start >= groupEnd) {
            finishGroup()

            group = []
        }

        const occupied = new Set(
            group
                .filter(
                    (item) =>
                        Math.max(item.end, item.start + minimumDuration) >
                        position.start,
                )
                .map((item) => item.column),
        )

        while (occupied.has(position.column)) position.column++

        group.push(position)

        groupEnd = Math.max(
            ...group.map((item) =>
                Math.max(item.end, item.start + minimumDuration),
            ),
        )
    }

    finishGroup()

    return positions
}
