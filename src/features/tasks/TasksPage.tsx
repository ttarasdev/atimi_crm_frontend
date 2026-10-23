'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CheckCheck,
    CircleCheck,
    Clock3,
    Flag,
    ListTodo,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    Trash2,
    UserRound,
} from 'lucide-react'
import type {
    Task,
    TaskPriority,
    TaskScope,
    TaskStatus,
    TaskView,
} from '@/api/tasks/tasks.types'
import { Button } from '@/components/ui/button/Button'
import { ActionMenu } from '@/components/ui/action-menu/ActionMenu'
import { Popup } from '@/components/ui/popup/Popup'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import {
    useTasks,
    useTask,
    useSaveTask,
    useDeleteTask,
} from '@/shared/hooks/useTasks'
import { useInfiniteManagers } from '@/shared/hooks/useManagers'
import { useRoles } from '@/shared/hooks/useRoles'
import { useAuth } from '@/shared/hooks/useAuth'
import { ClientConfirmForm } from '@/features/clients/ClientConfirmForm'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import {
    calendarDateParts,
    calendarDateLabel,
} from '@/features/calendar/calendar-date'
import { TaskForm } from './TaskForm'
import { taskPriorities, taskStatuses, taskViews } from './task-labels'
import c from './TasksPage.module.scss'

function taskClientHref(task: Task) {
    const query = new URLSearchParams()

    if (task.processId) query.set('processId', String(task.processId))

    if (task.clientStageId) query.set('stageId', String(task.clientStageId))

    return `/main/clients/${task.clientId}${query.size ? `?${query}` : ''}`
}

function TaskDue({ task, timestamp }: { task: Task; timestamp: number }) {
    const now = calendarDateParts(timestamp, 'Europe/Warsaw')

    const exactDueAt = task.dueAt ?? task.endAt

    const overdue =
        task.status !== 'done' &&
        (exactDueAt
            ? new Date(exactDueAt).getTime() < timestamp
            : !!task.dueDate && task.dueDate < now.date)

    return (
        <span className={`${c.due} ${overdue ? c.overdue : ''}`}>
            <CalendarDays size={14} aria-hidden />
            {task.dueDate ? (
                <span>
                    <time dateTime={task.dueDate}>
                        {task.dueDate === now.date
                            ? 'Dzisiaj'
                            : calendarDateLabel(task.dueDate)}
                    </time>
                    <small>
                        {task.dueTime
                            ? `${task.dueTime} · Warszawa`
                            : task.scheduleKind === 'week'
                              ? 'Zadanie na tydzień'
                              : 'Do końca dnia'}
                    </small>
                </span>
            ) : (
                <span>Bez terminu</span>
            )}
        </span>
    )
}

function TaskRow({
    task,
    timestamp,
    onEdit,
    onDelete,
}: {
    task: Task
    timestamp: number
    onEdit: () => void
    onDelete: () => void
}) {
    const save = useSaveTask()

    const submit = useClientSubmit()

    const { hasAnyRole } = useRoles()

    const canViewClient = hasAnyRole(['admin', 'manager'])

    function changeStatus(status: TaskStatus) {
        void submit.run(async (signal) => {
            await save.mutateAsync({ id: task.id, dto: { status }, signal })
        })
    }

    return (
        <article
            className={`${c.task} ${task.status === 'done' ? c.completed : ''}`}
            aria-label={task.title}
        >
            <label className={c.check}>
                <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    disabled={!task.canEdit || submit.pending}
                    aria-label={
                        task.status === 'done'
                            ? `Przywróć zadanie: ${task.title}`
                            : `Oznacz jako wykonane: ${task.title}`
                    }
                    onChange={(event) =>
                        changeStatus(event.target.checked ? 'done' : 'todo')
                    }
                />
                <span aria-hidden>
                    <CheckCheck size={15} />
                </span>
            </label>
            <div className={c.summary}>
                <button
                    type="button"
                    className={c.taskTitle}
                    onClick={onEdit}
                    aria-label={`Otwórz zadanie: ${task.title}`}
                >
                    {task.title}
                </button>
                {task.description && (
                    <p className={c.description}>{task.description}</p>
                )}
                <div className={c.tags}>
                    <span className={`${c.status} ${c[task.status]}`}>
                        {taskStatuses[task.status]}
                    </span>
                    <span className={`${c.priority} ${c[task.priority]}`}>
                        <Flag size={11} aria-hidden />
                        {taskPriorities[task.priority]}
                    </span>
                    {canViewClient && task.clientId && task.clientName && (
                        <Link
                            href={taskClientHref(task)}
                            className={c.clientLink}
                        >
                            {task.clientName}
                            {task.clientStageTitle
                                ? ` · ${task.clientStageTitle}`
                                : ''}
                        </Link>
                    )}
                    {task.isRecurring && (
                        <span className={c.legacy}>Seria</span>
                    )}
                </div>
                {submit.error && (
                    <p className={c.rowError} role="alert">
                        {submit.error}
                    </p>
                )}
            </div>
            <TaskDue task={task} timestamp={timestamp} />
            <span className={c.owner}>
                <UserRound size={14} aria-hidden />
                {task.assignedManagerName}
            </span>
            <div className={c.actions}>
                {(task.canEdit || task.canDelete) && (
                    <ActionMenu
                        label={`Działania zadania: ${task.title}`}
                        disabled={submit.pending}
                        items={[
                            ...(task.canEdit
                                ? [
                                      {
                                          label: 'Edytuj zadanie',
                                          icon: (
                                              <Pencil size={14} aria-hidden />
                                          ),
                                          onSelect: onEdit,
                                      },
                                      ...(task.status === 'todo'
                                          ? [
                                                {
                                                    label: 'Rozpocznij zadanie',
                                                    icon: (
                                                        <Play
                                                            size={14}
                                                            aria-hidden
                                                        />
                                                    ),
                                                    onSelect: () =>
                                                        changeStatus(
                                                            'in_progress',
                                                        ),
                                                },
                                            ]
                                          : []),
                                      {
                                          label:
                                              task.status === 'done'
                                                  ? 'Przywróć do zrobienia'
                                                  : 'Oznacz jako wykonane',
                                          icon: (
                                              <CircleCheck
                                                  size={14}
                                                  aria-hidden
                                              />
                                          ),
                                          onSelect: () =>
                                              changeStatus(
                                                  task.status === 'done'
                                                      ? 'todo'
                                                      : 'done',
                                              ),
                                      },
                                  ]
                                : []),
                            ...(task.canDelete
                                ? [
                                      {
                                          label: 'Usuń zadanie',
                                          icon: (
                                              <Trash2 size={14} aria-hidden />
                                          ),
                                          danger: true,
                                          onSelect: onDelete,
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}
            </div>
        </article>
    )
}

function TaskReadOnly({
    task,
    timestamp,
    onClose,
}: {
    task: Task
    timestamp: number
    onClose: () => void
}) {
    const { manager } = useAuth()

    const { hasRole } = useRoles()

    const calendarLink =
        task.calendarId &&
        (hasRole('admin') ||
            (hasRole('manager') && task.assignedManagerId === manager?.id))
            ? `${task.assignedManagerId === manager?.id ? '/main/calendar' : `/main/managers/${task.assignedManagerId}/calendar`}${task.dueDate ? `?date=${task.dueDate}` : ''}`
            : null

    return (
        <div className={c.details}>
            {task.description && (
                <p className={c.fullDescription}>{task.description}</p>
            )}
            <dl>
                <div>
                    <dt>Status</dt>
                    <dd>{taskStatuses[task.status]}</dd>
                </div>
                <div>
                    <dt>Priorytet</dt>
                    <dd>{taskPriorities[task.priority]}</dd>
                </div>
                <div>
                    <dt>Osoba odpowiedzialna</dt>
                    <dd>{task.assignedManagerName}</dd>
                </div>
                <div>
                    <dt>Termin</dt>
                    <dd>
                        <TaskDue task={task} timestamp={timestamp} />
                    </dd>
                </div>
            </dl>
            {(hasRole('admin') || hasRole('manager')) &&
                task.clientId &&
                task.clientName && (
                    <Link href={taskClientHref(task)}>
                        {[
                            task.clientName,
                            task.processTitle,
                            task.clientStageTitle,
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </Link>
                )}
            <p className={c.hint}>
                {task.scheduleKind === 'event' ||
                task.scheduleKind === 'week' ||
                task.isRecurring
                    ? 'Ten wpis jest zarządzany w kalendarzu. Tam możesz zmienić spotkanie, zadanie tygodniowe lub serię.'
                    : 'To zadanie jest dostępne tylko do odczytu.'}
            </p>
            {calendarLink && (
                <Link href={calendarLink} className={c.calendarLink}>
                    <CalendarDays size={15} aria-hidden />
                    Otwórz w kalendarzu
                </Link>
            )}
            <Button type="button" onClick={onClose}>
                Zamknij
            </Button>
        </div>
    )
}

export function TasksPage() {
    const { hasRole } = useRoles()

    const admin = hasRole('admin')

    const [scope, setScope] = useState<TaskScope>(admin ? 'team' : 'mine')

    const [view, setView] = useState<TaskView>('today')

    const [search, setSearch] = useState('')

    const [searchQuery, setSearchQuery] = useState('')

    const [priority, setPriority] = useState<TaskPriority | null>(null)

    const [status, setStatus] = useState<TaskStatus | null>(null)

    const [managerId, setManagerId] = useState<number | null>(null)

    const [page, setPage] = useState(1)

    const [editing, setEditing] = useState<number | 'new' | null>(null)

    const [removing, setRemoving] = useState<Task | null>(null)

    const [pending, setPending] = useState(false)

    const query = useTasks({
        page,
        limit: 20,
        view,
        scope: admin ? scope : 'mine',
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(priority ? { priority } : {}),
        ...(status && view !== 'completed' ? { status } : {}),
        ...(admin && scope === 'team' && managerId ? { managerId } : {}),
    })

    const target = useTask(typeof editing === 'number' ? editing : null)

    const remove = useDeleteTask()

    const managers = useInfiniteManagers({}, admin)

    const managerRows =
        managers.data?.pages.flatMap((entry) => entry.rows) ?? []

    const rows = query.data?.rows ?? []

    const total = query.data?.total ?? 0

    const pages = Math.max(1, Math.ceil(total / (query.data?.limit ?? 20)))

    useEffect(() => {
        const timeout = setTimeout(() => {
            setSearchQuery(search.trim())

            setPage(1)
        }, 300)

        return () => clearTimeout(timeout)
    }, [search])

    function closeEditor() {
        setEditing(null)

        setPending(false)
    }

    function closeRemoval() {
        setRemoving(null)

        setPending(false)
    }

    return (
        <section className={c.page} aria-label="Zadania zespołu">
            <header className={c.header}>
                <div className={c.heading}>
                    <span className={c.mark}>
                        <ListTodo size={24} aria-hidden />
                    </span>
                    <div>
                        <h1>Zadania</h1>
                        <p>
                            Zaplanuj pracę, ustal odpowiedzialność i pilnuj
                            terminów.
                        </p>
                    </div>
                </div>
                <div className={c.headerActions}>
                    <Button
                        type="button"
                        className={c.secondary}
                        aria-label="Odśwież zadania"
                        pending={query.isFetching}
                        onClick={() => void query.refetch()}
                    >
                        <RefreshCw size={15} aria-hidden />
                    </Button>
                    <Button type="button" onClick={() => setEditing('new')}>
                        <Plus size={16} aria-hidden />
                        Dodaj zadanie
                    </Button>
                </div>
            </header>
            <div className={c.workspace}>
                <div className={c.viewBar}>
                    <div
                        className={c.views}
                        role="tablist"
                        aria-label="Widok zadań"
                    >
                        {taskViews.map((item, index) => (
                            <button
                                key={item.value}
                                type="button"
                                role="tab"
                                id={`tasks-view-${item.value}`}
                                aria-controls="tasks-view-panel"
                                tabIndex={view === item.value ? 0 : -1}
                                aria-selected={view === item.value}
                                onKeyDown={(event) => {
                                    if (
                                        ![
                                            'ArrowLeft',
                                            'ArrowRight',
                                            'Home',
                                            'End',
                                        ].includes(event.key)
                                    )
                                        return

                                    event.preventDefault()

                                    const next =
                                        event.key === 'Home'
                                            ? 0
                                            : event.key === 'End'
                                              ? taskViews.length - 1
                                              : (index +
                                                    (event.key === 'ArrowRight'
                                                        ? 1
                                                        : -1) +
                                                    taskViews.length) %
                                                taskViews.length

                                    const button =
                                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                                            '[role="tab"]',
                                        )[next]

                                    button?.focus()

                                    button?.click()
                                }}
                                onClick={() => {
                                    setView(item.value)

                                    setStatus(null)

                                    setPage(1)
                                }}
                            >
                                {item.value === 'overdue' && (
                                    <Clock3 size={14} aria-hidden />
                                )}
                                {item.title}
                            </button>
                        ))}
                    </div>
                    {admin && (
                        <div
                            className={c.scopes}
                            role="group"
                            aria-label="Zakres zadań"
                        >
                            <button
                                type="button"
                                aria-pressed={scope === 'team'}
                                onClick={() => {
                                    setScope('team')

                                    setPage(1)
                                }}
                            >
                                Wszystkie
                            </button>
                            <button
                                type="button"
                                aria-pressed={scope === 'mine'}
                                onClick={() => {
                                    setScope('mine')

                                    setManagerId(null)

                                    setPage(1)
                                }}
                            >
                                Moje
                            </button>
                        </div>
                    )}
                </div>
                <div
                    id="tasks-view-panel"
                    role="tabpanel"
                    aria-labelledby={`tasks-view-${view}`}
                >
                    <div
                        className={`${c.filters} ${admin && scope === 'team' ? c.adminFilters : ''}`}
                    >
                        <TextInput
                            inputTitle="Szukaj zadania"
                            value={search}
                            onChange={setSearch}
                            type="search"
                            maxLength={100}
                            placeholder="Tytuł lub opis zadania"
                        />
                        <FormSelect
                            selectTitle="Priorytet zadania"
                            value={priority}
                            onChange={(value) => {
                                setPriority(value)

                                setPage(1)
                            }}
                            options={[
                                { title: 'Wszystkie priorytety', value: null },
                                ...Object.entries(taskPriorities).map(
                                    ([value, title]) => ({
                                        title,
                                        value: value as TaskPriority,
                                    }),
                                ),
                            ]}
                        />
                        <FormSelect
                            selectTitle="Status zadania"
                            value={view === 'completed' ? 'done' : status}
                            onChange={(value) => {
                                setStatus(value)

                                setPage(1)
                            }}
                            disabled={view === 'completed'}
                            options={[
                                { title: 'Wszystkie statusy', value: null },
                                ...Object.entries(taskStatuses)
                                    .filter(
                                        ([value]) =>
                                            view === 'all' ||
                                            view === 'completed' ||
                                            value !== 'done',
                                    )
                                    .map(([value, title]) => ({
                                        title,
                                        value: value as TaskStatus,
                                    })),
                            ]}
                        />
                        {admin && scope === 'team' && (
                            <FormSelect
                                selectTitle="Osoba odpowiedzialna"
                                value={managerId}
                                onChange={(value) => {
                                    setManagerId(value)

                                    setPage(1)
                                }}
                                disabled={managers.isPending}
                                options={[
                                    {
                                        title: 'Wszyscy pracownicy',
                                        value: null,
                                    },
                                    ...managerRows.map((manager) => ({
                                        title: `${manager.name} ${manager.surname}`,
                                        value: manager.id,
                                    })),
                                ]}
                            />
                        )}
                    </div>
                    {admin && scope === 'team' && managers.hasNextPage && (
                        <Button
                            type="button"
                            className={c.moreManagers}
                            pending={managers.isFetchingNextPage}
                            onClick={() => void managers.fetchNextPage()}
                        >
                            Pokaż więcej pracowników
                        </Button>
                    )}
                    {admin && scope === 'team' && managers.isError && (
                        <div className={c.filterError} role="alert">
                            Nie udało się wczytać pracowników.
                            <Button
                                type="button"
                                onClick={() => void managers.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    )}
                    {query.isPending ? (
                        <p className={c.state} role="status">
                            Wczytywanie zadań…
                        </p>
                    ) : query.isError ? (
                        <div role="alert" className={c.state}>
                            <p>Nie udało się wczytać zadań.</p>
                            <Button
                                type="button"
                                onClick={() => void query.refetch()}
                            >
                                Wczytaj zadania ponownie
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className={c.listSummary}>
                                <p role="status">
                                    {total
                                        ? `${query.data.offset + 1}–${query.data.offset + rows.length} z ${total} ${total === 1 ? 'zadania' : 'zadań'}`
                                        : '0 zadań'}
                                </p>
                                <span>
                                    {admin && scope === 'team'
                                        ? 'Zadania zespołu'
                                        : 'Twoje zadania'}{' '}
                                    · Europe/Warsaw
                                </span>
                            </div>
                            {!rows.length ? (
                                <div className={c.empty}>
                                    <span>
                                        <CheckCheck size={28} aria-hidden />
                                    </span>
                                    <h2>
                                        {searchQuery ||
                                        managerId ||
                                        priority ||
                                        status
                                            ? 'Brak zadań pasujących do filtrów.'
                                            : taskViews.find(
                                                  (item) => item.value === view,
                                              )?.empty}
                                    </h2>
                                    <p>
                                        Dodaj nowe zadanie lub wybierz inny
                                        widok.
                                    </p>
                                    <Button
                                        type="button"
                                        onClick={() => setEditing('new')}
                                    >
                                        <Plus size={15} aria-hidden />
                                        Dodaj zadanie
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className={c.columnNames} aria-hidden>
                                        <span>Zadanie</span>
                                        <span>Termin</span>
                                        <span>Przypisano</span>
                                    </div>
                                    <div className={c.list}>
                                        {rows.map((task) => (
                                            <TaskRow
                                                key={task.id}
                                                task={task}
                                                timestamp={query.dataUpdatedAt}
                                                onEdit={() =>
                                                    setEditing(task.id)
                                                }
                                                onDelete={() =>
                                                    setRemoving(task)
                                                }
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            {query.isSuccess && total > 0 && (
                <nav className={c.pagination} aria-label="Strony listy zadań">
                    <Button
                        type="button"
                        className={c.secondary}
                        disabled={page <= 1 || query.isFetching}
                        onClick={() => setPage((value) => value - 1)}
                    >
                        <ArrowLeft size={15} aria-hidden />
                        Poprzednia
                    </Button>
                    <span>
                        Strona {query.data.page} z {pages}
                    </span>
                    <Button
                        type="button"
                        className={c.secondary}
                        disabled={page >= pages || query.isFetching}
                        onClick={() => setPage((value) => value + 1)}
                    >
                        Następna
                        <ArrowRight size={15} aria-hidden />
                    </Button>
                </nav>
            )}
            {editing !== null && (
                <Popup
                    title={
                        editing === 'new'
                            ? 'Nowe zadanie'
                            : (target.data?.title ?? 'Zadanie')
                    }
                    closeDisabled={pending}
                    onClose={closeEditor}
                >
                    {editing === 'new' ? (
                        <TaskForm
                            initialManagerId={
                                admin && scope === 'team'
                                    ? (managerId ?? undefined)
                                    : undefined
                            }
                            onSaved={closeEditor}
                            onCancel={closeEditor}
                            onPendingChange={setPending}
                        />
                    ) : target.isPending ? (
                        <p className={c.state} role="status">
                            Wczytywanie zadania…
                        </p>
                    ) : target.isError ? (
                        <div className={c.state} role="alert">
                            <p>Nie można otworzyć tego zadania.</p>
                            <Button
                                type="button"
                                onClick={() => void target.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    ) : target.data.canEdit ? (
                        <TaskForm
                            task={target.data}
                            onSaved={closeEditor}
                            onCancel={closeEditor}
                            onPendingChange={setPending}
                        />
                    ) : (
                        <TaskReadOnly
                            task={target.data}
                            timestamp={target.dataUpdatedAt}
                            onClose={closeEditor}
                        />
                    )}
                </Popup>
            )}
            {removing && (
                <Popup
                    title="Usuń zadanie"
                    closeDisabled={pending}
                    onClose={closeRemoval}
                >
                    <ClientConfirmForm
                        message={`Usunąć zadanie „${removing.title}”? Powiązany wpis zniknie również z kalendarza.`}
                        submitTitle="Usuń zadanie"
                        onPendingChange={setPending}
                        onCancel={closeRemoval}
                        onSaved={closeRemoval}
                        onConfirm={(signal) =>
                            remove.mutateAsync({ id: removing.id, signal })
                        }
                    />
                </Popup>
            )}
        </section>
    )
}
