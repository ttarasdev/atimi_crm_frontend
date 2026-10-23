'use client'

import { useState } from 'react'
import type { Calendar, CalendarEvent } from '@/api/calendars/calendars.types'
import type {
    ClientStageScope,
    CreateClientStageTaskDto,
} from '@/api/client-stage-records/client-stage-records.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTaskTypeInput } from '@/components/form-components/form-task-type-input/FormTaskTypeInput'
import { FormDateTimeInput } from '@/components/form-components/form-date-time-input/FormDateTimeInput'
import { useInfiniteTaskTypes } from '@/shared/hooks/useTaskTypes'
import { useSaveClientStageRecord } from '@/shared/hooks/useClientStages'
import {
    calendarDateParts,
    localDateTimeToIso,
    reminderOffsetLabel,
} from '@/features/calendar/calendar-date'
import { useClientSubmit } from '../useClientSubmit'
import c from '../Clients.module.scss'
import { calendarWeekStart } from '@/features/calendar/calendar-view'

export function ClientStageTaskForm({
    scope,
    task,
    calendar,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    scope: ClientStageScope
    task?: CalendarEvent
    calendar?: Calendar
    onSaved: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const zone = calendar?.timeZone ?? task?.timeZone ?? 'Europe/Warsaw'

    const start = task?.startAt
        ? calendarDateParts(task.startAt, zone)
        : {
              date:
                  task?.weekStart ??
                  task?.date ??
                  calendarDateParts(new Date(), zone).date,
              time: '09:00',
          }

    const end = task?.endAt
        ? calendarDateParts(task.endAt, zone)
        : { time: '10:00' }

    const [title, setTitle] = useState(task?.title ?? '')

    const [description, setDescription] = useState(task?.description ?? '')

    const [typeId, setTypeId] = useState<number | null>(
        task?.taskTypeId ?? null,
    )

    const [scheduled, setScheduled] = useState(!!task?.calendarId)

    const [allDay, setAllDay] = useState(!!(task?.date || task?.weekStart))

    const [weekTask, setWeekTask] = useState(!!task?.weekStart)

    const [date, setDate] = useState(start.date)

    const [startTime, setStartTime] = useState(start.time)

    const [endTime, setEndTime] = useState(end.time)

    const [location, setLocation] = useState(task?.location ?? '')

    const types = useInfiniteTaskTypes({ isActive: true })

    const rows = types.data?.pages.flatMap((page) => page.rows) ?? []

    const chosenTypeId =
        typeId ?? rows.find((type) => type.isDefault)?.id ?? null

    const selectedType =
        rows.find((type) => type.id === chosenTypeId) ?? task?.taskType

    const save = useSaveClientStageRecord()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label={
                task ? 'Edycja zadania etapu' : 'Tworzenie zadania etapu'
            }
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle={task ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!title.trim() || !chosenTypeId) {
                        submit.setError('Wpisz nazwę i wybierz typ zadania.')

                        return
                    }

                    const dto: CreateClientStageTaskDto = {
                        title: title.trim(),
                        description: description.trim() || null,
                        taskTypeId: chosenTypeId,
                    }

                    if (scheduled) {
                        if (!calendar) {
                            submit.setError(
                                'Kalendarz opiekuna nie jest dostępny. Spróbuj ponownie po wczytaniu danych.',
                            )

                            return
                        }

                        dto.calendarId = calendar.id

                        dto.location = location.trim() || null

                        if (allDay) {
                            dto.date = weekTask ? null : date

                            if (weekTask)
                                dto.weekStart = calendarWeekStart(date)
                            else if (task?.weekStart) dto.weekStart = null

                            if (task) {
                                dto.startAt = null

                                dto.endAt = null
                            }
                        } else {
                            const startAt = localDateTimeToIso(
                                date,
                                startTime,
                                zone,
                            )

                            const endAt = localDateTimeToIso(
                                date,
                                endTime,
                                zone,
                            )

                            if (!startAt || !endAt || endAt <= startAt) {
                                submit.setError(
                                    'Wybierz poprawny zakres godzin w jednym dniu.',
                                )

                                return
                            }

                            dto.startAt = startAt

                            dto.endAt = endAt

                            if (task) {
                                dto.date = null

                                if (task.weekStart) dto.weekStart = null
                            }
                        }
                    } else if (task?.calendarId) {
                        dto.calendarId = null

                        dto.date = null

                        if (task.weekStart) dto.weekStart = null

                        dto.startAt = null

                        dto.endAt = null

                        dto.location = null
                    }

                    await save.mutateAsync({
                        ...scope,
                        kind: 'tasks',
                        id: task?.id,
                        dto,
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <TextInput
                inputTitle="Nazwa zadania"
                value={title}
                onChange={setTitle}
                required
                maxLength={255}
            />
            <FormTaskTypeInput
                inputTitle="Typ zadania"
                value={chosenTypeId}
                onChange={setTypeId}
                selectedType={selectedType}
            />
            <FormTextarea
                inputTitle="Opis zadania"
                value={description}
                onChange={setDescription}
                maxLength={10000}
                rows={3}
            />
            <label className={c.pair}>
                <input
                    type="checkbox"
                    checked={scheduled}
                    onChange={(e) => setScheduled(e.target.checked)}
                />
                Dodaj do kalendarza
            </label>
            {scheduled ? (
                <div className={c.calendarFields}>
                    <label className={c.pair}>
                        <input
                            type="checkbox"
                            checked={allDay}
                            onChange={(e) => setAllDay(e.target.checked)}
                        />
                        {weekTask && allDay
                            ? 'Bez godziny — zadanie na tydzień'
                            : 'Bez godziny — zadanie na dzień'}
                    </label>
                    {allDay && (
                        <FormSelect
                            selectTitle="Zakres zadania"
                            value={weekTask ? 'week' : 'day'}
                            onChange={(value) => setWeekTask(value === 'week')}
                            options={[
                                { title: 'Na dzień', value: 'day' },
                                { title: 'Na tydzień', value: 'week' },
                            ]}
                        />
                    )}
                    {allDay ? (
                        <TextInput
                            inputTitle={
                                weekTask
                                    ? 'Dowolny dzień wybranego tygodnia'
                                    : 'Data zadania'
                            }
                            value={date}
                            onChange={setDate}
                            type="date"
                            required
                            min="1000-01-01"
                            max="9999-12-31"
                        />
                    ) : (
                        <>
                            <FormDateTimeInput
                                date={date}
                                time={startTime}
                                onDateChange={setDate}
                                onTimeChange={setStartTime}
                                dateTitle="Data wydarzenia"
                                timeTitle="Od godziny"
                            />
                            <TextInput
                                inputTitle="Do godziny"
                                value={endTime}
                                onChange={setEndTime}
                                type="time"
                                required
                            />
                        </>
                    )}
                    <TextInput
                        inputTitle="Miejsce"
                        value={location}
                        onChange={setLocation}
                        maxLength={500}
                        placeholder="Adres lub link do spotkania"
                    />
                    <p className={c.hint}>
                        {allDay
                            ? weekTask
                                ? 'Zadanie na cały tydzień, bez konkretnego dnia. Przypomnienia są wyłączone.'
                                : 'Tylko data. Przypomnienia są wyłączone.'
                            : `Przypomnienia z typu: ${selectedType?.reminderMinutes.map(reminderOffsetLabel).join(', ') || 'brak'}.`}{' '}
                        · {zone}
                    </p>
                </div>
            ) : (
                <p className={c.hint}>
                    Zwykłe zadanie w etapie bez daty, godziny i powiadomień.
                </p>
            )}
            {selectedType && !selectedType.isActive && (
                <p className={c.warning}>
                    Typ archiwalny. Możesz zachować go przy edycji lub wybrać
                    aktywny.
                </p>
            )}
        </FormContainer>
    )
}
