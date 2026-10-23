'use client'

import { useState } from 'react'
import { Link2, X } from 'lucide-react'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { Button } from '@/components/ui/button/Button'
import {
    useInfiniteCalendarClientProcesses,
    useInfiniteCalendarClientStages,
    useInfiniteCalendarClients,
} from '@/shared/hooks/useCalendar'
import c from './CalendarStageInput.module.scss'

function StagePicker({
    managerId,
    value,
    onChange,
    disabled,
}: {
    managerId: number
    value: number | null
    onChange: (value: number | null) => void
    disabled?: boolean
}) {
    const [clientId, setClientId] = useState<number | null>(null)

    const [processId, setProcessId] = useState<number | null>(null)

    const clients = useInfiniteCalendarClients({ managerId })

    const processes = useInfiniteCalendarClientProcesses(clientId)

    const stages = useInfiniteCalendarClientStages(clientId, processId)

    const clientRows = clients.data?.pages.flatMap((page) => page.rows) ?? []

    const processRows = processes.data?.pages.flatMap((page) => page.rows) ?? []

    const stageRows =
        stages.data?.pages
            .flatMap((page) => page.rows)
            .filter((stage) => stage.status !== 'done') ?? []

    return (
        <div className={c.fields}>
            <FormSelect
                selectTitle="Klient"
                value={clientId}
                onChange={(id) => {
                    setClientId(id)

                    setProcessId(null)

                    onChange(null)
                }}
                options={[
                    {
                        title: clients.isPending
                            ? 'Wczytywanie klientów…'
                            : 'Wybierz klienta',
                        value: null,
                    },
                    ...clientRows.map((client) => ({
                        title: [client.name, client.surname]
                            .filter(Boolean)
                            .join(' '),
                        value: client.id,
                    })),
                ]}
                disabled={disabled || clients.isPending}
            />
            {clients.hasNextPage && (
                <Button
                    type="button"
                    className={c.more}
                    pending={clients.isFetchingNextPage}
                    onClick={() => {
                        void clients.fetchNextPage()
                    }}
                >
                    Pokaż więcej klientów
                </Button>
            )}
            {clientId && (
                <FormSelect
                    selectTitle="Sprawa klienta"
                    value={processId}
                    onChange={(id) => {
                        setProcessId(id)

                        onChange(null)
                    }}
                    options={[
                        {
                            title: processes.isPending
                                ? 'Wczytywanie spraw…'
                                : 'Wybierz sprawę',
                            value: null,
                        },
                        ...processRows.map((process) => ({
                            title: process.title,
                            value: process.id,
                        })),
                    ]}
                    disabled={disabled || processes.isPending}
                    hint={
                        processes.isSuccess && !processRows.length
                            ? 'Ten klient nie ma otwartych spraw.'
                            : undefined
                    }
                />
            )}
            {processes.hasNextPage && (
                <Button
                    type="button"
                    className={c.more}
                    pending={processes.isFetchingNextPage}
                    onClick={() => {
                        void processes.fetchNextPage()
                    }}
                >
                    Pokaż więcej spraw
                </Button>
            )}
            {processId && (
                <FormSelect
                    selectTitle="Etap klienta"
                    value={value}
                    onChange={onChange}
                    options={[
                        {
                            title: stages.isPending
                                ? 'Wczytywanie etapów…'
                                : 'Wybierz etap',
                            value: null,
                        },
                        ...stageRows.map((stage) => ({
                            title: stage.title,
                            value: stage.id,
                        })),
                    ]}
                    disabled={disabled || stages.isPending}
                    hint={
                        stages.isSuccess && !stageRows.length
                            ? 'Brak otwartych etapów w tej sprawie.'
                            : undefined
                    }
                />
            )}
            {stages.hasNextPage && (
                <Button
                    type="button"
                    className={c.more}
                    pending={stages.isFetchingNextPage}
                    onClick={() => {
                        void stages.fetchNextPage()
                    }}
                >
                    Pokaż więcej etapów
                </Button>
            )}
            {[clients, processes, stages]
                .filter((query) => query.isError)
                .map((query, index) => (
                    <div className={c.error} role="alert" key={index}>
                        <span>Nie udało się wczytać danych.</span>
                        <button
                            type="button"
                            disabled={disabled || query.isFetching}
                            onClick={() => {
                                void query.refetch()
                            }}
                        >
                            Spróbuj ponownie
                        </button>
                    </div>
                ))}
            <p className={c.hint}>
                {value
                    ? 'Wpis będzie widoczny także w wybranym etapie.'
                    : 'Powiązanie zostanie dodane dopiero po wyborze etapu.'}
            </p>
        </div>
    )
}

export function CalendarStageInput({
    managerId,
    value,
    onChange,
    disabled,
}: {
    managerId: number
    value: number | null
    onChange: (value: number | null) => void
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false)

    return (
        <div className={c.field}>
            <button
                type="button"
                className={c.toggle}
                disabled={disabled}
                aria-expanded={open}
                onClick={() => {
                    if (open) onChange(null)

                    setOpen(!open)
                }}
            >
                <Link2 size={15} aria-hidden="true" />
                {open
                    ? 'Powiązanie z etapem klienta'
                    : 'Połącz z etapem klienta (opcjonalnie)'}
                {open && <X size={14} aria-hidden="true" />}
            </button>
            {open && (
                <StagePicker
                    managerId={managerId}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                />
            )}
        </div>
    )
}
