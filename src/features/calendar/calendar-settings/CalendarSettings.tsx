'use client'

import { useEffect, useRef, useState } from 'react'
import {
    Archive,
    Bell,
    LoaderCircle,
    Pencil,
    Plus,
    RotateCcw,
} from 'lucide-react'
import type { TaskType } from '@/api/task-types/task-types.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { useRoles } from '@/shared/hooks/useRoles'
import {
    useInfiniteTaskTypes,
    useUpdateTaskType,
} from '@/shared/hooks/useTaskTypes'
import { EventTypeForm } from '../event-type-form/EventTypeForm'
import c from './CalendarSettings.module.scss'

function reminderLabel(minutes: number) {
    if (!minutes) return 'na początku'

    if (minutes === 1440) return '1 dzień przed'

    if (minutes % 1440 === 0) return `${minutes / 1440} dni przed`

    if (minutes % 60 === 0) return `${minutes / 60} godz. przed`

    return `${minutes} min przed`
}

export function CalendarSettings() {
    const [archived, setArchived] = useState(false)

    const [form, setForm] = useState<{ taskType?: TaskType } | null>(null)

    const [formPending, setFormPending] = useState(false)

    const [archiveType, setArchiveType] = useState<TaskType | null>(null)

    const [actionError, setActionError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const sectionRef = useRef<HTMLElement>(null)

    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    const query = useInfiniteTaskTypes({ isActive: !archived })

    const update = useUpdateTaskType()

    const types = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (type) => [type.id, type],
            ),
        ).values(),
    )

    const total = query.data?.pages[0]?.total

    useEffect(
        () => () => {
            controller.current?.abort()
        },
        [],
    )

    function changeFilter(value: boolean) {
        setArchived(value)

        setActionError(undefined)
    }

    async function changeActive(type: TaskType, isActive: boolean) {
        if (controller.current || (type.isDefault && !isActive)) return

        setActionError(undefined)

        controller.current = new AbortController()

        try {
            await update.mutateAsync({
                id: type.id,
                dto: { isActive },
                signal: controller.current.signal,
            })

            setArchiveType(null)
        } catch {
            if (!controller.current?.signal.aborted)
                setActionError('Nie udało się zmienić typu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <section
            ref={sectionRef}
            className={c.page}
            aria-label="Ustawienia kalendarza"
            tabIndex={-1}
        >
            <div className={c.block}>
                <header className={c.header}>
                    <div className={c.title}>
                        <h2>Szablony typów wydarzeń</h2>
                        {total !== undefined && (
                            <span className={c.count}>
                                {types.length} / {total}
                            </span>
                        )}
                    </div>
                    {isAdmin && (
                        <Button
                            type="button"
                            className={c.create}
                            onClick={() => setForm({})}
                            disabled={update.isPending}
                        >
                            <Plus size={16} aria-hidden="true" />
                            Dodaj typ
                        </Button>
                    )}
                </header>
                <div className={c.filters} aria-label="Widoczność typów">
                    <Button
                        type="button"
                        className={!archived ? c.selected : undefined}
                        aria-pressed={!archived}
                        disabled={update.isPending}
                        onClick={() => changeFilter(false)}
                    >
                        Aktywne
                    </Button>
                    <Button
                        type="button"
                        className={archived ? c.selected : undefined}
                        aria-pressed={archived}
                        disabled={update.isPending}
                        onClick={() => changeFilter(true)}
                    >
                        Archiwum
                    </Button>
                </div>
                <div className={c.list} aria-busy={query.isFetching}>
                    {query.isPending && (
                        <p className={c.state} role="status">
                            <LoaderCircle
                                className={c.spinner}
                                size={18}
                                aria-hidden="true"
                            />
                            Wczytywanie typów…
                        </p>
                    )}
                    {types.length > 0 && (
                        <ul
                            className={c.types}
                            aria-label="Szablony typów wydarzeń"
                        >
                            {types.map((type) => (
                                <li
                                    key={type.id}
                                    className={c.type}
                                    style={{ color: type.color }}
                                >
                                    <div className={c.icon}>
                                        <ThemedIcon
                                            iconId={type.iconId}
                                            size={42}
                                        />
                                    </div>
                                    <div className={c.content}>
                                        <h3>{type.name}</h3>
                                        {type.isDefault && (
                                            <span className={c.default}>
                                                Domyślny
                                            </span>
                                        )}
                                        <p className={c.reminders}>
                                            <Bell
                                                size={13}
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {type.reminderMinutes.length
                                                    ? [...type.reminderMinutes]
                                                          .sort((a, b) => b - a)
                                                          .map(reminderLabel)
                                                          .join(' · ')
                                                    : 'Bez przypomnień'}
                                            </span>
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <div className={c.actions}>
                                            <Button
                                                type="button"
                                                className={c.action}
                                                aria-label={`Edytuj typ ${type.name}`}
                                                title="Edytuj"
                                                disabled={update.isPending}
                                                onClick={() =>
                                                    setForm({ taskType: type })
                                                }
                                            >
                                                <Pencil
                                                    size={16}
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                            {type.isActive &&
                                            !type.isDefault ? (
                                                <Button
                                                    type="button"
                                                    className={c.action}
                                                    aria-label={`Archiwizuj typ ${type.name}`}
                                                    title="Archiwizuj"
                                                    disabled={update.isPending}
                                                    onClick={() => {
                                                        setActionError(
                                                            undefined,
                                                        )

                                                        setArchiveType(type)
                                                    }}
                                                >
                                                    <Archive
                                                        size={16}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            ) : !type.isActive ? (
                                                <Button
                                                    type="button"
                                                    className={c.action}
                                                    aria-label={`Przywróć typ ${type.name}`}
                                                    title="Przywróć"
                                                    disabled={update.isPending}
                                                    onClick={() => {
                                                        void changeActive(
                                                            type,
                                                            true,
                                                        )
                                                    }}
                                                >
                                                    <RotateCcw
                                                        size={16}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            ) : null}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {query.isSuccess && !types.length && (
                        <p className={c.state}>
                            {archived
                                ? 'Brak zarchiwizowanych typów'
                                : 'Brak typów wydarzeń'}
                        </p>
                    )}
                    {query.isError && (
                        <div className={c.error} role="alert">
                            <p>Nie udało się wczytać typów wydarzeń.</p>
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
                    {actionError && !archiveType && (
                        <p className={c.actionError} role="alert">
                            {actionError}
                        </p>
                    )}
                    {query.hasNextPage && !query.isError && (
                        <div className={c.more}>
                            <Button
                                type="button"
                                pending={query.isFetchingNextPage}
                                disabled={query.isFetching}
                                onClick={() => {
                                    void query.fetchNextPage()
                                }}
                            >
                                Pokaż więcej
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            {form && (
                <Popup
                    title={
                        form.taskType
                            ? 'Edytuj typ wydarzenia'
                            : 'Nowy typ wydarzenia'
                    }
                    closeDisabled={formPending}
                    fallbackFocusRef={sectionRef}
                    onClose={() => setForm(null)}
                >
                    <EventTypeForm
                        taskType={form.taskType}
                        onPendingChange={setFormPending}
                        onSuccess={() => {
                            setFormPending(false)

                            setForm(null)

                            if (!form.taskType) setArchived(false)
                        }}
                        onCancel={() => setForm(null)}
                    />
                </Popup>
            )}
            {archiveType && (
                <Popup
                    title="Archiwizować typ?"
                    closeDisabled={update.isPending}
                    fallbackFocusRef={sectionRef}
                    onClose={() => setArchiveType(null)}
                >
                    <FormContainer
                        aria-label="Archiwizacja typu wydarzenia"
                        submitTitle="Archiwizuj"
                        isPending={update.isPending}
                        error={actionError}
                        onCancel={() => setArchiveType(null)}
                        onSubmit={() => {
                            void changeActive(archiveType, false)
                        }}
                    >
                        <p className={c.confirmation}>
                            Typ „{archiveType.name}” nie będzie dostępny przy
                            tworzeniu nowych wydarzeń. Istniejące wydarzenia
                            zachowają swój typ.
                        </p>
                    </FormContainer>
                </Popup>
            )}
        </section>
    )
}
