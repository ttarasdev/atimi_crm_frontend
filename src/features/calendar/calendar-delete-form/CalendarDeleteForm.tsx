'use client'

import { useEffect, useRef, useState } from 'react'
import type {
    CalendarEntry,
    DeleteScope,
    SeriesScope,
} from '@/api/calendars/calendars.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import {
    useDeleteCalendarDeadline,
    useDeleteCalendarEvent,
    useDeleteCalendarReminder,
} from '@/shared/hooks/useCalendar'
import c from './CalendarDeleteForm.module.scss'

export function CalendarDeleteForm({
    calendarId,
    entry,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    calendarId: number
    entry: CalendarEntry
    onSuccess: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const [seriesScope, setSeriesScope] = useState<SeriesScope>('one')

    const [deleteScope, setDeleteScope] = useState<DeleteScope>('local')

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const removeEvent = useDeleteCalendarEvent()

    const removeReminder = useDeleteCalendarReminder()

    const removeDeadline = useDeleteCalendarDeadline()

    const isPending =
        removeEvent.isPending ||
        removeReminder.isPending ||
        removeDeadline.isPending

    useEffect(() => {
        onPendingChange?.(isPending)
    }, [isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function remove() {
        if (controller.current) return

        setError(undefined)

        controller.current = new AbortController()

        const variables = {
            calendarId,
            id: entry.id,
            query: { seriesScope, deleteScope },
            signal: controller.current.signal,
        }

        try {
            if (entry.kind === 'event') await removeEvent.mutateAsync(variables)
            else if (entry.kind === 'reminder')
                await removeReminder.mutateAsync(variables)
            else await removeDeadline.mutateAsync(variables)

            onSuccess()
        } catch {
            if (!variables.signal.aborted)
                setError('Nie udało się usunąć wpisu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label="Usuwanie wpisu z kalendarza"
            isPending={isPending}
            error={error}
            submitTitle="Usuń"
            pendingTitle="Usuwanie…"
            onCancel={onCancel}
            onSubmit={() => {
                void remove()
            }}
        >
            <p className={c.message}>
                Usunąć „<strong>{entry.title}</strong>”?
            </p>
            {entry.kind === 'event' && entry.seriesKey && (
                <FormSelect
                    selectTitle="Które wydarzenia usunąć?"
                    value={seriesScope}
                    onChange={setSeriesScope}
                    options={[
                        { title: 'Tylko to wydarzenie', value: 'one' },
                        {
                            title: 'To i wszystkie następne',
                            value: 'following',
                        },
                        { title: 'Całą serię', value: 'all' },
                    ]}
                />
            )}
            {entry.clientStageId && (
                <FormSelect
                    selectTitle="Gdzie usunąć wpis?"
                    value={deleteScope}
                    onChange={setDeleteScope}
                    options={[
                        { title: 'Tylko z kalendarza', value: 'local' },
                        {
                            title: 'Z kalendarza i etapu klienta',
                            value: 'everywhere',
                        },
                    ]}
                    hint={
                        deleteScope === 'local'
                            ? 'Wpis pozostanie w etapie klienta.'
                            : 'Wpis zostanie usunięty także z etapu klienta.'
                    }
                />
            )}
        </FormContainer>
    )
}
