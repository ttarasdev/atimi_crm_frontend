import { Check, ChevronRight, Repeat2 } from 'lucide-react'
import type { CalendarEntry } from '@/api/calendars/calendars.types'
import { CalendarEntryIcon } from '../calendar-entry-icon/CalendarEntryIcon'
import { calendarDateParts } from '../calendar-date'
import {
    addCalendarDays,
    calendarDayLabel,
    calendarEntryColor,
    calendarEntryDate,
    calendarEntryOverdue,
    calendarEntryTime,
} from '../calendar-view'
import c from './CalendarEntriesList.module.scss'

export function CalendarEntriesList({
    entries,
    timeZone,
    now,
    onOpen,
}: {
    entries: CalendarEntry[]
    timeZone: string
    now: number
    onOpen: (entry: CalendarEntry) => void
}) {
    const dates = Array.from(
        new Set(entries.map((entry) => calendarEntryDate(entry, timeZone))),
    ).sort()

    const today = calendarDateParts(now, timeZone).date

    return (
        <div className={c.groups}>
            {dates.map((date) => (
                <section
                    className={c.group}
                    key={date}
                    aria-label={calendarDayLabel(date)}
                >
                    <h3>
                        {date === today
                            ? 'Dzisiaj'
                            : date === addCalendarDays(today, 1)
                              ? 'Jutro'
                              : ''}
                        {date === today || date === addCalendarDays(today, 1)
                            ? ' · '
                            : ''}
                        {calendarDayLabel(date)}
                    </h3>
                    <ul className={c.list}>
                        {entries
                            .filter(
                                (entry) =>
                                    calendarEntryDate(entry, timeZone) === date,
                            )
                            .map((entry) => {
                                const isDone =
                                    entry.kind !== 'reminder' && entry.isDone

                                return (
                                    <li key={`${entry.kind}-${entry.id}`}>
                                        <button
                                            type="button"
                                            className={`${c.entry} ${entry.kind === 'deadline' ? c.deadline : ''} ${isDone ? c.done : ''}`}
                                            style={{
                                                color: calendarEntryColor(
                                                    entry,
                                                ),
                                            }}
                                            onClick={() => onOpen(entry)}
                                            aria-label={`${entry.kind === 'event' ? 'Wydarzenie' : entry.kind === 'reminder' ? 'Przypomnienie' : 'Termin'}: ${entry.title}`}
                                        >
                                            <span className={c.icon}>
                                                <CalendarEntryIcon
                                                    entry={entry}
                                                    size={25}
                                                />
                                            </span>
                                            <span className={c.content}>
                                                <span className={c.meta}>
                                                    <span>
                                                        {calendarEntryTime(
                                                            entry,
                                                            timeZone,
                                                        )}
                                                    </span>
                                                    <span>·</span>
                                                    <span>
                                                        {entry.kind === 'event'
                                                            ? (entry.taskType
                                                                  ?.name ??
                                                              'Wydarzenie')
                                                            : entry.kind ===
                                                                'reminder'
                                                              ? 'Przypomnienie'
                                                              : 'Termin'}
                                                    </span>
                                                    {entry.kind === 'event' &&
                                                        entry.repeat && (
                                                            <Repeat2
                                                                size={12}
                                                                aria-label="Powtarzane"
                                                            />
                                                        )}
                                                </span>
                                                <strong>{entry.title}</strong>
                                                {entry.kind === 'event' &&
                                                    entry.location && (
                                                        <span
                                                            className={
                                                                c.location
                                                            }
                                                        >
                                                            {entry.location}
                                                        </span>
                                                    )}
                                                <span className={c.badges}>
                                                    {calendarEntryOverdue(
                                                        entry,
                                                        now,
                                                        timeZone,
                                                    ) && (
                                                        <span
                                                            className={
                                                                c.overdue
                                                            }
                                                        >
                                                            Po terminie
                                                        </span>
                                                    )}
                                                    {entry.kind ===
                                                        'reminder' &&
                                                        entry.sentAt && (
                                                            <span>
                                                                Wysłano e-mail
                                                            </span>
                                                        )}
                                                    {entry.clientStageId && (
                                                        <span>
                                                            Powiązane z etapem
                                                        </span>
                                                    )}
                                                    {isDone && (
                                                        <span>Wykonane</span>
                                                    )}
                                                </span>
                                            </span>
                                            {isDone ? (
                                                <Check
                                                    size={18}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <ChevronRight
                                                    size={17}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </button>
                                    </li>
                                )
                            })}
                    </ul>
                </section>
            ))}
        </div>
    )
}
