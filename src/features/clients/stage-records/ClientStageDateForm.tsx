'use client'

import { useState } from 'react'
import type {
    Calendar,
    CalendarReminder,
    CalendarDeadline,
} from '@/api/calendars/calendars.types'
import type { ClientStageScope } from '@/api/client-stage-records/client-stage-records.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { FormDateTimeInput } from '@/components/form-components/form-date-time-input/FormDateTimeInput'
import { FormReminderInput } from '@/components/form-components/form-reminder-input/FormReminderInput'
import { useSaveClientStageRecord } from '@/shared/hooks/useClientStages'
import {
    calendarDateParts,
    localDateTimeToIso,
} from '@/features/calendar/calendar-date'
import { useClientSubmit } from '../useClientSubmit'
import c from '../Clients.module.scss'

export function ClientStageDateForm({
    scope,
    kind,
    entry,
    calendar,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    scope: ClientStageScope
    kind: 'reminders' | 'deadlines'
    entry?: CalendarReminder | CalendarDeadline
    calendar?: Calendar
    onSaved: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const zone = calendar?.timeZone ?? 'Europe/Warsaw'

    const at = entry
        ? 'remindAt' in entry
            ? entry.remindAt
            : entry.dueAt
        : null

    const initial = at
        ? calendarDateParts(at, zone)
        : { date: calendarDateParts(new Date(), zone).date, time: '10:00' }

    const [title, setTitle] = useState(entry?.title ?? '')

    const [description, setDescription] = useState(
        entry && 'description' in entry ? (entry.description ?? '') : '',
    )

    const [date, setDate] = useState(initial.date)

    const [time, setTime] = useState(initial.time)

    const [minutes, setMinutes] = useState(
        entry && 'reminderMinutes' in entry ? entry.reminderMinutes : [60],
    )

    const save = useSaveClientStageRecord()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label={
                kind === 'reminders' ? 'Przypomnienie etapu' : 'Termin etapu'
            }
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    const iso = localDateTimeToIso(date, time, zone)

                    if (!title.trim() || !iso) {
                        submit.setError(
                            'Wpisz nazwę oraz poprawną datę i godzinę.',
                        )

                        return
                    }

                    if (kind === 'reminders')
                        await save.mutateAsync({
                            ...scope,
                            kind,
                            id: entry?.id,
                            dto: { title: title.trim(), remindAt: iso },
                            signal,
                        })
                    else
                        await save.mutateAsync({
                            ...scope,
                            kind,
                            id: entry?.id,
                            dto: {
                                title: title.trim(),
                                description: description.trim() || null,
                                dueAt: iso,
                                reminderMinutes: minutes,
                            },
                            signal,
                        })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <TextInput
                inputTitle={
                    kind === 'reminders'
                        ? 'Treść przypomnienia'
                        : 'Nazwa terminu'
                }
                value={title}
                onChange={setTitle}
                required
                maxLength={255}
            />
            <FormDateTimeInput
                date={date}
                time={time}
                onDateChange={setDate}
                onTimeChange={setTime}
            />
            {kind === 'deadlines' && (
                <>
                    <FormTextarea
                        inputTitle="Opis terminu"
                        value={description}
                        onChange={setDescription}
                        maxLength={10000}
                        rows={3}
                    />
                    <FormReminderInput
                        inputTitle="Przypomnienia e-mail"
                        value={minutes}
                        onChange={setMinutes}
                    />
                </>
            )}
            <p className={c.hint}>
                Wpis automatycznie trafi do kalendarza opiekuna klienta. {zone}
            </p>
        </FormContainer>
    )
}
