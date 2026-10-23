'use client'

import { useState } from 'react'
import { Link2, UserRound, X } from 'lucide-react'
import type {
    SaveTaskDto,
    Task,
    TaskPriority,
    TaskStatus,
} from '@/api/tasks/tasks.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormManagerInput } from '@/components/form-components/form-manager-input/FormManagerInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useAuth } from '@/shared/hooks/useAuth'
import { useRoles } from '@/shared/hooks/useRoles'
import { useManager } from '@/shared/hooks/useManagers'
import { useSaveTask } from '@/shared/hooks/useTasks'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { TaskClientInput } from './TaskClientInput'
import { taskPriorities, taskStatuses } from './task-labels'
import c from './TaskForm.module.scss'

export function TaskForm({
    task,
    initialManagerId,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    task?: Task
    initialManagerId?: number
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const { manager } = useAuth()

    const { hasRole } = useRoles()

    const admin = hasRole('admin')

    const canLink = admin || hasRole('manager')

    const [title, setTitle] = useState(task?.title ?? '')

    const [description, setDescription] = useState(task?.description ?? '')

    const [assignedManagerId, setAssignedManagerId] = useState(
        task?.assignedManagerId ?? initialManagerId ?? manager?.id ?? null,
    )

    const [priority, setPriority] = useState<TaskPriority>(
        task?.priority ?? 'normal',
    )

    const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')

    const [date, setDate] = useState(task?.dueDate ?? '')

    const [time, setTime] = useState(task?.dueTime ?? '')

    const [linkEditing, setLinkEditing] = useState(false)

    const [linkReviewRequired, setLinkReviewRequired] = useState(false)

    const [clientId, setClientId] = useState(task?.clientId ?? null)

    const [stageId, setStageId] = useState(task?.clientStageId ?? null)

    const assignee = useManager(
        admin && linkEditing && assignedManagerId !== manager?.id
            ? assignedManagerId
            : null,
    )

    const assigned = assignedManagerId === manager?.id ? manager : assignee.data

    const assignedCanLink =
        !admin ||
        !!assigned?.roles.some(
            (role) => role.name === 'admin' || role.name === 'manager',
        )

    const clientManagerId =
        admin && !assigned?.roles.some((role) => role.name === 'admin')
            ? (assignedManagerId ?? undefined)
            : undefined

    const loadingAssignee =
        admin &&
        linkEditing &&
        assignedManagerId !== manager?.id &&
        assignee.isPending

    const save = useSaveTask()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label={task ? 'Edycja zadania' : 'Nowe zadanie'}
            isPending={submit.pending}
            error={submit.error}
            submitTitle={task ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            submitDisabled={loadingAssignee || linkReviewRequired}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (linkReviewRequired) {
                        submit.setError(
                            'Wybierz ponownie klienta albo potwierdź zadanie bez powiązania.',
                        )

                        return
                    }

                    if (!title.trim() || !assignedManagerId) {
                        submit.setError(
                            'Wpisz tytuł i wybierz osobę odpowiedzialną.',
                        )

                        return
                    }

                    if (time && !date) {
                        submit.setError('Wybierz datę przed dodaniem godziny.')

                        return
                    }

                    const dto: SaveTaskDto = {
                        title: title.trim(),
                        description: description.trim() || null,
                        priority,
                        status,
                        ...(admin &&
                        (!task || assignedManagerId !== task.assignedManagerId)
                            ? { assignedManagerId }
                            : {}),
                        ...(!task ||
                        date !== (task.dueDate ?? '') ||
                        time !== (task.dueTime ?? '')
                            ? { dueDate: date || null, dueTime: time || null }
                            : {}),
                        ...(linkEditing
                            ? { clientId, clientStageId: stageId }
                            : {}),
                    }

                    await save.mutateAsync({ id: task?.id, dto, signal })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <TextInput
                inputTitle="Tytuł zadania"
                value={title}
                onChange={setTitle}
                maxLength={255}
                autoComplete="off"
                placeholder="Co trzeba zrobić?"
                required
            />
            <FormTextarea
                inputTitle="Opis (opcjonalnie)"
                value={description}
                onChange={setDescription}
                maxLength={10000}
                rows={3}
                placeholder="Dodatkowe informacje, które pomogą wykonać zadanie"
            />
            {admin ? (
                <FormManagerInput
                    inputTitle="Osoba odpowiedzialna"
                    value={assignedManagerId}
                    onChange={(id) => {
                        if (id === assignedManagerId) return

                        setAssignedManagerId(id)

                        if (linkEditing || task?.clientId) {
                            setLinkEditing(true)

                            setClientId(null)

                            setStageId(null)

                            setLinkReviewRequired(!!task?.clientId)
                        }
                    }}
                />
            ) : (
                <p className={c.assignee}>
                    <UserRound size={16} aria-hidden />
                    {manager?.name} {manager?.surname}
                    <span>Przypisane do Ciebie</span>
                </p>
            )}
            <div className={c.pair}>
                <FormSelect
                    selectTitle="Status"
                    value={status}
                    onChange={setStatus}
                    options={Object.entries(taskStatuses).map(
                        ([value, title]) => ({
                            title,
                            value: value as TaskStatus,
                        }),
                    )}
                />
                <FormSelect
                    selectTitle="Priorytet"
                    value={priority}
                    onChange={setPriority}
                    options={Object.entries(taskPriorities).map(
                        ([value, title]) => ({
                            title,
                            value: value as TaskPriority,
                        }),
                    )}
                />
            </div>
            <section className={c.section}>
                <div className={c.pair}>
                    <TextInput
                        inputTitle="Termin (opcjonalnie)"
                        type="date"
                        value={date}
                        onChange={(value) => {
                            setDate(value)

                            if (!value) setTime('')
                        }}
                        min="1000-01-01"
                        max="9999-12-31"
                    />
                    <TextInput
                        inputTitle="Godzina (opcjonalnie)"
                        type="time"
                        value={time}
                        onChange={setTime}
                        disabled={!date}
                    />
                </div>
                <p className={c.hint}>
                    Czas: Europe/Warsaw. Zadanie z terminem pojawi się w
                    kalendarzu osoby odpowiedzialnej. Bez godziny ma termin do
                    końca wybranego dnia.
                </p>
                {date && (
                    <Button
                        type="button"
                        className={c.clear}
                        onClick={() => {
                            setDate('')

                            setTime('')
                        }}
                    >
                        <X size={14} aria-hidden />
                        Usuń termin
                    </Button>
                )}
            </section>
            {canLink && (
                <section className={c.section}>
                    <div className={c.linkHeader}>
                        <span>
                            <Link2 size={16} aria-hidden />
                            Powiązanie z klientem
                        </span>
                        {!linkEditing && (
                            <Button
                                type="button"
                                className={c.clear}
                                onClick={() => setLinkEditing(true)}
                            >
                                {task?.clientId
                                    ? 'Zmień powiązanie'
                                    : 'Dodaj powiązanie'}
                            </Button>
                        )}
                    </div>
                    {linkReviewRequired && (
                        <div className={c.linkReview} role="status">
                            <p>
                                Zmiana osoby odpowiedzialnej wymaga sprawdzenia
                                powiązania. Dotychczas: {task?.clientName}.
                                Wybierz klienta ponownie albo potwierdź zadanie
                                bez klienta.
                            </p>
                            <Button
                                type="button"
                                className={c.clear}
                                onClick={() => setLinkReviewRequired(false)}
                            >
                                Pozostaw bez klienta
                            </Button>
                        </div>
                    )}
                    {!linkEditing ? (
                        <p className={c.hint}>
                            {task?.clientId
                                ? [
                                      task.clientName,
                                      task.processTitle,
                                      task.clientStageTitle,
                                  ]
                                      .filter(Boolean)
                                      .join(' · ')
                                : 'Zadanie zespołu bez powiązania z klientem.'}
                        </p>
                    ) : loadingAssignee ? (
                        <p role="status" className={c.hint}>
                            Wczytywanie osoby odpowiedzialnej…
                        </p>
                    ) : assignee.isError &&
                      assignedManagerId !== manager?.id ? (
                        <div role="alert" className={c.error}>
                            Nie udało się wczytać pracownika.
                            <Button
                                type="button"
                                onClick={() => void assignee.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    ) : !assignedCanLink ? (
                        <p className={c.hint}>
                            Pracownik z rolą Sender otrzymuje zadania bez
                            powiązania z klientem.
                        </p>
                    ) : (
                        <TaskClientInput
                            key={assignedManagerId}
                            managerId={clientManagerId}
                            clientId={clientId}
                            stageId={stageId}
                            onClientChange={(id) => {
                                setClientId(id)

                                setLinkReviewRequired(false)
                            }}
                            onStageChange={setStageId}
                            task={task}
                        />
                    )}
                    {linkEditing && admin && (
                        <p className={c.hint}>
                            Zadanie klienta możesz przypisać jego opiekunowi
                            albo administratorowi.
                        </p>
                    )}
                </section>
            )}
        </FormContainer>
    )
}
