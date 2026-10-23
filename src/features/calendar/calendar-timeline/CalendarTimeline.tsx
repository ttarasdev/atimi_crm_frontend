'use client'

import { useEffect, useRef } from 'react'
import { Check, Clock, Plus, Repeat2 } from 'lucide-react'
import type { CalendarEntry } from '@/api/calendars/calendars.types'
import { CalendarEntryIcon } from '../calendar-entry-icon/CalendarEntryIcon'
import {
    calendarEntryColor,
    calendarEntryDate,
    calendarEntryTime,
    calendarMinutes,
    isCalendarDateInRange,
    layoutCalendarEvents,
} from '../calendar-view'
import { calendarDateLabel, calendarDateParts } from '../calendar-date'
import c from './CalendarTimeline.module.scss'

const startMinute = 8 * 60

const endMinute = 24 * 60

interface Props {
    dates: string[]
    entries: CalendarEntry[]
    timeZone: string
    now: number
    onOpen: (entry: CalendarEntry) => void
    onCreate: (date: string) => void
    onSelectDate: (date: string) => void
    onOpenGroup: (entries: CalendarEntry[]) => void
}

export function CalendarTimeline({
    dates,
    entries,
    timeZone,
    now,
    onOpen,
    onCreate,
    onSelectDate,
    onOpenGroup,
}: Props) {
    const scroll = useRef<HTMLDivElement>(null)

    const today = calendarDateParts(now, timeZone).date

    const singleDay = dates.length === 1

    const dateKey = dates.join(',')

    const earlyEntries = entries.filter((entry) => {
        if (entry.kind === 'event' && entry.date) return false

        if (calendarMinutes(entry.at, timeZone) >= startMinute) return false

        return (
            entry.kind !== 'event' ||
            !entry.endAt ||
            calendarMinutes(entry.endAt, timeZone) <= startMinute
        )
    })

    const currentMinute = calendarMinutes(now, timeZone)

    useEffect(() => {
        if (scroll.current) scroll.current.scrollTop = 0
    }, [dateKey])

    return (
        <div
            className={`${c.calendar} ${singleDay ? c.day : ''}`}
            aria-label={singleDay ? 'Plan dnia' : 'Plan tygodnia'}
        >
            <div
                ref={scroll}
                className={c.scroll}
                role="region"
                aria-label="Oś czasu od 8:00 do 24:00"
                tabIndex={0}
            >
                <div className={c.sticky}>
                    <div
                        className={c.headings}
                        style={{
                            gridTemplateColumns: `44px repeat(${dates.length}, minmax(0, 1fr))`,
                        }}
                    >
                        <div className={c.corner}>
                            <Clock size={14} aria-hidden="true" />
                        </div>
                        {dates.map((date) => (
                            <button
                                key={date}
                                type="button"
                                className={`${c.date} ${date === today ? c.today : ''}`}
                                onClick={() => onSelectDate(date)}
                                disabled={!isCalendarDateInRange(date)}
                                aria-label={`Pokaż dzień: ${calendarDateLabel(date)}`}
                            >
                                <span>
                                    {new Intl.DateTimeFormat('pl-PL', {
                                        timeZone: 'UTC',
                                        weekday: 'short',
                                    }).format(new Date(`${date}T12:00:00Z`))}
                                </span>
                                <strong>{Number(date.slice(-2))}</strong>
                            </button>
                        ))}
                    </div>
                    <div
                        className={c.allDay}
                        style={{
                            gridTemplateColumns: `44px repeat(${dates.length}, minmax(0, 1fr))`,
                        }}
                    >
                        <span className={c.allDayLabel}>Bez godz.</span>
                        {dates.map((date) => (
                            <div key={date} className={c.allDayColumn}>
                                {entries
                                    .filter(
                                        (entry) =>
                                            entry.kind === 'event' &&
                                            entry.date === date,
                                    )
                                    .map((entry) => (
                                        <button
                                            type="button"
                                            key={entry.id}
                                            className={`${c.allDayEvent} ${entry.kind === 'event' && entry.isDone ? c.done : ''}`}
                                            style={{
                                                color: calendarEntryColor(
                                                    entry,
                                                ),
                                            }}
                                            onClick={() => onOpen(entry)}
                                            title={entry.title}
                                            aria-label={`${entry.kind === 'event' && entry.dueAt ? 'Zadanie z terminem' : 'Zadanie bez godziny'}: ${entry.title}`}
                                        >
                                            <CalendarEntryIcon
                                                entry={entry}
                                                size={15}
                                            />
                                            <span>
                                                {entry.title}
                                                {entry.kind === 'event' &&
                                                    entry.dueAt &&
                                                    ` · ${calendarEntryTime(entry, timeZone)}`}
                                            </span>
                                            {entry.kind === 'event' &&
                                                entry.isDone && (
                                                    <Check
                                                        size={13}
                                                        aria-label="Wykonane"
                                                    />
                                                )}
                                        </button>
                                    ))}
                                <button
                                    type="button"
                                    className={c.addDay}
                                    onClick={() => onCreate(date)}
                                    disabled={!isCalendarDateInRange(date)}
                                    aria-label={`Dodaj wpis: ${calendarDateLabel(date)}`}
                                >
                                    <Plus size={12} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {earlyEntries.length > 0 && (
                        <div
                            className={c.early}
                            style={{
                                gridTemplateColumns: `44px repeat(${dates.length}, minmax(0, 1fr))`,
                            }}
                        >
                            <span className={c.allDayLabel}>Przed 8:00</span>
                            {dates.map((date) => {
                                const group = earlyEntries.filter(
                                    (entry) =>
                                        calendarEntryDate(entry, timeZone) ===
                                        date,
                                )

                                return (
                                    <div key={date} className={c.allDayColumn}>
                                        {group.length > 0 && (
                                            <button
                                                type="button"
                                                className={c.earlyEntries}
                                                onClick={() =>
                                                    group.length > 1
                                                        ? onOpenGroup(group)
                                                        : onOpen(group[0])
                                                }
                                                aria-label={`Wpisy przed 8:00, ${calendarDateLabel(date)}: ${group.length}`}
                                                title={group
                                                    .map(
                                                        (entry) =>
                                                            `${calendarEntryTime(entry, timeZone)} · ${entry.title}`,
                                                    )
                                                    .join('\n')}
                                            >
                                                <Clock
                                                    size={12}
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {group.length}{' '}
                                                    {group.length === 1
                                                        ? 'wpis'
                                                        : 'wpisy'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                <div
                    className={c.grid}
                    style={{
                        gridTemplateColumns: `44px repeat(${dates.length}, minmax(0, 1fr))`,
                    }}
                >
                    <div className={c.hours} aria-hidden="true">
                        {Array.from({ length: 17 }, (_, index) => (
                            <span key={index} style={{ top: index * 60 }}>
                                {String(index + 8).padStart(2, '0')}:00
                            </span>
                        ))}
                    </div>
                    {dates.map((date) => {
                        const dayEntries = entries.filter(
                            (entry) =>
                                calendarEntryDate(entry, timeZone) === date,
                        )

                        const events = dayEntries.filter(
                            (
                                entry,
                            ): entry is Extract<
                                CalendarEntry,
                                { kind: 'event' }
                            > =>
                                entry.kind === 'event' &&
                                !!entry.startAt &&
                                !!entry.endAt &&
                                calendarMinutes(entry.endAt, timeZone) >
                                    startMinute,
                        )

                        const markers = dayEntries.filter(
                            (entry) =>
                                entry.kind !== 'event' &&
                                calendarMinutes(entry.at, timeZone) >=
                                    startMinute,
                        )

                        const positions = layoutCalendarEvents(
                            events,
                            timeZone,
                            singleDay ? 60 : 36,
                        )

                        const markerGroups = new Map<number, CalendarEntry[]>()

                        for (const entry of markers) {
                            const minute = calendarMinutes(entry.at, timeZone)

                            const group = markerGroups.get(minute) ?? []

                            group.push(entry)

                            markerGroups.set(minute, group)
                        }

                        return (
                            <div
                                key={date}
                                className={`${c.column} ${date === today ? c.todayColumn : ''}`}
                            >
                                {positions.map(
                                    ({
                                        event,
                                        start,
                                        end,
                                        column,
                                        columns,
                                    }) => {
                                        const entry = event

                                        return (
                                            <button
                                                type="button"
                                                key={event.id}
                                                className={`${c.event} ${event.isDone ? c.done : ''}`}
                                                style={{
                                                    color: calendarEntryColor(
                                                        entry,
                                                    ),
                                                    top:
                                                        Math.max(
                                                            startMinute,
                                                            start,
                                                        ) - startMinute,
                                                    height: Math.min(
                                                        endMinute -
                                                            Math.max(
                                                                startMinute,
                                                                start,
                                                            ),
                                                        Math.max(
                                                            singleDay ? 60 : 36,
                                                            end -
                                                                Math.max(
                                                                    startMinute,
                                                                    start,
                                                                ),
                                                        ),
                                                    ),
                                                    left: `calc(${(column / columns) * 100}% + 3px)`,
                                                    width: `calc(${100 / columns}% - 6px)`,
                                                }}
                                                onClick={() => onOpen(entry)}
                                                title={`${calendarEntryTime(entry, timeZone)} · ${entry.title}`}
                                                aria-label={`Wydarzenie: ${entry.title}, ${calendarEntryTime(entry, timeZone)}`}
                                            >
                                                <span className={c.eventMeta}>
                                                    <CalendarEntryIcon
                                                        entry={entry}
                                                        size={
                                                            singleDay ? 23 : 15
                                                        }
                                                    />
                                                    <span>
                                                        {calendarEntryTime(
                                                            entry,
                                                            timeZone,
                                                        )}
                                                    </span>
                                                    {event.repeat && (
                                                        <Repeat2
                                                            size={11}
                                                            aria-label="Powtarzane"
                                                        />
                                                    )}
                                                    {event.isDone && (
                                                        <Check
                                                            size={11}
                                                            aria-label="Wykonane"
                                                        />
                                                    )}
                                                </span>
                                                <strong>{event.title}</strong>
                                                {singleDay &&
                                                    event.location && (
                                                        <span
                                                            className={
                                                                c.location
                                                            }
                                                        >
                                                            {event.location}
                                                        </span>
                                                    )}
                                            </button>
                                        )
                                    },
                                )}
                                {Array.from(markerGroups.entries()).map(
                                    ([minute, group]) => {
                                        const entry =
                                            group.find(
                                                (entry) =>
                                                    entry.kind === 'deadline',
                                            ) ?? group[0]

                                        return (
                                            <button
                                                type="button"
                                                key={`${entry.kind}-${entry.id}`}
                                                className={`${c.marker} ${entry.kind === 'deadline' ? c.deadline : c.reminder} ${minute < startMinute + 24 ? c.earlyMarker : ''}`}
                                                style={{
                                                    top: minute - startMinute,
                                                    color: calendarEntryColor(
                                                        entry,
                                                    ),
                                                }}
                                                onClick={() =>
                                                    group.length > 1
                                                        ? onOpenGroup(group)
                                                        : onOpen(entry)
                                                }
                                                title={`${group.map((item) => item.title).join(' · ')} · ${calendarEntryTime(entry, timeZone)}`}
                                                aria-label={
                                                    group.length > 1
                                                        ? `Wpisy o ${calendarEntryTime(entry, timeZone)}: ${group.length}`
                                                        : `${entry.kind === 'deadline' ? 'Termin' : 'Przypomnienie'}: ${entry.title}, ${calendarEntryTime(entry, timeZone)}`
                                                }
                                            >
                                                <span>
                                                    <CalendarEntryIcon
                                                        entry={entry}
                                                        size={12}
                                                    />
                                                    <strong>
                                                        {calendarEntryTime(
                                                            entry,
                                                            timeZone,
                                                        )}
                                                    </strong>
                                                    <span>
                                                        {group.length > 1
                                                            ? `${group.length} wpisy`
                                                            : entry.title}
                                                    </span>
                                                </span>
                                            </button>
                                        )
                                    },
                                )}
                                {date === today &&
                                    currentMinute >= startMinute &&
                                    currentMinute < endMinute && (
                                        <div
                                            className={c.now}
                                            style={{
                                                top:
                                                    currentMinute - startMinute,
                                            }}
                                            aria-label="Aktualna godzina"
                                        />
                                    )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
