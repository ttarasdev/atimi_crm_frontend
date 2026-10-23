'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Link2, Repeat } from 'lucide-react'
import type {
    Calendar,
    CalendarEntry,
    CalendarEntryKind,
    CalendarEventWarning,
    CreateCalendarEventDto,
    RepeatFrequency,
    SeriesScope,
} from '@/api/calendars/calendars.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormDateTimeInput } from '@/components/form-components/form-date-time-input/FormDateTimeInput'
import { FormReminderInput } from '@/components/form-components/form-reminder-input/FormReminderInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTaskTypeInput } from '@/components/form-components/form-task-type-input/FormTaskTypeInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import {
    useCreateCalendarDeadline,
    useCreateCalendarEvent,
    useCreateCalendarReminder,
    useUpdateCalendarDeadline,
    useUpdateCalendarEvent,
    useUpdateCalendarReminder,
} from '@/shared/hooks/useCalendar'
import { useInfiniteTaskTypes } from '@/shared/hooks/useTaskTypes'
import {
    calendarDateParts,
    calendarDateLabel,
    localDateTimeToIso,
    reminderOffsetLabel,
} from '../calendar-date'
import { CalendarStageInput } from '../calendar-stage-input/CalendarStageInput'
import c from './CalendarEntryForm.module.scss'
import {
    addCalendarDays,
    calendarWeekStart,
    isCalendarDateInRange,
} from '../calendar-view'

const scopes: { title: string; value: SeriesScope }[] = [
    { title: 'Tylko to wydarzenie', value: 'one' },
    { title: 'To i wszystkie następne', value: 'following' },
    { title: 'Wszystkie wydarzenia z serii', value: 'all' },
]

const repetitions: { title: string; value: RepeatFrequency | null }[] = [
    { title: 'Nie powtarzaj', value: null },
    { title: 'Codziennie', value: 'daily' },
    { title: 'Co tydzień', value: 'weekly' },
    { title: 'Co miesiąc, tego samego dnia', value: 'monthly' },
]

export function CalendarEntryForm({
    calendar,
    kind,
    entry,
    initialDate,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    calendar: Calendar
    kind: CalendarEntryKind
    entry?: CalendarEntry
    initialDate?: string
    onSuccess: (warnings?: CalendarEventWarning[]) => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const event = entry?.kind === 'event' ? entry : undefined

    const instant =
        entry?.kind === 'reminder'
            ? entry.remindAt
            : entry?.kind === 'deadline'
              ? entry.dueAt
              : event?.startAt

    const initial = instant
        ? calendarDateParts(instant, calendar.timeZone)
        : {
              date:
                  initialDate ??
                  calendarDateParts(new Date(), calendar.timeZone).date,
              time: '09:00',
          }

    const [title, setTitle] = useState(entry?.title ?? '')

    const [description, setDescription] = useState(
        entry && entry.kind !== 'reminder' ? (entry.description ?? '') : '',
    )

    const [typeId, setTypeId] = useState<number | null>(
        event?.taskTypeId ?? null,
    )

    const [date, setDate] = useState(
        event?.weekStart ?? event?.date ?? initial.date,
    )

    const [startTime, setStartTime] = useState(initial.time)

    const [endTime, setEndTime] = useState(
        event?.endAt
            ? calendarDateParts(event.endAt, calendar.timeZone).time
            : '10:00',
    )

    const [withoutTime, setWithoutTime] = useState(
        Boolean(event?.date || event?.weekStart),
    )

    const [weekTask, setWeekTask] = useState(Boolean(event?.weekStart))

    const [location, setLocation] = useState(event?.location ?? '')

    const [repeat, setRepeat] = useState<RepeatFrequency | null>(
        event?.repeat ?? null,
    )

    const [repeatUntil, setRepeatUntil] = useState(event?.repeatUntil ?? '')

    const [seriesScope, setSeriesScope] = useState<SeriesScope>('one')

    const canManageRepeat =
        !entry || Boolean(event?.seriesKey && seriesScope !== 'one')

    const [clientStageId, setClientStageId] = useState<number | null>(null)

    const [reminderMinutes, setReminderMinutes] = useState(
        entry?.kind === 'deadline' ? entry.reminderMinutes : [],
    )

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const typeQuery = useInfiniteTaskTypes({ isActive: true })

    const types = typeQuery.data?.pages.flatMap((page) => page.rows) ?? []

    const chosenTypeId =
        typeId ?? types.find((type) => type.isDefault)?.id ?? null

    const selectedType =
        types.find((type) => type.id === chosenTypeId) ??
        (event?.taskType?.id === chosenTypeId ? event.taskType : undefined)

    const createEvent = useCreateCalendarEvent()

    const updateEvent = useUpdateCalendarEvent()

    const createReminder = useCreateCalendarReminder()

    const updateReminder = useUpdateCalendarReminder()

    const createDeadline = useCreateCalendarDeadline()

    const updateDeadline = useUpdateCalendarDeadline()

    const isPending = [
        createEvent,
        updateEvent,
        createReminder,
        updateReminder,
        createDeadline,
        updateDeadline,
    ].some((mutation) => mutation.isPending)

    useEffect(() => {
        onPendingChange?.(isPending)
    }, [isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function submit() {
        if (controller.current) return

        setError(undefined)

        const trimmedTitle = title.trim()

        if (!trimmedTitle || trimmedTitle.length > 255) {
            setError('Nazwa musi mieć od 1 do 255 znaków.')

            return
        }

        const originalStart = instant
            ? calendarDateParts(instant, calendar.timeZone)
            : undefined

        const originalEnd = event?.endAt
            ? calendarDateParts(event.endAt, calendar.timeZone)
            : undefined

        const startAt =
            instant &&
            originalStart?.date === date &&
            originalStart.time === startTime
                ? instant
                : localDateTimeToIso(date, startTime, calendar.timeZone)

        const endAt =
            event?.endAt &&
            originalEnd?.date === date &&
            originalEnd.time === endTime
                ? event.endAt
                : localDateTimeToIso(date, endTime, calendar.timeZone)

        if (
            !localDateTimeToIso(date, '12:00', calendar.timeZone) ||
            (!withoutTime && kind === 'event' && (!startAt || !endAt)) ||
            (kind !== 'event' && !startAt)
        ) {
            setError(
                'Wybierz poprawną datę i godzinę. Przy zmianie czasu ta godzina może nie istnieć.',
            )

            return
        }

        if (
            kind === 'event' &&
            !withoutTime &&
            startAt &&
            endAt &&
            new Date(startAt).getTime() >= new Date(endAt).getTime()
        ) {
            setError('Koniec musi być później niż początek, w tym samym dniu.')

            return
        }

        if (kind === 'event' && !chosenTypeId) {
            setError('Wybierz typ wydarzenia.')

            return
        }

        if (
            canManageRepeat &&
            repeat &&
            (!repeatUntil ||
                ((!entry || seriesScope !== 'all') && repeatUntil < date) ||
                !localDateTimeToIso(repeatUntil, '12:00', calendar.timeZone))
        ) {
            setError(
                'Wybierz datę końca powtarzania, nie wcześniejszą niż wydarzenie.',
            )

            return
        }

        if (description.length > 10000 || location.length > 500) {
            setError('Skróć opis do 10 000 znaków i miejsce do 500 znaków.')

            return
        }

        controller.current = new AbortController()

        const signal = controller.current.signal

        try {
            if (kind === 'event' && chosenTypeId) {
                const scheduleChanged =
                    !event ||
                    (withoutTime
                        ? (weekTask
                              ? event.weekStart !== calendarWeekStart(date) ||
                                event.date != null
                              : event.date !== date ||
                                event.weekStart != null) ||
                          event.startAt != null ||
                          event.endAt != null
                        : event.date != null ||
                          event.weekStart != null ||
                          event.startAt !== startAt ||
                          event.endAt !== endAt)

                const dto: CreateCalendarEventDto = {
                    title: trimmedTitle,
                    taskTypeId: chosenTypeId,
                    description:
                        description.trim() || (entry ? null : undefined),
                    location: location.trim() || (entry ? null : undefined),
                    ...(scheduleChanged
                        ? {
                              date: withoutTime && !weekTask ? date : null,
                              ...(withoutTime && weekTask
                                  ? { weekStart: calendarWeekStart(date) }
                                  : event?.weekStart
                                    ? { weekStart: null }
                                    : {}),
                              startAt: withoutTime ? null : startAt,
                              endAt: withoutTime ? null : endAt,
                          }
                        : {}),
                    ...(!entry && clientStageId ? { clientStageId } : {}),
                    ...(!entry && repeat ? { repeat, repeatUntil } : {}),
                    ...(event && canManageRepeat && repeat !== event.repeat
                        ? {
                              repeat,
                              ...(repeat === null ? { repeatUntil: null } : {}),
                          }
                        : {}),
                    ...(event &&
                    canManageRepeat &&
                    repeat &&
                    repeatUntil !== event.repeatUntil
                        ? { repeatUntil }
                        : {}),
                }

                const result = event
                    ? await updateEvent.mutateAsync({
                          calendarId: calendar.id,
                          id: event.id,
                          dto,
                          query: { seriesScope },
                          signal,
                      })
                    : await createEvent.mutateAsync({
                          calendarId: calendar.id,
                          dto,
                          signal,
                      })

                onSuccess(result.warnings)
            } else if (kind === 'reminder' && startAt) {
                const dto = {
                    title: trimmedTitle,
                    remindAt: startAt,
                    ...(!entry && clientStageId ? { clientStageId } : {}),
                }

                if (entry)
                    await updateReminder.mutateAsync({
                        calendarId: calendar.id,
                        id: entry.id,
                        dto,
                        signal,
                    })
                else
                    await createReminder.mutateAsync({
                        calendarId: calendar.id,
                        dto,
                        signal,
                    })

                onSuccess()
            } else if (kind === 'deadline' && startAt) {
                const dto = {
                    title: trimmedTitle,
                    description:
                        description.trim() || (entry ? null : undefined),
                    dueAt: startAt,
                    reminderMinutes: [...reminderMinutes].sort((a, b) => b - a),
                    ...(!entry && clientStageId ? { clientStageId } : {}),
                }

                if (entry)
                    await updateDeadline.mutateAsync({
                        calendarId: calendar.id,
                        id: entry.id,
                        dto,
                        signal,
                    })
                else
                    await createDeadline.mutateAsync({
                        calendarId: calendar.id,
                        dto,
                        signal,
                    })

                onSuccess()
            }
        } catch {
            if (!signal.aborted)
                setError(
                    'Nie udało się zapisać. Sprawdź dane i spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label={
                entry
                    ? 'Edycja wpisu w kalendarzu'
                    : 'Tworzenie wpisu w kalendarzu'
            }
            isPending={isPending}
            submitDisabled={kind === 'event' && !chosenTypeId}
            submitTitle={entry ? 'Zapisz zmiany' : 'Dodaj'}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            <TextInput
                inputTitle={
                    kind === 'reminder' ? 'Treść przypomnienia' : 'Nazwa'
                }
                value={title}
                onChange={setTitle}
                maxLength={255}
                required
                autoComplete="off"
                placeholder={kind === 'event' ? 'Co planujesz?' : undefined}
            />
            {kind === 'event' && (
                <>
                    <FormTaskTypeInput
                        value={chosenTypeId}
                        onChange={setTypeId}
                        selectedType={selectedType}
                        disabled={isPending}
                    />
                    <label className={c.checkbox}>
                        <input
                            type="checkbox"
                            checked={withoutTime}
                            onChange={(change) =>
                                setWithoutTime(change.target.checked)
                            }
                        />
                        {weekTask && withoutTime
                            ? 'Bez godziny — zadanie na tydzień'
                            : 'Bez godziny — zadanie na dzień'}
                    </label>
                    {withoutTime && (
                        <FormSelect
                            selectTitle="Zakres zadania"
                            value={weekTask ? 'week' : 'day'}
                            onChange={(value) => {
                                setWeekTask(value === 'week')

                                if (
                                    value === 'week' &&
                                    repeat &&
                                    repeat !== 'weekly'
                                )
                                    setRepeat(null)
                            }}
                            options={[
                                { title: 'Na dzień', value: 'day' },
                                { title: 'Na tydzień', value: 'week' },
                            ]}
                        />
                    )}
                </>
            )}
            {kind === 'event' && withoutTime ? (
                <TextInput
                    inputTitle={
                        weekTask ? 'Dowolny dzień wybranego tygodnia' : 'Data'
                    }
                    type="date"
                    value={date}
                    onChange={setDate}
                    min="1000-01-01"
                    max="9999-12-31"
                    required
                />
            ) : (
                <FormDateTimeInput
                    date={date}
                    time={startTime}
                    onDateChange={setDate}
                    onTimeChange={setStartTime}
                    timeTitle={kind === 'event' ? 'Od' : 'Godzina'}
                    disabled={isPending}
                />
            )}
            {kind === 'event' && !withoutTime && (
                <TextInput
                    inputTitle="Do"
                    type="time"
                    value={endTime}
                    onChange={setEndTime}
                    required
                />
            )}
            {kind === 'event' && (
                <div
                    className={c.hint}
                    style={{ color: selectedType?.color ?? 'var(--primary)' }}
                >
                    <Bell size={16} aria-hidden="true" />
                    <div>
                        {withoutTime ? (
                            <p>
                                {weekTask
                                    ? isCalendarDateInRange(date)
                                        ? `${calendarDateLabel(calendarWeekStart(date))} – ${calendarDateLabel(addCalendarDays(calendarWeekStart(date), 6))}. Bez konkretnego dnia.`
                                        : 'Wybierz tydzień.'
                                    : 'Tylko data.'}{' '}
                                Przypomnienia są wyłączone.
                            </p>
                        ) : (
                            <>
                                <strong>Przypomnienia z typu wydarzenia</strong>
                                <p>
                                    {selectedType?.reminderMinutes.length
                                        ? selectedType.reminderMinutes
                                              .map(reminderOffsetLabel)
                                              .join(' · ')
                                        : 'Bez przypomnień e-mail.'}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
            {event?.seriesKey && (
                <div className={c.series}>
                    <p>
                        <Repeat size={14} aria-hidden="true" /> Wydarzenie jest
                        częścią serii.
                    </p>
                    <FormSelect
                        selectTitle="Zastosuj zmiany do"
                        options={scopes}
                        value={seriesScope}
                        onChange={setSeriesScope}
                    />
                    {seriesScope === 'one' && (
                        <p>
                            Zmiana powtarzania jest dostępna dla całej serii lub
                            tego i kolejnych wydarzeń.
                        </p>
                    )}
                </div>
            )}
            {kind === 'event' && canManageRepeat && (
                <>
                    <FormSelect
                        selectTitle="Powtarzanie"
                        options={
                            withoutTime && weekTask
                                ? repetitions.filter(
                                      (option) =>
                                          !option.value ||
                                          option.value === 'weekly',
                                  )
                                : repetitions
                        }
                        value={repeat}
                        onChange={(value) => {
                            setRepeat(value)

                            if (value) setClientStageId(null)
                        }}
                    />
                    {repeat && (
                        <TextInput
                            inputTitle="Powtarzaj do"
                            type="date"
                            value={repeatUntil}
                            onChange={setRepeatUntil}
                            min={
                                entry && seriesScope === 'all'
                                    ? undefined
                                    : date
                            }
                            required
                            hint="Włącznie z tą datą, maksymalnie przez 5 lat."
                        />
                    )}
                </>
            )}
            {entry?.clientStageId && (
                <p className={c.link}>
                    <Link2 size={14} aria-hidden="true" /> Powiązane z etapem
                    klienta.
                </p>
            )}
            {!entry && !repeat && (
                <CalendarStageInput
                    managerId={calendar.managerId}
                    value={clientStageId}
                    onChange={setClientStageId}
                    disabled={isPending}
                />
            )}
            {kind === 'event' && (
                <TextInput
                    inputTitle="Miejsce (opcjonalnie)"
                    value={location}
                    onChange={setLocation}
                    maxLength={500}
                    autoComplete="off"
                />
            )}
            {kind !== 'reminder' && (
                <FormTextarea
                    inputTitle="Opis (opcjonalnie)"
                    value={description}
                    onChange={setDescription}
                    maxLength={10000}
                    rows={3}
                />
            )}
            {kind === 'deadline' && (
                <FormReminderInput
                    inputTitle="Przypomnienia e-mail"
                    value={reminderMinutes}
                    onChange={setReminderMinutes}
                    disabled={isPending}
                />
            )}
            {kind === 'reminder' && (
                <p className={c.link}>
                    <Bell size={14} aria-hidden="true" /> Jednorazowy e-mail o
                    wybranej godzinie.
                </p>
            )}
        </FormContainer>
    )
}
