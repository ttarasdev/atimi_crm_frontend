export function calendarDateParts(
    value: string | number | Date,
    timeZone: string,
) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(value))

    const part = (name: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === name)?.value ?? ''

    return {
        date: `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`,
        time: `${part('hour')}:${part('minute')}`,
    }
}

export function localDateTimeToIso(
    date: string,
    time: string,
    timeZone: string,
) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
        return null

    const [year, month, day] = date.split('-').map(Number)

    const [hour, minute] = time.split(':').map(Number)

    if (year < 1000 || year > 9999 || hour > 23 || minute > 59) return null

    const wall = Date.UTC(year, month - 1, day, hour, minute)

    let instant = wall

    for (let attempt = 0; attempt < 4; attempt++) {
        const local = calendarDateParts(instant, timeZone)

        const [localYear, localMonth, localDay] = local.date
            .split('-')
            .map(Number)

        const [localHour, localMinute] = local.time.split(':').map(Number)

        const difference =
            wall -
            Date.UTC(
                localYear,
                localMonth - 1,
                localDay,
                localHour,
                localMinute,
            )

        if (!difference) break

        instant += difference
    }

    const actual = calendarDateParts(instant, timeZone)

    return actual.date === date && actual.time === time
        ? new Date(instant).toISOString()
        : null
}

export function calendarDateTimeLabel(value: string, timeZone: string) {
    return new Intl.DateTimeFormat('pl-PL', {
        timeZone,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))
}

export function calendarDateLabel(date: string) {
    return new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${date}T12:00:00Z`))
}

export function reminderOffsetLabel(minutes: number) {
    if (minutes === 0) return 'W chwili rozpoczęcia'

    if (minutes % 1440 === 0)
        return minutes === 1440
            ? '1 dzień przed'
            : `${minutes / 1440} dni przed`

    if (minutes % 60 === 0) return `${minutes / 60} godz. przed`

    return `${minutes} min przed`
}
