export const clientStatuses: Record<string, { title: string; color: string }> =
    {
        new: { title: 'Nowy', color: '#4676B4' },
        active: { title: 'Aktywny', color: '#3C91A5' },
        paused: { title: 'Wstrzymany', color: '#B18B4E' },
        completed: { title: 'Zakończony', color: '#438F73' },
        lost: { title: 'Utracony', color: '#B96370' },
    }

export const processStatuses: Record<string, string> = {
    active: 'W toku',
    completed: 'Zakończone',
    archived: 'Archiwum',
}

export function overviewDate(
    value: string,
    timeZone = 'Europe/Warsaw',
    time = true,
) {
    return new Intl.DateTimeFormat('pl-PL', {
        timeZone,
        day: 'numeric',
        month: 'short',
        ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(new Date(value))
}
