'use client'

import { useState } from 'react'
import type { Calendar } from '@/api/calendars/calendars.types'
import type {
    ClientProcessStage,
    CreateClientProcessStageDto,
} from '@/api/client-process-stages/client-process-stages.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormIconInput } from '@/components/form-components/form-icon-input/FormIconInput'
import { FormColorInput } from '@/components/form-components/form-color-input/FormColorInput'
import { FormDateTimeInput } from '@/components/form-components/form-date-time-input/FormDateTimeInput'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { useSaveClientStage } from '@/shared/hooks/useClientStages'
import { useInfiniteStageTemplates } from '@/shared/hooks/useStageTemplates'
import {
    calendarDateParts,
    localDateTimeToIso,
} from '@/features/calendar/calendar-date'
import { useClientSubmit } from '../useClientSubmit'
import c from '../Clients.module.scss'

export function ClientStageForm({
    clientId,
    processId,
    stage,
    calendar,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    clientId: number
    processId: number
    stage?: ClientProcessStage
    calendar?: Calendar
    onSaved: (stage: ClientProcessStage) => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const zone = calendar?.timeZone ?? 'Europe/Warsaw'

    const initial = stage?.plannedAt
        ? calendarDateParts(stage.plannedAt, zone)
        : { date: '', time: '09:00' }

    const [mode, setMode] = useState<'template' | 'manual'>(
        stage ? 'manual' : 'template',
    )

    const [templateId, setTemplateId] = useState<number | null>(null)

    const [title, setTitle] = useState(stage?.title ?? '')

    const [iconId, setIconId] = useState<number | null>(stage?.iconId ?? null)

    const [color, setColor] = useState(stage?.color ?? '#4676B4')

    const [planned, setPlanned] = useState(!!stage?.plannedAt)

    const [date, setDate] = useState(initial.date)

    const [time, setTime] = useState(initial.time)

    const templates = useInfiniteStageTemplates({ isActive: true })

    const rows = templates.data?.pages.flatMap((page) => page.rows) ?? []

    const selected = rows.find((row) => row.id === templateId)

    const mutation = useSaveClientStage()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label={
                stage ? 'Edycja etapu klienta' : 'Tworzenie etapu klienta'
            }
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle={stage ? 'Zapisz zmiany' : 'Dodaj etap'}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!stage && mode === 'template' && !templateId) {
                        submit.setError('Wybierz szablon etapu.')

                        return
                    }

                    if (mode === 'manual' && !title.trim()) {
                        submit.setError('Wpisz nazwę etapu.')

                        return
                    }

                    const plannedAt = planned
                        ? localDateTimeToIso(date, time, zone)
                        : null

                    if (planned && !plannedAt) {
                        submit.setError('Wybierz poprawną datę i godzinę.')

                        return
                    }

                    const dto: CreateClientProcessStageDto =
                        mode === 'template' && !stage
                            ? { stageTemplateId: templateId ?? undefined }
                            : { title: title.trim(), iconId, color }

                    if (plannedAt) dto.plannedAt = plannedAt
                    else if (stage?.plannedAt) dto.plannedAt = null

                    const saved = await mutation.mutateAsync({
                        clientId,
                        processId,
                        id: stage?.id,
                        dto,
                        signal,
                    })

                    if (!signal.aborted) onSaved(saved)
                })
            }
        >
            {!stage && (
                <div className={c.tabs}>
                    <button
                        type="button"
                        className={mode === 'template' ? c.selected : ''}
                        onClick={() => setMode('template')}
                    >
                        Z konstruktora
                    </button>
                    <button
                        type="button"
                        className={mode === 'manual' ? c.selected : ''}
                        onClick={() => setMode('manual')}
                    >
                        Własny etap
                    </button>
                </div>
            )}
            {mode === 'template' && !stage ? (
                <>
                    <FormSelect<number | null>
                        selectTitle="Szablon etapu"
                        value={templateId}
                        onChange={setTemplateId}
                        required
                        options={[
                            {
                                title: templates.isPending
                                    ? 'Wczytywanie…'
                                    : 'Wybierz etap',
                                value: null,
                            },
                            ...rows.map((row) => ({
                                title: row.title,
                                value: row.id,
                            })),
                        ]}
                    />
                    {templates.hasNextPage && (
                        <button
                            className={c.link}
                            type="button"
                            disabled={templates.isFetchingNextPage}
                            onClick={() => void templates.fetchNextPage()}
                        >
                            Więcej szablonów
                        </button>
                    )}
                    {templates.isError && (
                        <p className={c.error} role="alert">
                            Błąd wczytywania szablonów.{' '}
                            <button
                                type="button"
                                onClick={() => void templates.refetch()}
                            >
                                Spróbuj ponownie
                            </button>
                        </p>
                    )}
                    {selected && (
                        <div
                            className={c.record}
                            style={{
                                borderColor: selected.color,
                                background: `${selected.color}0a`,
                            }}
                        >
                            {selected.iconId && (
                                <ThemedIcon
                                    iconId={selected.iconId}
                                    color={selected.color}
                                    size={28}
                                />
                            )}
                            <div className={c.recordContent}>
                                <strong>{selected.title}</strong>
                                <p>
                                    {selected.description ||
                                        'Etap z zadaniami domyślnymi.'}
                                </p>
                            </div>
                        </div>
                    )}
                    <p className={c.hint}>
                        Nazwa, wygląd i zadania zostaną skopiowane. Późniejsze
                        zmiany szablonu nie zmienią tej sprawy.
                    </p>
                </>
            ) : (
                <>
                    <TextInput
                        inputTitle="Nazwa etapu"
                        value={title}
                        onChange={setTitle}
                        required
                        maxLength={150}
                    />
                    <FormIconInput
                        inputTitle="Ikona"
                        value={iconId}
                        onChange={setIconId}
                    />
                    <FormColorInput
                        inputTitle="Kolor"
                        value={color}
                        onChange={setColor}
                    />
                </>
            )}
            <label className={c.pair}>
                <input
                    type="checkbox"
                    checked={planned}
                    onChange={(e) => setPlanned(e.target.checked)}
                />
                Zaplanowana data etapu
            </label>
            {planned && (
                <FormDateTimeInput
                    date={date}
                    time={time}
                    onDateChange={setDate}
                    onTimeChange={setTime}
                    dateTitle="Data rozpoczęcia etapu"
                    timeTitle="Godzina"
                />
            )}
            <p className={c.hint}>
                Daty i kalendarz zadań ustalisz osobno. Domyślnych przypomnień
                nie dodajemy.
            </p>
        </FormContainer>
    )
}
