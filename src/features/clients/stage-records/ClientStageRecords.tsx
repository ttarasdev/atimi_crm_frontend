'use client'

import { useEffect, useState } from 'react'
import {
    Plus,
    Pencil,
    Trash2,
    ArrowUp,
    ArrowDown,
    Bell,
    Flag,
    FileText,
    CalendarDays,
    Paperclip,
} from 'lucide-react'
import type {
    Calendar,
    CalendarEvent,
    CalendarReminder,
    CalendarDeadline,
    DeleteScope,
} from '@/api/calendars/calendars.types'
import type {
    ClientStageScope,
    ClientStageNote,
    ClientStageDocument,
    ClientStageRecords as StageRecords,
} from '@/api/client-stage-records/client-stage-records.types'
import {
    useClientStageTasks,
    useClientStageReminders,
    useClientStageDeadlines,
    useClientStageNotes,
    useClientStageDocuments,
    useSaveClientStageRecord,
    useDeleteClientStageRecord,
    useReorderClientStageTask,
} from '@/shared/hooks/useClientStages'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { ActionMenu } from '@/components/ui/action-menu/ActionMenu'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { ClientQueryState } from '../ClientQueryState'
import { ClientConfirmForm } from '../ClientConfirmForm'
import { useExactStageNote } from '@/shared/hooks/useNoteMentions'
import { NoteMentionBody } from '@/features/note-mentions/NoteMentionBody'
import mentionsCss from '@/features/note-mentions/NoteMentions.module.scss'
import { ClientNoteForm } from '../client-records/ClientRecordForms'
import { ClientDocumentForm } from '../client-records/ClientDocumentForm'
import { ClientDocumentDownload } from '../client-records/ClientRecords'
import { ClientStageTaskForm } from './ClientStageTaskForm'
import { ClientStageDateForm } from './ClientStageDateForm'
import { clientActionError } from '../client-labels'
import {
    calendarDateTimeLabel,
    calendarDateLabel,
} from '@/features/calendar/calendar-date'
import c from './ClientStageRecords.module.scss'
import { addCalendarDays } from '@/features/calendar/calendar-view'

type Editing =
    | { kind: 'tasks'; entry: CalendarEvent | null }
    | { kind: 'reminders'; entry: CalendarReminder | null }
    | { kind: 'deadlines'; entry: CalendarDeadline | null }
    | { kind: 'notes'; entry: ClientStageNote | null }
    | { kind: 'documents'; entry: ClientStageDocument | null }

const labels = {
    tasks: 'zadanie',
    reminders: 'przypomnienie',
    deadlines: 'termin',
    notes: 'notatkę',
    documents: 'dokument',
}

function RecordActions({
    title,
    onEdit,
    onDelete,
    disabled,
}: {
    title: string
    onEdit: () => void
    onDelete: () => void
    disabled: boolean
}) {
    return (
        <ActionMenu
            label={`Opcje ${title}`}
            items={[
                {
                    label: `Edytuj ${title}`,
                    icon: <Pencil size={14} />,
                    onSelect: onEdit,
                    disabled,
                },
                {
                    label: `Usuń ${title}`,
                    icon: <Trash2 size={14} />,
                    onSelect: onDelete,
                    disabled,
                    danger: true,
                },
            ]}
        />
    )
}

export function ClientStageRecords({
    selectedNoteId,
    scope,
    readonly,
    calendar,
}: {
    selectedNoteId?: number
    scope: ClientStageScope
    readonly: boolean
    calendar?: Calendar
}) {
    const tasks = useClientStageTasks(scope)

    const reminders = useClientStageReminders(scope)

    const deadlines = useClientStageDeadlines(scope)

    const notes = useClientStageNotes(scope)

    const exact = useExactStageNote(scope, selectedNoteId)

    const documents = useClientStageDocuments(scope)

    const taskRows = tasks.data?.pages.flatMap((page) => page.rows) ?? []

    const reminderRows =
        reminders.data?.pages.flatMap((page) => page.rows) ?? []

    const deadlineRows =
        deadlines.data?.pages.flatMap((page) => page.rows) ?? []

    const loadedNotes = notes.data?.pages.flatMap((page) => page.rows) ?? []

    const noteRows =
        !exact.isError &&
        exact.data &&
        !loadedNotes.some((note) => note.id === exact.data.id)
            ? [exact.data, ...loadedNotes]
            : loadedNotes.filter(
                  (note) => !(exact.isError && note.id === selectedNoteId),
              )

    useEffect(() => {
        if (selectedNoteId && exact.data)
            document
                .getElementById(`stage-note-${selectedNoteId}`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [selectedNoteId, exact.data])

    const documentRows =
        documents.data?.pages.flatMap((page) => page.rows) ?? []

    const [editing, setEditing] = useState<Editing | null>(null)

    const [deleting, setDeleting] = useState<{
        kind: keyof StageRecords
        id: number
        title: string
        linked: boolean
    } | null>(null)

    const [deleteScope, setDeleteScope] = useState<DeleteScope>('local')

    const [pending, setPending] = useState(false)

    const [error, setError] = useState<string>()

    const [now] = useState(() => Date.now())

    const save = useSaveClientStageRecord()

    const remove = useDeleteClientStageRecord()

    const reorder = useReorderClientStageTask()

    const busy = save.isPending || reorder.isPending

    const zone = calendar?.timeZone ?? 'Europe/Warsaw'

    const beginDelete = (
        kind: keyof StageRecords,
        id: number,
        title: string,
        linked = false,
    ) => {
        setDeleteScope('local')

        setDeleting({ kind, id, title, linked })
    }

    const toggleTask = async (task: CalendarEvent) => {
        setError(undefined)

        try {
            await save.mutateAsync({
                ...scope,
                kind: 'tasks',
                id: task.id,
                dto: { title: task.title, isDone: !task.isDone },
            })
        } catch (caught) {
            setError(clientActionError(caught))
        }
    }

    const toggleDeadline = async (deadline: CalendarDeadline) => {
        setError(undefined)

        try {
            await save.mutateAsync({
                ...scope,
                kind: 'deadlines',
                id: deadline.id,
                dto: {
                    title: deadline.title,
                    dueAt: deadline.dueAt,
                    reminderMinutes: deadline.reminderMinutes,
                    isDone: !deadline.isDone,
                },
            })
        } catch (caught) {
            setError(clientActionError(caught))
        }
    }

    const moveTask = async (id: number, direction: 'up' | 'down') => {
        setError(undefined)

        try {
            await reorder.mutateAsync({ scope, id, direction })
        } catch (caught) {
            setError(clientActionError(caught))
        }
    }

    const completedTasks = taskRows.filter((task) => task.isDone).length

    return (
        <div className={c.workspace}>
            {error && (
                <p className={c.error} role="alert">
                    {error}
                </p>
            )}
            <div className={c.columns}>
                <div className={c.column}>
                    <section className={c.section} aria-label="Zadania etapu">
                        <header className={c.header}>
                            <h3>
                                Zadania
                                <span className={c.count}>
                                    {completedTasks} / {taskRows.length}
                                    {tasks.hasNextPage && ' wczytanych'}
                                </span>
                            </h3>
                            {!readonly && (
                                <Button
                                    className={c.addButton}
                                    onClick={() =>
                                        setEditing({
                                            kind: 'tasks',
                                            entry: null,
                                        })
                                    }
                                >
                                    <Plus size={13} />
                                    Dodaj zadanie
                                </Button>
                            )}
                        </header>
                        {!!taskRows.length && (
                            <div
                                className={c.progress}
                                role="progressbar"
                                aria-label={
                                    tasks.hasNextPage
                                        ? 'Postęp wczytanych zadań'
                                        : 'Postęp zadań etapu'
                                }
                                aria-valuemin={0}
                                aria-valuemax={taskRows.length}
                                aria-valuenow={completedTasks}
                            >
                                <span
                                    style={{
                                        width: `${(completedTasks / taskRows.length) * 100}%`,
                                    }}
                                />
                            </div>
                        )}
                        <div className={c.queryState}>
                            <ClientQueryState
                                pending={tasks.isPending}
                                error={tasks.isError}
                                empty={!taskRows.length}
                                onRetry={() => void tasks.refetch()}
                                emptyTitle="Brak zadań w tym etapie."
                            />
                        </div>
                        <ul className={c.recordList}>
                            {taskRows.map((task, index) => (
                                <li
                                    key={task.id}
                                    className={`${c.task} ${task.isDone ? c.done : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        className={c.check}
                                        checked={task.isDone}
                                        disabled={readonly || busy}
                                        aria-label={`Wykonane: ${task.title}`}
                                        onChange={() => void toggleTask(task)}
                                    />
                                    <div className={c.recordContent}>
                                        <strong>{task.title}</strong>
                                        {task.description && (
                                            <p className={c.description}>
                                                {task.description}
                                            </p>
                                        )}
                                        <span className={c.meta}>
                                            {task.taskType?.iconId && (
                                                <ThemedIcon
                                                    iconId={
                                                        task.taskType.iconId
                                                    }
                                                    color={task.taskType.color}
                                                    size={13}
                                                />
                                            )}
                                            <span>
                                                {task.taskType?.name ??
                                                    'Zadanie'}
                                            </span>
                                            {task.calendarId && (
                                                <>
                                                    <span aria-hidden="true">
                                                        ·
                                                    </span>
                                                    <CalendarDays size={11} />
                                                    {task.weekStart
                                                        ? `${calendarDateLabel(task.weekStart)} – ${calendarDateLabel(addCalendarDays(task.weekStart, 6))} · na tydzień`
                                                        : task.date
                                                          ? calendarDateLabel(
                                                                task.date,
                                                            )
                                                          : task.startAt
                                                            ? calendarDateTimeLabel(
                                                                  task.startAt,
                                                                  zone,
                                                              )
                                                            : 'W kalendarzu'}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    {!readonly && (
                                        <ActionMenu
                                            label={`Opcje ${task.title}`}
                                            items={[
                                                {
                                                    label: `Edytuj ${task.title}`,
                                                    icon: <Pencil size={14} />,
                                                    onSelect: () =>
                                                        setEditing({
                                                            kind: 'tasks',
                                                            entry: task,
                                                        }),
                                                    disabled: busy,
                                                },
                                                {
                                                    label: `Przesuń zadanie ${task.title} w górę`,
                                                    icon: <ArrowUp size={14} />,
                                                    onSelect: () =>
                                                        void moveTask(
                                                            task.id,
                                                            'up',
                                                        ),
                                                    disabled:
                                                        busy || index === 0,
                                                },
                                                {
                                                    label: `Przesuń zadanie ${task.title} w dół`,
                                                    icon: (
                                                        <ArrowDown size={14} />
                                                    ),
                                                    onSelect: () =>
                                                        void moveTask(
                                                            task.id,
                                                            'down',
                                                        ),
                                                    disabled:
                                                        busy ||
                                                        (index ===
                                                            taskRows.length -
                                                                1 &&
                                                            !tasks.hasNextPage),
                                                },
                                                {
                                                    label: `Usuń ${task.title}`,
                                                    icon: <Trash2 size={14} />,
                                                    onSelect: () =>
                                                        beginDelete(
                                                            'tasks',
                                                            task.id,
                                                            task.title,
                                                            !!task.calendarId,
                                                        ),
                                                    disabled: busy,
                                                    danger: true,
                                                },
                                            ]}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                        {tasks.hasNextPage && (
                            <Button
                                className={c.addButton}
                                pending={tasks.isFetchingNextPage}
                                onClick={() => void tasks.fetchNextPage()}
                            >
                                Więcej zadań
                            </Button>
                        )}
                    </section>
                    <section
                        className={c.attachments}
                        aria-label="Dokumenty etapu"
                    >
                        <header className={c.attachmentHeader}>
                            <h3>
                                <Paperclip size={14} />
                                Załączniki
                            </h3>
                            {!readonly && (
                                <Button
                                    className={c.addButton}
                                    onClick={() =>
                                        setEditing({
                                            kind: 'documents',
                                            entry: null,
                                        })
                                    }
                                >
                                    <Plus size={13} />
                                    Dodaj dokument
                                </Button>
                            )}
                        </header>
                        <div className={c.queryState}>
                            <ClientQueryState
                                pending={documents.isPending}
                                error={documents.isError}
                                empty={!documentRows.length}
                                onRetry={() => void documents.refetch()}
                                emptyTitle="Brak załączników."
                            />
                        </div>
                        <ul className={c.attachmentList}>
                            {documentRows.map((doc) => (
                                <li className={c.attachment} key={doc.id}>
                                    <FileText size={15} />
                                    <strong title={doc.title}>
                                        {doc.title}
                                    </strong>
                                    <ClientDocumentDownload
                                        id={doc.privateAssetId}
                                        title={doc.title}
                                        filename={doc.asset?.originalName}
                                    />
                                    {!readonly && (
                                        <RecordActions
                                            disabled={busy}
                                            title={doc.title}
                                            onEdit={() =>
                                                setEditing({
                                                    kind: 'documents',
                                                    entry: doc,
                                                })
                                            }
                                            onDelete={() =>
                                                beginDelete(
                                                    'documents',
                                                    doc.id,
                                                    doc.title,
                                                )
                                            }
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                        {documents.hasNextPage && (
                            <Button
                                className={c.addButton}
                                pending={documents.isFetchingNextPage}
                                onClick={() => void documents.fetchNextPage()}
                            >
                                Więcej dokumentów
                            </Button>
                        )}
                    </section>
                </div>
                <div className={c.column}>
                    <section className={c.section} aria-label="Notatki etapu">
                        <header className={c.header}>
                            <h3>Notatki</h3>
                            {!readonly && (
                                <Button
                                    className={c.addButton}
                                    onClick={() =>
                                        setEditing({
                                            kind: 'notes',
                                            entry: null,
                                        })
                                    }
                                >
                                    <Plus size={13} />
                                    Dodaj notatkę
                                </Button>
                            )}
                        </header>
                        <div className={c.queryState}>
                            <ClientQueryState
                                pending={notes.isPending}
                                error={notes.isError}
                                empty={!noteRows.length}
                                onRetry={() => void notes.refetch()}
                                emptyTitle="Brak notatek w tym etapie."
                            />
                        </div>
                        <ul className={c.recordList}>
                            {selectedNoteId && exact.isError && (
                                <li role="alert">
                                    Ta notatka jest niedostępna lub została
                                    usunięta.
                                </li>
                            )}
                            {noteRows.map((note) => (
                                <li
                                    id={`stage-note-${note.id}`}
                                    className={`${c.note} ${note.id === selectedNoteId ? mentionsCss.target : ''}`}
                                    key={note.id}
                                >
                                    <div className={c.noteHeading}>
                                        {note.title && (
                                            <strong>{note.title}</strong>
                                        )}
                                        {!readonly && (
                                            <RecordActions
                                                disabled={busy}
                                                title={note.title || 'notatkę'}
                                                onEdit={() =>
                                                    setEditing({
                                                        kind: 'notes',
                                                        entry: note,
                                                    })
                                                }
                                                onDelete={() =>
                                                    beginDelete(
                                                        'notes',
                                                        note.id,
                                                        note.title || 'Notatka',
                                                    )
                                                }
                                            />
                                        )}
                                    </div>
                                    <p>
                                        <NoteMentionBody
                                            body={note.body}
                                            mentions={note.mentions}
                                        />
                                    </p>
                                    <span className={c.noteDate}>
                                        {calendarDateTimeLabel(
                                            note.createdAt,
                                            zone,
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {notes.hasNextPage && (
                            <Button
                                className={c.addButton}
                                pending={notes.isFetchingNextPage}
                                onClick={() => void notes.fetchNextPage()}
                            >
                                Więcej notatek
                            </Button>
                        )}
                    </section>
                    <section
                        className={c.section}
                        aria-label="Przypomnienia etapu"
                    >
                        <header className={c.header}>
                            <h3>Przypomnienia</h3>
                            {!readonly && (
                                <Button
                                    className={c.addButton}
                                    aria-label="Dodaj przypomnienie"
                                    onClick={() =>
                                        setEditing({
                                            kind: 'reminders',
                                            entry: null,
                                        })
                                    }
                                >
                                    <Plus size={13} />
                                    Dodaj
                                </Button>
                            )}
                        </header>
                        <div className={c.queryState}>
                            <ClientQueryState
                                pending={reminders.isPending}
                                error={reminders.isError}
                                empty={!reminderRows.length}
                                onRetry={() => void reminders.refetch()}
                                emptyTitle="Brak przypomnień."
                            />
                        </div>
                        <ul className={c.recordList}>
                            {reminderRows.map((reminder) => (
                                <li className={c.reminder} key={reminder.id}>
                                    <span className={c.reminderIcon}>
                                        <Bell size={15} />
                                    </span>
                                    <div className={c.recordContent}>
                                        <strong>{reminder.title}</strong>
                                        <span className={c.meta}>
                                            {calendarDateTimeLabel(
                                                reminder.remindAt,
                                                zone,
                                            )}
                                            {reminder.sentAt &&
                                                ' · Wysłano e-mail'}
                                        </span>
                                    </div>
                                    {!readonly && (
                                        <RecordActions
                                            disabled={busy}
                                            title={reminder.title}
                                            onEdit={() =>
                                                setEditing({
                                                    kind: 'reminders',
                                                    entry: reminder,
                                                })
                                            }
                                            onDelete={() =>
                                                beginDelete(
                                                    'reminders',
                                                    reminder.id,
                                                    reminder.title,
                                                    !!reminder.calendarId,
                                                )
                                            }
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                        {reminders.hasNextPage && (
                            <Button
                                className={c.addButton}
                                pending={reminders.isFetchingNextPage}
                                onClick={() => void reminders.fetchNextPage()}
                            >
                                Więcej przypomnień
                            </Button>
                        )}
                    </section>
                    <section className={c.section} aria-label="Terminy etapu">
                        <header className={c.header}>
                            <h3>
                                <Flag size={13} />
                                Terminy
                            </h3>
                            {!readonly && (
                                <Button
                                    className={c.addButton}
                                    aria-label="Dodaj termin"
                                    onClick={() =>
                                        setEditing({
                                            kind: 'deadlines',
                                            entry: null,
                                        })
                                    }
                                >
                                    <Plus size={13} />
                                    Dodaj
                                </Button>
                            )}
                        </header>
                        <div className={c.queryState}>
                            <ClientQueryState
                                pending={deadlines.isPending}
                                error={deadlines.isError}
                                empty={!deadlineRows.length}
                                onRetry={() => void deadlines.refetch()}
                                emptyTitle="Brak terminów."
                            />
                        </div>
                        <ul className={c.recordList}>
                            {deadlineRows.map((deadline) => (
                                <li
                                    className={`${c.deadline} ${deadline.isDone ? c.done : ''}`}
                                    key={deadline.id}
                                >
                                    <input
                                        type="checkbox"
                                        className={c.check}
                                        checked={deadline.isDone}
                                        disabled={readonly || busy}
                                        aria-label={`Wykonany termin: ${deadline.title}`}
                                        onChange={() =>
                                            void toggleDeadline(deadline)
                                        }
                                    />
                                    <div className={c.recordContent}>
                                        <strong>{deadline.title}</strong>
                                        <span className={c.meta}>
                                            {calendarDateTimeLabel(
                                                deadline.dueAt,
                                                zone,
                                            )}
                                        </span>
                                        {deadline.description && (
                                            <p>{deadline.description}</p>
                                        )}
                                        {!deadline.isDone &&
                                            new Date(deadline.dueAt).getTime() <
                                                now && (
                                                <span className={c.overdue}>
                                                    Po terminie
                                                </span>
                                            )}
                                    </div>
                                    {!readonly && (
                                        <RecordActions
                                            disabled={busy}
                                            title={deadline.title}
                                            onEdit={() =>
                                                setEditing({
                                                    kind: 'deadlines',
                                                    entry: deadline,
                                                })
                                            }
                                            onDelete={() =>
                                                beginDelete(
                                                    'deadlines',
                                                    deadline.id,
                                                    deadline.title,
                                                    !!deadline.calendarId,
                                                )
                                            }
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                        {deadlines.hasNextPage && (
                            <Button
                                className={c.addButton}
                                pending={deadlines.isFetchingNextPage}
                                onClick={() => void deadlines.fetchNextPage()}
                            >
                                Więcej terminów
                            </Button>
                        )}
                    </section>
                </div>
            </div>
            {editing && (
                <Popup
                    title={`${editing.entry ? 'Edytuj' : 'Dodaj'} ${labels[editing.kind]}`}
                    closeDisabled={pending}
                    onClose={() => setEditing(null)}
                >
                    {editing.kind === 'tasks' && (
                        <ClientStageTaskForm
                            scope={scope}
                            task={editing.entry ?? undefined}
                            calendar={calendar}
                            onSaved={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                            onPendingChange={setPending}
                        />
                    )}
                    {(editing.kind === 'reminders' ||
                        editing.kind === 'deadlines') && (
                        <ClientStageDateForm
                            scope={scope}
                            kind={editing.kind}
                            entry={editing.entry ?? undefined}
                            calendar={calendar}
                            onSaved={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                            onPendingChange={setPending}
                        />
                    )}
                    {editing.kind === 'notes' && (
                        <ClientNoteForm
                            clientId={scope.clientId}
                            note={editing.entry ?? undefined}
                            allowPin={false}
                            onSave={(dto, signal) =>
                                save.mutateAsync({
                                    ...scope,
                                    kind: 'notes',
                                    id: editing.entry?.id,
                                    dto: {
                                        title: dto.title,
                                        body: dto.body,
                                        mentionedManagerIds:
                                            dto.mentionedManagerIds,
                                    },
                                    signal,
                                })
                            }
                            onSaved={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                            onPendingChange={setPending}
                        />
                    )}
                    {editing.kind === 'documents' && (
                        <ClientDocumentForm
                            document={editing.entry ?? undefined}
                            withCategory={false}
                            onSave={(dto, signal) =>
                                save.mutateAsync({
                                    ...scope,
                                    kind: 'documents',
                                    id: editing.entry?.id,
                                    dto: {
                                        title: dto.title,
                                        privateAssetId: dto.privateAssetId,
                                    },
                                    signal,
                                })
                            }
                            onSaved={() => setEditing(null)}
                            onCancel={() => setEditing(null)}
                            onPendingChange={setPending}
                        />
                    )}
                </Popup>
            )}
            {deleting && (
                <Popup
                    title={`Usuń ${labels[deleting.kind]}`}
                    closeDisabled={pending}
                    onClose={() => setDeleting(null)}
                >
                    <ClientConfirmForm
                        message={
                            deleting.kind === 'documents'
                                ? 'Dokument zostanie odłączony od etapu. Plik pozostanie w bibliotece.'
                                : `Usunąć „${deleting.title}”?`
                        }
                        submitTitle={
                            deleting.kind === 'documents'
                                ? 'Odłącz dokument'
                                : 'Usuń'
                        }
                        onConfirm={(signal) =>
                            remove.mutateAsync({
                                scope,
                                kind: deleting.kind,
                                id: deleting.id,
                                deleteScope,
                                signal,
                            })
                        }
                        onSaved={() => setDeleting(null)}
                        onCancel={() => setDeleting(null)}
                        onPendingChange={setPending}
                    >
                        {deleting.linked && (
                            <FormSelect<DeleteScope>
                                selectTitle="Gdzie usunąć wpis?"
                                value={deleteScope}
                                onChange={setDeleteScope}
                                options={[
                                    {
                                        title: 'Tylko z etapu — zachowaj w kalendarzu',
                                        value: 'local',
                                    },
                                    {
                                        title: 'Z etapu i kalendarza',
                                        value: 'everywhere',
                                    },
                                ]}
                            />
                        )}
                    </ClientConfirmForm>
                </Popup>
            )}
        </div>
    )
}
