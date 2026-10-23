'use client'

import { useEffect, useRef, useState } from 'react'
import {
    ArrowDown,
    ArrowUp,
    ClipboardList,
    Layers,
    LoaderCircle,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react'
import type { StageTemplateTask } from '@/api/stage-template-tasks/stage-template-tasks.types'
import type { StageTemplate } from '@/api/stage-templates/stage-templates.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { useRoles } from '@/shared/hooks/useRoles'
import {
    useDeleteStageTemplateTask,
    useInfiniteStageTemplateTasks,
    useReorderStageTemplateTask,
    useStageTemplate,
} from '@/shared/hooks/useStageTemplates'
import {
    useDeleteStageTemplateNote,
    useDeleteStageTemplateDocument,
} from '@/shared/hooks/useStageTemplateContent'
import {
    StageTemplateContent,
    type StageTemplateContentEditor,
} from '../stage-template-content/StageTemplateContent'
import { StageTemplateNoteForm } from '../stage-template-note-form/StageTemplateNoteForm'
import { StageTemplateDocumentForm } from '../stage-template-document-form/StageTemplateDocumentForm'
import { StageTemplateForm } from '../stage-template-form/StageTemplateForm'
import { StageTemplateTaskForm } from '../stage-template-task-form/StageTemplateTaskForm'
import c from './StageTemplateDetails.module.scss'

type Editor =
    | { kind: 'metadata' }
    | { kind: 'task'; task?: StageTemplateTask }
    | { kind: 'delete'; task: StageTemplateTask }
    | StageTemplateContentEditor

export function StageTemplateDetails({
    template,
    onTemplateChange,
    onPendingChange,
}: {
    template: StageTemplate
    onTemplateChange: (template: StageTemplate) => void
    onPendingChange: (pending: boolean) => void
}) {
    const [editor, setEditor] = useState<Editor | null>(null)

    const [formPending, setFormPending] = useState(false)

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const viewRef = useRef<HTMLDivElement>(null)

    const editRef = useRef<HTMLButtonElement>(null)

    const addRef = useRef<HTMLButtonElement>(null)

    const returnFocus = useRef<'metadata' | 'task' | 'content' | null>(null)

    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    const query = useStageTemplate(template.id)

    const taskQuery = useInfiniteStageTemplateTasks(template.id)

    const remove = useDeleteStageTemplateTask()

    const reorder = useReorderStageTemplateTask()

    const removeNote = useDeleteStageTemplateNote()

    const removeDocument = useDeleteStageTemplateDocument()

    const isPending =
        formPending ||
        remove.isPending ||
        reorder.isPending ||
        removeNote.isPending ||
        removeDocument.isPending

    const current = query.data ?? template

    const tasks = Array.from(
        new Map(
            (taskQuery.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (task) => [task.id, task],
            ),
        ).values(),
    )

    const total = taskQuery.data?.pages[0]?.total

    useEffect(() => {
        onPendingChange(isPending)
    }, [isPending, onPendingChange])

    useEffect(
        () => () => {
            controller.current?.abort()
        },
        [],
    )

    useEffect(() => {
        if (isPending) return

        if (editor) {
            viewRef.current
                ?.querySelector<HTMLElement>(
                    'input:not([disabled]), textarea:not([disabled]), button:not([disabled])',
                )
                ?.focus({ preventScroll: true })
        } else if (returnFocus.current) {
            const target =
                returnFocus.current === 'metadata'
                    ? editRef
                    : returnFocus.current === 'task'
                      ? addRef
                      : viewRef

            target.current?.focus({ preventScroll: true })

            returnFocus.current = null
        }
    }, [editor, isPending])

    function closeEditor() {
        setFormPending(false)

        setEditor(null)

        setError(undefined)
    }

    function edit(value: Editor) {
        setError(undefined)

        returnFocus.current =
            value.kind === 'metadata'
                ? 'metadata'
                : value.kind === 'task' || value.kind === 'delete'
                  ? 'task'
                  : 'content'

        setEditor(value)
    }

    async function moveTask(task: StageTemplateTask, direction: 'up' | 'down') {
        if (controller.current || isPending) return

        setError(undefined)

        controller.current = new AbortController()

        try {
            await reorder.mutateAsync({
                templateId: template.id,
                id: task.id,
                direction,
                signal: controller.current.signal,
            })
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zmienić kolejności zadań.')
        } finally {
            controller.current = null
        }
    }

    async function deleteTask(task: StageTemplateTask) {
        if (controller.current || isPending) return

        setError(undefined)

        controller.current = new AbortController()

        try {
            await remove.mutateAsync({
                templateId: template.id,
                id: task.id,
                signal: controller.current.signal,
            })

            closeEditor()
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się usunąć zadania. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    async function deleteContent(
        value: Extract<Editor, { kind: 'deleteNote' | 'deleteDocument' }>,
    ) {
        if (controller.current || isPending) return

        setError(undefined)

        controller.current = new AbortController()

        try {
            const params = {
                templateId: template.id,
                id:
                    value.kind === 'deleteNote'
                        ? value.note.id
                        : value.document.id,
                signal: controller.current.signal,
            }

            if (value.kind === 'deleteNote')
                await removeNote.mutateAsync(params)
            else await removeDocument.mutateAsync(params)

            closeEditor()
        } catch {
            if (!controller.current?.signal.aborted)
                setError(
                    value.kind === 'deleteNote'
                        ? 'Nie udało się usunąć notatki. Spróbuj ponownie.'
                        : 'Nie udało się odłączyć dokumentu. Spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    if (editor?.kind === 'note')
        return (
            <div ref={viewRef}>
                <StageTemplateNoteForm
                    templateId={template.id}
                    note={editor.note}
                    onPendingChange={setFormPending}
                    onCancel={closeEditor}
                    onSuccess={closeEditor}
                />
            </div>
        )

    if (editor?.kind === 'document')
        return (
            <div ref={viewRef}>
                <StageTemplateDocumentForm
                    templateId={template.id}
                    document={editor.document}
                    onPendingChange={setFormPending}
                    onCancel={closeEditor}
                    onSuccess={closeEditor}
                />
            </div>
        )

    if (editor?.kind === 'deleteNote' || editor?.kind === 'deleteDocument')
        return (
            <div ref={viewRef}>
                <FormContainer
                    aria-label={
                        editor.kind === 'deleteNote'
                            ? 'Usuwanie notatki domyślnej'
                            : 'Odłączanie dokumentu domyślnego'
                    }
                    submitTitle={
                        editor.kind === 'deleteNote'
                            ? 'Usuń notatkę'
                            : 'Odłącz dokument'
                    }
                    isPending={isPending}
                    error={error}
                    onCancel={closeEditor}
                    onSubmit={() => void deleteContent(editor)}
                >
                    <p className={c.confirmation}>
                        {editor.kind === 'deleteNote'
                            ? 'Usunąć notatkę z szablonu? Notatki dodane wcześniej do spraw klientów pozostaną bez zmian.'
                            : `Odłączyć dokument „${editor.document.title}” z szablonu? Plik w bibliotece i dokumenty dodane wcześniej do spraw klientów pozostaną bez zmian.`}
                    </p>
                </FormContainer>
            </div>
        )

    if (editor?.kind === 'metadata')
        return (
            <div ref={viewRef}>
                <StageTemplateForm
                    template={current}
                    onPendingChange={setFormPending}
                    onCancel={closeEditor}
                    onSuccess={(saved) => {
                        onTemplateChange(saved)

                        closeEditor()
                    }}
                />
            </div>
        )

    if (editor?.kind === 'task')
        return (
            <div ref={viewRef}>
                <StageTemplateTaskForm
                    templateId={template.id}
                    task={editor.task}
                    onPendingChange={setFormPending}
                    onCancel={closeEditor}
                    onSuccess={closeEditor}
                />
            </div>
        )

    if (editor?.kind === 'delete')
        return (
            <div ref={viewRef}>
                <FormContainer
                    aria-label="Usuwanie zadania domyślnego"
                    submitTitle="Usuń zadanie"
                    isPending={remove.isPending}
                    error={error}
                    onCancel={closeEditor}
                    onSubmit={() => {
                        void deleteTask(editor.task)
                    }}
                >
                    <p className={c.confirmation}>
                        Usunąć zadanie „{editor.task.title}” z szablonu? Zadania
                        dodane wcześniej do spraw klientów pozostaną bez zmian.
                    </p>
                </FormContainer>
            </div>
        )

    return (
        <div className={c.details} ref={viewRef} tabIndex={-1}>
            {query.isError && (
                <div className={c.error} role="alert">
                    <p>Nie udało się odświeżyć danych etapu.</p>
                    <Button
                        type="button"
                        pending={query.isFetching}
                        onClick={() => {
                            void query.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            <div className={c.summary} style={{ color: current.color }}>
                <span className={c.stageIcon}>
                    {current.iconId ? (
                        <ThemedIcon iconId={current.iconId} size={38} />
                    ) : (
                        <Layers size={29} aria-hidden="true" />
                    )}
                </span>
                <div className={c.summaryText}>
                    <strong>{current.title}</strong>
                    <span>
                        {current.isActive ? 'Aktywny szablon' : 'Archiwum'}
                    </span>
                </div>
                {isAdmin && (
                    <Button
                        ref={editRef}
                        type="button"
                        className={c.action}
                        title="Edytuj etap"
                        aria-label="Edytuj etap"
                        disabled={isPending || query.isPending}
                        onClick={() => edit({ kind: 'metadata' })}
                    >
                        <Pencil size={16} aria-hidden="true" />
                    </Button>
                )}
            </div>
            {current.description && (
                <p className={c.description}>{current.description}</p>
            )}
            <p className={c.hint}>
                Etap, zadania, notatki i powiązania dokumentów są kopiowane do
                sprawy klienta. Późniejsze zmiany szablonu nie zmieniają
                istniejących spraw.
            </p>
            <section className={c.tasks} aria-label="Zadania domyślne">
                <header className={c.header}>
                    <div className={c.title}>
                        <h3>Zadania domyślne</h3>
                        {total !== undefined && (
                            <span className={c.count}>
                                {tasks.length} / {total}
                            </span>
                        )}
                    </div>
                    {isAdmin && (
                        <Button
                            ref={addRef}
                            type="button"
                            className={c.add}
                            disabled={isPending || query.isPending}
                            onClick={() => edit({ kind: 'task' })}
                        >
                            <Plus size={15} aria-hidden="true" />
                            Dodaj zadanie
                        </Button>
                    )}
                </header>
                <p className={c.hint}>
                    Datę i godzinę ustalisz później w sprawie klienta.
                </p>
                <div aria-busy={taskQuery.isFetching}>
                    {taskQuery.isPending && (
                        <p className={c.state} role="status">
                            <LoaderCircle
                                className={c.spinner}
                                size={17}
                                aria-hidden="true"
                            />
                            Wczytywanie zadań…
                        </p>
                    )}
                    {!!tasks.length && (
                        <ol className={c.taskList}>
                            {tasks.map((task, index) => (
                                <li
                                    key={task.id}
                                    className={c.task}
                                    style={{
                                        color:
                                            task.taskType?.color ??
                                            'var(--primary)',
                                    }}
                                >
                                    <div className={c.taskBody}>
                                        <span className={c.taskIcon}>
                                            {task.taskType ? (
                                                <ThemedIcon
                                                    iconId={
                                                        task.taskType.iconId
                                                    }
                                                    size={26}
                                                />
                                            ) : (
                                                <ClipboardList
                                                    size={23}
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </span>
                                        <div className={c.taskText}>
                                            <strong>{task.title}</strong>
                                            {task.taskType && (
                                                <span>
                                                    {task.taskType.name}
                                                    {!task.taskType.isActive &&
                                                        ' · Typ archiwalny'}
                                                </span>
                                            )}
                                            {task.description && (
                                                <p>{task.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <div className={c.actions}>
                                            <Button
                                                type="button"
                                                className={c.action}
                                                title="Przesuń w górę"
                                                aria-label={`Przesuń zadanie ${task.title} w górę`}
                                                disabled={
                                                    isPending ||
                                                    taskQuery.isFetching ||
                                                    index === 0
                                                }
                                                onClick={() => {
                                                    void moveTask(task, 'up')
                                                }}
                                            >
                                                <ArrowUp
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            <Button
                                                type="button"
                                                className={c.action}
                                                title="Przesuń w dół"
                                                aria-label={`Przesuń zadanie ${task.title} w dół`}
                                                disabled={
                                                    isPending ||
                                                    taskQuery.isFetching ||
                                                    (index ===
                                                        tasks.length - 1 &&
                                                        !taskQuery.hasNextPage)
                                                }
                                                onClick={() => {
                                                    void moveTask(task, 'down')
                                                }}
                                            >
                                                <ArrowDown
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            <Button
                                                type="button"
                                                className={c.action}
                                                title="Edytuj zadanie"
                                                aria-label={`Edytuj zadanie ${task.title}`}
                                                disabled={isPending}
                                                onClick={() =>
                                                    edit({
                                                        kind: 'task',
                                                        task,
                                                    })
                                                }
                                            >
                                                <Pencil
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            <Button
                                                type="button"
                                                className={c.action}
                                                title="Usuń zadanie"
                                                aria-label={`Usuń zadanie ${task.title}`}
                                                disabled={isPending}
                                                onClick={() =>
                                                    edit({
                                                        kind: 'delete',
                                                        task,
                                                    })
                                                }
                                            >
                                                <Trash2
                                                    size={15}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                    {taskQuery.isSuccess && !tasks.length && (
                        <p className={c.state}>
                            Brak zadań domyślnych w tym etapie.
                        </p>
                    )}
                    {taskQuery.isError && (
                        <div className={c.error} role="alert">
                            <p>Nie udało się wczytać zadań.</p>
                            <Button
                                type="button"
                                pending={taskQuery.isFetching}
                                onClick={() => {
                                    void taskQuery.refetch()
                                }}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    )}
                    {taskQuery.hasNextPage && !taskQuery.isError && (
                        <div className={c.more}>
                            <Button
                                type="button"
                                pending={taskQuery.isFetchingNextPage}
                                disabled={isPending || taskQuery.isFetching}
                                onClick={() => {
                                    void taskQuery.fetchNextPage()
                                }}
                            >
                                Pokaż więcej zadań
                            </Button>
                        </div>
                    )}
                    {error && (
                        <p className={c.actionError} role="alert">
                            {error}
                        </p>
                    )}
                </div>
            </section>
            <StageTemplateContent
                templateId={template.id}
                isAdmin={isAdmin}
                disabled={isPending || query.isPending}
                onEdit={edit}
            />
        </div>
    )
}
