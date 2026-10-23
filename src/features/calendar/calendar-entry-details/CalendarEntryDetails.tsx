'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
    AlarmClock,
    Bell,
    CalendarDays,
    Check,
    Clock3,
    Flag,
    Link2,
    MapPin,
    Pencil,
    Repeat,
    Trash2,
} from 'lucide-react'
import type {
    CalendarEntry,
    CalendarEventWarning,
} from '@/api/calendars/calendars.types'
import { FormDateTimeInput } from '@/components/form-components/form-date-time-input/FormDateTimeInput'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import {
    useCalendarDeadline,
    useCalendarEvent,
    useCalendarReminder,
    useUpdateCalendarDeadline,
    useUpdateCalendarEvent,
    useUpdateCalendarReminder,
} from '@/shared/hooks/useCalendar'
import {
    calendarDateLabel,
    calendarDateParts,
    calendarDateTimeLabel,
    localDateTimeToIso,
    reminderOffsetLabel,
} from '../calendar-date'
import c from './CalendarEntryDetails.module.scss'
import { addCalendarDays, calendarEntryOverdue } from '../calendar-view'

export function CalendarEntryDetails({
    calendarId,
    timeZone,
    entry,
    onEdit,
    onDelete,
    onUpdated,
    onPendingChange,
}: {
    calendarId: number
    timeZone: string
    entry: CalendarEntry
    onEdit: (entry: CalendarEntry) => void
    onDelete: (entry: CalendarEntry) => void
    onUpdated: (warnings?: CalendarEventWarning[]) => void
    onPendingChange?: (pending: boolean) => void
}) {
    const eventQuery = useCalendarEvent(
        calendarId,
        entry.kind === 'event' ? entry.id : null,
    )

    const reminderQuery = useCalendarReminder(
        calendarId,
        entry.kind === 'reminder' ? entry.id : null,
    )

    const deadlineQuery = useCalendarDeadline(
        calendarId,
        entry.kind === 'deadline' ? entry.id : null,
    )

    const item: CalendarEntry =
        entry.kind === 'event'
            ? { ...entry, ...eventQuery.data }
            : entry.kind === 'reminder'
              ? { ...entry, ...reminderQuery.data }
              : { ...entry, ...deadlineQuery.data }

    const updateEvent = useUpdateCalendarEvent()

    const updateReminder = useUpdateCalendarReminder()

    const updateDeadline = useUpdateCalendarDeadline()

    const [error, setError] = useState<string>()

    const [snoozeOpen, setSnoozeOpen] = useState(false)

    const [now] = useState(() => Date.now())

    const defaultSnooze = calendarDateParts(now + 15 * 60000, timeZone)

    const [snoozeDate, setSnoozeDate] = useState(defaultSnooze.date)

    const [snoozeTime, setSnoozeTime] = useState(defaultSnooze.time)

    const controller = useRef<AbortController | null>(null)

    const isPending =
        updateEvent.isPending ||
        updateReminder.isPending ||
        updateDeadline.isPending

    const isRefreshing =
        eventQuery.isFetching ||
        reminderQuery.isFetching ||
        deadlineQuery.isFetching

    const color =
        item.kind === 'event'
            ? (item.taskType?.color ?? 'var(--primary)')
            : item.kind === 'deadline'
              ? 'var(--negative)'
              : 'var(--primary)'

    const generatedCard = item.kind === 'event' && !!item.clientCardId

    const overdue = calendarEntryOverdue({ ...entry, ...item }, now, timeZone)

    useEffect(() => {
        onPendingChange?.(isPending)
    }, [isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function changeDone() {
        if (controller.current || item.kind === 'reminder') return

        setError(undefined)

        controller.current = new AbortController()

        const signal = controller.current.signal

        try {
            if (item.kind === 'event') {
                const result = await updateEvent.mutateAsync({
                    calendarId,
                    id: item.id,
                    dto: { isDone: !item.isDone },
                    query: { seriesScope: 'one' },
                    signal,
                })

                onUpdated(result.warnings)
            } else {
                await updateDeadline.mutateAsync({
                    calendarId,
                    id: item.id,
                    dto: { isDone: !item.isDone },
                    signal,
                })

                onUpdated()
            }
        } catch {
            if (!signal.aborted)
                setError('Nie udało się zmienić oznaczenia. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    async function snooze(remindAt: string | null, currentAt: number) {
        if (controller.current || item.kind !== 'reminder') return

        setError(undefined)

        if (!remindAt || new Date(remindAt).getTime() <= currentAt) {
            setError('Wybierz poprawną godzinę w przyszłości.')

            return
        }

        controller.current = new AbortController()

        const signal = controller.current.signal

        try {
            await updateReminder.mutateAsync({
                calendarId,
                id: item.id,
                dto: { remindAt },
                signal,
            })

            onUpdated()
        } catch {
            if (!signal.aborted)
                setError(
                    'Nie udało się odłożyć przypomnienia. Spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    return (
        <div className={c.details} aria-busy={isPending || isRefreshing}>
            <div className={c.heading}>
                <span className={c.icon} style={{ color }}>
                    {item.kind === 'event' && item.taskType ? (
                        <ThemedIcon iconId={item.taskType.iconId} size={34} />
                    ) : item.kind === 'deadline' ? (
                        <Flag size={24} aria-hidden="true" />
                    ) : item.kind === 'reminder' ? (
                        <Bell size={24} aria-hidden="true" />
                    ) : (
                        <CalendarDays size={24} aria-hidden="true" />
                    )}
                </span>
                <div className={c.title}>
                    <span className={c.type} style={{ color }}>
                        {item.kind === 'event'
                            ? (item.taskType?.name ?? 'Wydarzenie')
                            : item.kind === 'reminder'
                              ? 'Przypomnienie'
                              : 'Termin'}
                    </span>
                    <h3>{item.title}</h3>
                </div>
            </div>
            <dl className={c.facts}>
                <div>
                    <dt>
                        <Clock3 size={15} aria-hidden="true" /> Kiedy
                    </dt>
                    <dd>
                        {item.kind === 'event'
                            ? item.weekStart
                                ? `${calendarDateLabel(item.weekStart)} – ${calendarDateLabel(addCalendarDays(item.weekStart, 6))} · bez konkretnego dnia i godziny`
                                : item.date
                                  ? item.dueAt
                                      ? `${calendarDateTimeLabel(item.dueAt, timeZone)} · termin zadania`
                                      : `${calendarDateLabel(item.date)} · do końca dnia`
                                  : item.startAt && item.endAt
                                    ? `${calendarDateTimeLabel(item.startAt, timeZone)} – ${calendarDateParts(item.endAt, timeZone).time}`
                                    : 'Bez daty'
                            : calendarDateTimeLabel(
                                  item.kind === 'reminder'
                                      ? item.remindAt
                                      : item.dueAt,
                                  timeZone,
                              )}
                    </dd>
                </div>
                {item.kind === 'event' && item.location && (
                    <div>
                        <dt>
                            <MapPin size={15} aria-hidden="true" /> Miejsce
                        </dt>
                        <dd>{item.location}</dd>
                    </div>
                )}
                {item.kind === 'event' && item.seriesKey && (
                    <div>
                        <dt>
                            <Repeat size={15} aria-hidden="true" /> Powtarzanie
                        </dt>
                        <dd>
                            {item.repeat === 'daily'
                                ? 'Codziennie'
                                : item.repeat === 'weekly'
                                  ? 'Co tydzień'
                                  : 'Co miesiąc'}
                            {item.repeatUntil
                                ? `, do ${calendarDateLabel(item.repeatUntil)}`
                                : ''}
                        </dd>
                    </div>
                )}
                {item.clientStageId && (
                    <div>
                        <dt>
                            <Link2 size={15} aria-hidden="true" /> Etap klienta
                        </dt>
                        <dd>Powiązane z etapem klienta</dd>
                    </div>
                )}
                {item.kind === 'reminder' ? (
                    <div>
                        <dt>
                            <Bell size={15} aria-hidden="true" /> E-mail
                        </dt>
                        <dd>
                            {item.sentAt
                                ? `Wysłano ${calendarDateTimeLabel(item.sentAt, timeZone)}`
                                : 'Zostanie wysłany o wybranej godzinie.'}
                        </dd>
                    </div>
                ) : (
                    <div>
                        <dt>
                            <Bell size={15} aria-hidden="true" /> Przypomnienia
                        </dt>
                        <dd>
                            {item.kind === 'event' &&
                            (item.date || item.weekStart)
                                ? 'Wyłączone dla zadania bez godziny.'
                                : (item.kind === 'event'
                                        ? item.taskType?.reminderMinutes
                                        : item.reminderMinutes
                                    )?.length
                                  ? (item.kind === 'event'
                                        ? item.taskType!.reminderMinutes
                                        : item.reminderMinutes
                                    )
                                        .map(reminderOffsetLabel)
                                        .join(' · ')
                                  : 'Bez przypomnień e-mail.'}
                        </dd>
                    </div>
                )}
            </dl>
            {item.kind !== 'reminder' && item.description && (
                <p className={c.description}>{item.description}</p>
            )}
            {overdue && (
                <p className={c.overdue}>
                    <Flag size={14} aria-hidden="true" /> Po terminie
                </p>
            )}
            {item.kind !== 'reminder' && !generatedCard && (
                <button
                    type="button"
                    className={c.done}
                    aria-pressed={item.isDone}
                    disabled={isPending}
                    onClick={() => {
                        void changeDone()
                    }}
                >
                    <span className={item.isDone ? c.checked : c.unchecked}>
                        {item.isDone && <Check size={14} aria-hidden="true" />}
                    </span>
                    {item.isDone ? 'Wykonane' : 'Oznacz jako wykonane'}
                </button>
            )}
            {item.kind === 'reminder' && (
                <div className={c.snooze}>
                    <button
                        type="button"
                        className={c.snoozeToggle}
                        disabled={isPending}
                        aria-expanded={snoozeOpen}
                        onClick={() => setSnoozeOpen(!snoozeOpen)}
                    >
                        <AlarmClock size={16} aria-hidden="true" /> Odłóż
                        przypomnienie
                    </button>
                    {snoozeOpen && (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault()

                                void snooze(
                                    localDateTimeToIso(
                                        snoozeDate,
                                        snoozeTime,
                                        timeZone,
                                    ),
                                    Date.now(),
                                )
                            }}
                        >
                            <fieldset disabled={isPending}>
                                <div className={c.quick}>
                                    {[15, 60, 1440].map((minutes) => (
                                        <Button
                                            key={minutes}
                                            type="button"
                                            onClick={() => {
                                                void snooze(
                                                    new Date(
                                                        Date.now() +
                                                            minutes * 60000,
                                                    ).toISOString(),
                                                    Date.now(),
                                                )
                                            }}
                                        >
                                            {minutes === 15
                                                ? 'Za 15 min'
                                                : minutes === 60
                                                  ? 'Za godzinę'
                                                  : 'Za 24 godz.'}
                                        </Button>
                                    ))}
                                </div>
                                <FormDateTimeInput
                                    date={snoozeDate}
                                    time={snoozeTime}
                                    onDateChange={setSnoozeDate}
                                    onTimeChange={setSnoozeTime}
                                />
                                <Button
                                    type="submit"
                                    className={c.action}
                                    pending={isPending}
                                >
                                    Odłóż na wybraną godzinę
                                </Button>
                            </fieldset>
                        </form>
                    )}
                </div>
            )}
            {error && (
                <p className={c.error} role="alert">
                    {error}
                </p>
            )}
            {(eventQuery.isError ||
                reminderQuery.isError ||
                deadlineQuery.isError) && (
                <div className={c.error} role="alert">
                    <p>Nie udało się odświeżyć szczegółów.</p>
                    <button
                        type="button"
                        className={c.retry}
                        disabled={isPending || isRefreshing}
                        onClick={() => {
                            if (item.kind === 'event') void eventQuery.refetch()
                            else if (item.kind === 'reminder')
                                void reminderQuery.refetch()
                            else void deadlineQuery.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            )}
            {generatedCard && item.kind === 'event' ? (
                <div className={c.cardLink}>
                    <p>
                        To przypomnienie pochodzi z karty dokumentu. Termin i
                        przypomnienia zmienisz w karcie klienta.
                    </p>
                    {item.clientId && (
                        <Link href={`/main/clients/${item.clientId}`}>
                            Otwórz klienta
                        </Link>
                    )}
                </div>
            ) : (
                <div className={c.actions}>
                    <Button
                        type="button"
                        className={c.action}
                        disabled={isPending}
                        onClick={() => onEdit(item)}
                    >
                        <Pencil size={15} aria-hidden="true" /> Edytuj
                    </Button>
                    <Button
                        type="button"
                        className={`${c.action} ${c.remove}`}
                        disabled={isPending}
                        onClick={() => onDelete(item)}
                    >
                        <Trash2 size={15} aria-hidden="true" /> Usuń
                    </Button>
                </div>
            )}
        </div>
    )
}
