'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientProcessStagesApi } from '@/api/client-process-stages/client-process-stages.api'
import { clientProcessesQueryKeys } from '@/shared/query/client-processes-query'
import {
    Plus,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Layers,
    Pencil,
    Trash2,
    Check,
    RotateCcw,
    Play,
} from 'lucide-react'
import type { Calendar } from '@/api/calendars/calendars.types'
import type {
    ClientProcessStage,
    ClientProcessStageStatus,
} from '@/api/client-process-stages/client-process-stages.types'
import {
    useClientStages,
    useClientStageAction,
} from '@/shared/hooks/useClientStages'
import { useRoles } from '@/shared/hooks/useRoles'
import { Button } from '@/components/ui/button/Button'
import { ActionMenu } from '@/components/ui/action-menu/ActionMenu'
import { Popup } from '@/components/ui/popup/Popup'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { ClientQueryState } from '../ClientQueryState'
import { ClientConfirmForm } from '../ClientConfirmForm'
import { stageStatuses, clientActionError } from '../client-labels'
import { ClientStageForm } from './ClientStageForm'
import { ClientStageRecords } from '../stage-records/ClientStageRecords'
import c from '../Clients.module.scss'
import styles from './ClientStages.module.scss'

function SelectedStage({
    clientId,
    processId,
    stage,
    readonly,
    calendar,
    index,
    last,
    onFollowActive,
    selectedNoteId,
}: {
    clientId: number
    processId: number
    stage: ClientProcessStage
    readonly: boolean
    calendar?: Calendar
    index: number
    last: boolean
    selectedNoteId?: number
    onFollowActive: () => void
}) {
    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    const [editing, setEditing] = useState(false)

    const [deleting, setDeleting] = useState(false)

    const [status, setStatus] = useState<{
        value: ClientProcessStageStatus
        followActive: boolean
    } | null>(null)

    const [pending, setPending] = useState(false)

    const [error, setError] = useState<string>()

    const mutation = useClientStageAction()

    const closed = stage.status === 'done'

    const actionPending = pending || mutation.isPending

    const requestStatus = (value: ClientProcessStageStatus) =>
        setStatus({
            value,
            followActive:
                value === 'active' ||
                (value === 'done' && stage.status === 'active'),
        })

    const reorder = async (direction: 'up' | 'down') => {
        setError(undefined)

        try {
            await mutation.mutateAsync({
                clientId,
                processId,
                id: stage.id,
                action: 'order',
                direction,
            })
        } catch (caught) {
            setError(clientActionError(caught))
        }
    }

    return (
        <section
            className={styles.workspace}
            aria-label={`Wybrany etap ${stage.title}`}
        >
            <header className={styles.workspaceHeader}>
                <div className={styles.stageHeading}>
                    <div className={styles.titleRow}>
                        <h3>{stage.title}</h3>
                        <span
                            className={styles.status}
                            style={{ color: stage.color }}
                        >
                            {stageStatuses[stage.status]}
                        </span>
                    </div>
                    <p className={styles.metadata}>
                        <CalendarDays size={13} aria-hidden />
                        {stage.plannedAt
                            ? `Plan: ${new Date(stage.plannedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: calendar?.timeZone ?? 'Europe/Warsaw' })}`
                            : 'Bez zaplanowanej daty'}
                        <span>· Etap {index + 1}</span>
                    </p>
                </div>
                {!readonly && (
                    <div className={styles.actions}>
                        {closed ? (
                            <Button
                                className={styles.secondary}
                                disabled={actionPending}
                                onClick={() => requestStatus('active')}
                            >
                                <RotateCcw size={13} />
                                Otwórz etap
                            </Button>
                        ) : (
                            <>
                                {stage.status === 'planned' && (
                                    <Button
                                        className={styles.secondary}
                                        disabled={actionPending}
                                        onClick={() => requestStatus('active')}
                                    >
                                        <Play size={12} />
                                        Rozpocznij
                                    </Button>
                                )}
                                <Button
                                    className={styles.primary}
                                    disabled={actionPending}
                                    onClick={() => requestStatus('done')}
                                >
                                    <Check size={13} />
                                    Zakończ etap
                                </Button>
                                <ActionMenu
                                    label={`Opcje etapu ${stage.title}`}
                                    disabled={actionPending}
                                    items={[
                                        ...(isAdmin
                                            ? [
                                                  {
                                                      label: 'Edytuj etap',
                                                      icon: (
                                                          <Pencil size={14} />
                                                      ),
                                                      onSelect: () =>
                                                          setEditing(true),
                                                  },
                                              ]
                                            : []),
                                        {
                                            label: 'Przesuń w lewo',
                                            icon: <ChevronLeft size={14} />,
                                            disabled: index === 0,
                                            onSelect: () => void reorder('up'),
                                        },
                                        {
                                            label: 'Przesuń w prawo',
                                            icon: <ChevronRight size={14} />,
                                            disabled: last,
                                            onSelect: () =>
                                                void reorder('down'),
                                        },
                                        {
                                            label: 'Usuń etap',
                                            icon: <Trash2 size={14} />,
                                            danger: true,
                                            onSelect: () => setDeleting(true),
                                        },
                                    ]}
                                />
                            </>
                        )}
                    </div>
                )}
            </header>
            {error && (
                <p className={c.error} role="alert">
                    {error}
                </p>
            )}
            {closed && (
                <p className={c.warning}>
                    Etap został zakończony. Otwórz go ponownie, aby wprowadzać
                    zmiany.
                </p>
            )}
            <ClientStageRecords
                selectedNoteId={selectedNoteId}
                key={stage.id}
                scope={{ clientId, processId, stageId: stage.id }}
                readonly={readonly || closed}
                calendar={calendar}
            />
            {editing && isAdmin && (
                <Popup
                    title="Edytuj etap"
                    closeDisabled={pending}
                    onClose={() => setEditing(false)}
                >
                    <ClientStageForm
                        clientId={clientId}
                        processId={processId}
                        stage={stage}
                        calendar={calendar}
                        onSaved={() => setEditing(false)}
                        onCancel={() => setEditing(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Usuń etap"
                    closeDisabled={pending}
                    onClose={() => setDeleting(false)}
                >
                    <ClientConfirmForm
                        message="Usunięcie jest możliwe tylko dla pustego etapu. Najpierw usuń lub odłącz jego zadania, przypomnienia, terminy, notatki i dokumenty."
                        submitTitle="Usuń etap"
                        onConfirm={(signal) =>
                            mutation.mutateAsync({
                                clientId,
                                processId,
                                id: stage.id,
                                action: 'delete',
                                signal,
                            })
                        }
                        onSaved={() => setDeleting(false)}
                        onCancel={() => setDeleting(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {status && (
                <Popup
                    title={
                        status.value === 'done'
                            ? 'Zakończ etap'
                            : status.value === 'active'
                              ? 'Otwórz etap'
                              : 'Zmień status etapu'
                    }
                    closeDisabled={pending}
                    onClose={() => setStatus(null)}
                >
                    <ClientConfirmForm
                        message={
                            status.value === 'done'
                                ? status.followActive
                                    ? 'Po wykonaniu wszystkich zadań kolejny zaplanowany etap rozpocznie się automatycznie. Sprawa pozostanie otwarta.'
                                    : 'Wszystkie zadania etapu muszą być wykonane. Bieżący aktywny etap pozostanie bez zmian.'
                                : 'Ten etap stanie się aktywny. Dotychczas aktywny etap wróci do zaplanowanych.'
                        }
                        onConfirm={(signal) =>
                            mutation.mutateAsync({
                                clientId,
                                processId,
                                id: stage.id,
                                action: 'status',
                                status: status.value,
                                signal,
                            })
                        }
                        onSaved={() => {
                            if (status.followActive) onFollowActive()

                            setStatus(null)
                        }}
                        onCancel={() => setStatus(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}

export function ClientStages({
    clientId,
    processId,
    readonly,
    calendar,
    selectedStageId,
    requestedStageId,
    centerRequestedStage = true,
    onStageSelect,
    selectedNoteId,
}: {
    clientId: number
    processId: number
    readonly: boolean
    calendar?: Calendar
    selectedStageId?: number
    requestedStageId?: number
    centerRequestedStage?: boolean
    selectedNoteId?: number
    onStageSelect?: (id: number | undefined) => void
}) {
    const query = useClientStages(clientId, processId)

    const [create, setCreate] = useState(false)

    const [pending, setPending] = useState(false)

    const [localSelection, setLocalSelection] = useState<number>()

    const rail = useRef<HTMLDivElement>(null)

    const loaded = query.data?.pages.flatMap((page) => page.rows) ?? []

    const targetId = selectedStageId ?? localSelection

    const target = useQuery({
        queryKey: [
            ...clientProcessesQueryKeys.stages(clientId, processId),
            'detail',
            targetId,
        ],
        enabled:
            !!targetId &&
            targetId === requestedStageId &&
            !loaded.some((row) => row.id === targetId),
        queryFn: ({ signal }) => {
            if (!targetId) throw new Error('Stage ID required')

            return clientProcessStagesApi.getById(
                clientId,
                processId,
                targetId,
                { signal },
            )
        },
    })

    const rows =
        target.data && !loaded.some((row) => row.id === target.data.id)
            ? [...loaded, target.data].sort(
                  (a, b) => a.sortKey - b.sortKey || a.id - b.id,
              )
            : loaded

    const active = rows.find((stage) => stage.status === 'active')

    const fallback =
        active ??
        rows.find((stage) => stage.status === 'planned') ??
        rows.at(-1)

    const selected =
        rows.find((stage) => stage.id === targetId) ??
        (targetId && targetId === requestedStageId ? undefined : fallback)

    const selectedIndex = rows.findIndex((stage) => stage.id === selected?.id)

    const select = (id: number) => {
        setLocalSelection(id)

        onStageSelect?.(id)
    }

    const followActive = () => {
        setLocalSelection(undefined)

        onStageSelect?.(undefined)
    }

    const centerId =
        centerRequestedStage &&
        requestedStageId &&
        targetId === requestedStageId
            ? selected?.id
            : (active?.id ?? selected?.id)

    const activeId = active?.id

    const order = rows.map((stage) => stage.id).join(',')

    const {
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
    } = query

    useEffect(() => {
        if (
            !activeId &&
            hasNextPage &&
            !isFetchingNextPage &&
            !isFetchNextPageError
        )
            void fetchNextPage()
    }, [
        activeId,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
        fetchNextPage,
    ])

    useEffect(() => {
        const list = rail.current

        if (!list || !centerId) return

        const center = () => {
            const card = list.querySelector<HTMLButtonElement>(
                `[data-stage-id="${centerId}"]`,
            )

            if (!card) return

            const bounds = list.getBoundingClientRect()

            const cardBounds = card.getBoundingClientRect()

            list.scrollTo({
                left:
                    list.scrollLeft +
                    cardBounds.left -
                    bounds.left +
                    cardBounds.width / 2 -
                    list.clientWidth / 2,
            })
        }

        center()

        const observer = new ResizeObserver(center)

        observer.observe(list)

        return () => observer.disconnect()
    }, [centerId, order])

    return (
        <section className={styles.stages} aria-label="Etapy sprawy">
            <div className={styles.railArea}>
                <div
                    className={styles.rail}
                    ref={rail}
                    aria-label="Etapy współpracy"
                >
                    {rows.map((stage, index) => (
                        <div className={styles.railItem} key={stage.id}>
                            <button
                                type="button"
                                className={styles.stageCard}
                                style={{
                                    color:
                                        stage.status === 'active'
                                            ? '#FFFFFF'
                                            : stage.color,
                                    borderColor: stage.color,
                                    background:
                                        stage.status === 'active'
                                            ? stage.color
                                            : `${stage.color}0a`,
                                }}
                                aria-label={`Wybierz etap ${stage.title}`}
                                aria-current={
                                    stage.status === 'active'
                                        ? 'step'
                                        : undefined
                                }
                                aria-pressed={stage.id === selected?.id}
                                data-stage-id={stage.id}
                                onClick={() => select(stage.id)}
                                onFocus={(event) =>
                                    event.currentTarget.scrollIntoView({
                                        block: 'nearest',
                                        inline: 'nearest',
                                    })
                                }
                            >
                                <span className={styles.cardTop}>
                                    {stage.iconId ? (
                                        <ThemedIcon
                                            iconId={stage.iconId}
                                            size={24}
                                        />
                                    ) : (
                                        <Layers size={22} />
                                    )}
                                    <strong>{stage.title}</strong>
                                </span>
                                <span className={styles.cardStatus}>
                                    {stage.status === 'done' ? (
                                        <Check size={12} />
                                    ) : (
                                        <CalendarDays size={12} />
                                    )}
                                    {stageStatuses[stage.status]}
                                    {stage.plannedAt &&
                                        ` · ${new Date(stage.plannedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', timeZone: calendar?.timeZone ?? 'Europe/Warsaw' })}`}
                                </span>
                            </button>
                            {index < rows.length - 1 && (
                                <span className={styles.connector} aria-hidden>
                                    <span>+</span>
                                </span>
                            )}
                        </div>
                    ))}
                    {!readonly && (
                        <Button
                            className={styles.addStage}
                            onClick={() => setCreate(true)}
                        >
                            <Plus size={18} />
                            Dodaj etap
                        </Button>
                    )}
                </div>
                <div className={styles.railFooter}>
                    <span>
                        {query.data?.pages[0]?.total ?? 0} etapów ·{' '}
                        {rows.filter((stage) => stage.status === 'done').length}{' '}
                        zakończonych{query.hasNextPage ? ' wczytanych' : ''}
                    </span>
                    <div className={styles.scrollActions}>
                        <button
                            type="button"
                            aria-label="Przewiń etapy w lewo"
                            onClick={() =>
                                rail.current?.scrollBy({
                                    left: -240,
                                    behavior: 'smooth',
                                })
                            }
                        >
                            <ChevronLeft size={15} />
                        </button>
                        <button
                            type="button"
                            aria-label="Przewiń etapy w prawo"
                            onClick={() =>
                                rail.current?.scrollBy({
                                    left: 240,
                                    behavior: 'smooth',
                                })
                            }
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
                <ClientQueryState
                    pending={query.isPending}
                    error={query.isError}
                    empty={!rows.length}
                    onRetry={() => void query.refetch()}
                    emptyTitle="Wybierz etapy z konstruktora lub dodaj własny etap."
                />
                {query.hasNextPage && (
                    <Button
                        className={styles.secondary}
                        pending={query.isFetchingNextPage}
                        onClick={() => void query.fetchNextPage()}
                    >
                        Pokaż więcej etapów
                    </Button>
                )}
            </div>
            {target.isError && (
                <p role="alert">Nie można otworzyć wskazanego etapu.</p>
            )}
            {selected && (
                <SelectedStage
                    key={selected.id}
                    clientId={clientId}
                    processId={processId}
                    stage={selected}
                    readonly={readonly}
                    calendar={calendar}
                    index={selectedIndex}
                    last={
                        selectedIndex === rows.length - 1 && !query.hasNextPage
                    }
                    onFollowActive={followActive}
                    selectedNoteId={selectedNoteId}
                />
            )}
            {create && (
                <Popup
                    title="Nowy etap sprawy"
                    closeDisabled={pending}
                    onClose={() => setCreate(false)}
                >
                    <ClientStageForm
                        clientId={clientId}
                        processId={processId}
                        calendar={calendar}
                        onSaved={(stage) => {
                            select(stage.id)

                            setCreate(false)
                        }}
                        onCancel={() => setCreate(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}
