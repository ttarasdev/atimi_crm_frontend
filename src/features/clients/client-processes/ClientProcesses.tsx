'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientProcessesApi } from '@/api/client-processes/client-processes.api'
import { clientProcessesQueryKeys } from '@/shared/query/client-processes-query'
import {
    Plus,
    BriefcaseBusiness,
    ChevronDown,
    Pencil,
    RotateCcw,
    Check,
    Archive,
} from 'lucide-react'
import type {
    ClientProcess,
    ClientProcessStatus,
} from '@/api/client-processes/client-processes.types'
import type { Calendar } from '@/api/calendars/calendars.types'
import {
    useClientProcesses,
    useClientProcessStatus,
} from '@/shared/hooks/useClientProcesses'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { ClientQueryState } from '../ClientQueryState'
import { ClientConfirmForm } from '../ClientConfirmForm'
import { processStatuses } from '../client-labels'
import { ClientProcessForm } from './ClientProcessForm'
import { ClientStages } from '../client-stages/ClientStages'
import c from '../Clients.module.scss'
import styles from './ClientProcesses.module.scss'

function ProcessCard({
    clientId,
    process,
    readonly,
    calendar,
    first,
    initialStageId,
    selectedNoteId,
}: {
    clientId: number
    process: ClientProcess
    readonly: boolean
    calendar?: Calendar
    first: boolean
    initialStageId?: number
    selectedNoteId?: number
}) {
    const [open, setOpen] = useState(first)

    const [centerRequestedStage, setCenterRequestedStage] = useState(true)

    const [selectedStageId, setSelectedStageId] = useState<number | undefined>(
        initialStageId,
    )

    const [editing, setEditing] = useState(false)

    const [status, setStatus] = useState<ClientProcessStatus | null>(null)

    const [pending, setPending] = useState(false)

    const mutation = useClientProcessStatus()

    const closed = process.status !== 'active'

    return (
        <details
            className={styles.process}
            open={open}
            onToggle={(event) => {
                const nextOpen = event.currentTarget.open

                if (!nextOpen) setCenterRequestedStage(false)

                setOpen(nextOpen)
            }}
        >
            <summary
                aria-label={`${open ? 'Zwiń' : 'Rozwiń'} sprawę ${process.title}`}
            >
                <BriefcaseBusiness size={18} />
                <strong>{process.title}</strong>
                <span
                    className={c.badge}
                    style={{ color: closed ? '#6B7FA6' : '#4676B4' }}
                >
                    {processStatuses[process.status]}
                </span>
                <ChevronDown size={17} />
            </summary>
            {open && (
                <div className={styles.body}>
                    <div className={styles.processToolbar}>
                        <span className={c.muted}>
                            Utworzono{' '}
                            {new Date(process.createdAt).toLocaleDateString(
                                'pl-PL',
                            )}
                            {process.completedAt &&
                                ` · Zakończono ${new Date(process.completedAt).toLocaleDateString('pl-PL')}`}
                        </span>
                        {!readonly && (
                            <div className={c.actions}>
                                {closed ? (
                                    <Button
                                        className={c.secondary}
                                        onClick={() => setStatus('active')}
                                    >
                                        <RotateCcw size={14} />
                                        Otwórz ponownie
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            className={c.iconButton}
                                            aria-label={`Edytuj sprawę ${process.title}`}
                                            onClick={() => setEditing(true)}
                                        >
                                            <Pencil size={14} />
                                        </Button>
                                        <Button
                                            className={c.secondary}
                                            onClick={() =>
                                                setStatus('completed')
                                            }
                                        >
                                            <Check size={14} />
                                            Zakończ sprawę
                                        </Button>
                                        <Button
                                            className={c.iconButton}
                                            aria-label={`Archiwizuj sprawę ${process.title}`}
                                            onClick={() =>
                                                setStatus('archived')
                                            }
                                        >
                                            <Archive size={14} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {process.caseData &&
                        Object.values(process.caseData).some(Boolean) && (
                            <dl
                                className={`${c.recordInfo} ${styles.caseData}`}
                            >
                                {(
                                    [
                                        ['serviceType', 'Usługa'],
                                        ['office', 'Urząd'],
                                        ['referenceNumber', 'Numer sprawy'],
                                        ['submittedAt', 'Złożenie'],
                                        ['fingerprintsAt', 'Odciski palców'],
                                        ['decisionAt', 'Decyzja'],
                                        ['collectionAt', 'Odbiór karty'],
                                    ] as const
                                ).map(([key, label]) =>
                                    process.caseData?.[key] ? (
                                        <div key={key}>
                                            <dt>{label}</dt>
                                            <dd>{process.caseData[key]}</dd>
                                        </div>
                                    ) : null,
                                )}
                            </dl>
                        )}
                    {closed && (
                        <p className={c.warning}>
                            Sprawa jest zamknięta. Otwórz ją ponownie, aby
                            edytować jej zawartość.
                        </p>
                    )}
                    <ClientStages
                        clientId={clientId}
                        processId={process.id}
                        readonly={readonly || closed}
                        calendar={calendar}
                        selectedStageId={selectedStageId}
                        requestedStageId={initialStageId}
                        centerRequestedStage={centerRequestedStage}
                        selectedNoteId={selectedNoteId}
                        onStageSelect={setSelectedStageId}
                    />
                </div>
            )}
            {editing && (
                <Popup
                    title="Edytuj sprawę"
                    closeDisabled={pending}
                    onClose={() => setEditing(false)}
                >
                    <ClientProcessForm
                        clientId={clientId}
                        process={process}
                        onSaved={() => setEditing(false)}
                        onCancel={() => setEditing(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {status && (
                <Popup
                    title={
                        status === 'active'
                            ? 'Otwórz sprawę ponownie'
                            : status === 'completed'
                              ? 'Zakończ sprawę'
                              : 'Archiwizuj sprawę'
                    }
                    closeDisabled={pending}
                    onClose={() => setStatus(null)}
                >
                    <ClientConfirmForm
                        message={
                            status === 'completed'
                                ? 'Sprawę można zakończyć po wykonaniu wszystkich zadań i zamknięciu etapów.'
                                : status === 'archived'
                                  ? 'Sprawa zostanie zachowana w archiwum. Możesz ją później otworzyć ponownie.'
                                  : 'Sprawa ponownie stanie się dostępna do edycji.'
                        }
                        onConfirm={(signal) =>
                            mutation.mutateAsync({
                                clientId,
                                id: process.id,
                                status,
                                signal,
                            })
                        }
                        onSaved={() => setStatus(null)}
                        onCancel={() => setStatus(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </details>
    )
}

export function ClientProcesses({
    clientId,
    readonly,
    calendar,
    selectedProcessId,
    selectedStageId,
    selectedNoteId,
}: {
    clientId: number
    readonly: boolean
    calendar?: Calendar
    selectedProcessId?: number
    selectedStageId?: number
    selectedNoteId?: number
}) {
    const query = useClientProcesses(clientId)

    const [create, setCreate] = useState(false)

    const [pending, setPending] = useState(false)

    const loaded = query.data?.pages.flatMap((page) => page.rows) ?? []

    const target = useQuery({
        queryKey: [
            ...clientProcessesQueryKeys.lists(clientId),
            'detail',
            selectedProcessId,
        ],
        enabled:
            !!selectedProcessId &&
            !loaded.some((row) => row.id === selectedProcessId),
        queryFn: ({ signal }) => {
            if (!selectedProcessId) throw new Error('Process ID required')

            return clientProcessesApi.getById(clientId, selectedProcessId, {
                signal,
            })
        },
    })

    const rows =
        target.data && !loaded.some((row) => row.id === target.data.id)
            ? [target.data, ...loaded]
            : loaded

    return (
        <section className={styles.processes} aria-label="Sprawy klienta">
            <header className={styles.sectionHeading}>
                <h2>
                    Sprawy klienta{' '}
                    <span>{query.data?.pages[0]?.total ?? 0}</span>
                </h2>
            </header>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
                emptyTitle="Ten klient nie ma jeszcze spraw. Dodaj pierwszą, a następnie wybierz etapy."
            />
            {target.isError && (
                <p role="alert">Nie można otworzyć wskazanej sprawy.</p>
            )}
            {rows.map((process, index) => (
                <ProcessCard
                    key={process.id}
                    clientId={clientId}
                    process={process}
                    readonly={readonly}
                    calendar={calendar}
                    first={
                        selectedProcessId
                            ? process.id === selectedProcessId
                            : index === 0
                    }
                    initialStageId={
                        process.id === selectedProcessId
                            ? selectedStageId
                            : undefined
                    }
                    selectedNoteId={
                        process.id === selectedProcessId
                            ? selectedNoteId
                            : undefined
                    }
                />
            ))}
            {query.hasNextPage && (
                <Button
                    className={c.secondary}
                    pending={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                >
                    Pokaż więcej spraw
                </Button>
            )}
            {!readonly && (
                <button
                    type="button"
                    className={styles.newProcess}
                    onClick={() => setCreate(true)}
                >
                    <span>
                        <Plus size={17} /> Dodaj sprawę
                    </span>
                    <ChevronDown size={15} />
                </button>
            )}
            {create && (
                <Popup
                    title="Nowa sprawa klienta"
                    closeDisabled={pending}
                    onClose={() => setCreate(false)}
                >
                    <ClientProcessForm
                        clientId={clientId}
                        onSaved={() => setCreate(false)}
                        onCancel={() => setCreate(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}
