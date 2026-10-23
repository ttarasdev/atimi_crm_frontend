'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import type {
    CreateTaskTypeDto,
    TaskType,
} from '@/api/task-types/task-types.types'
import { FormColorInput } from '@/components/form-components/form-color-input/FormColorInput'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormIconInput } from '@/components/form-components/form-icon-input/FormIconInput'
import { FormReminderInput } from '@/components/form-components/form-reminder-input/FormReminderInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import {
    useCreateTaskType,
    useUpdateTaskType,
} from '@/shared/hooks/useTaskTypes'
import c from './EventTypeForm.module.scss'

export function EventTypeForm({
    taskType,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    taskType?: TaskType
    onSuccess: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const [name, setName] = useState(taskType?.name ?? '')

    const [iconId, setIconId] = useState<number | null>(
        taskType?.iconId ?? null,
    )

    const [color, setColor] = useState(taskType?.color ?? '#4676B4')

    const [reminderMinutes, setReminderMinutes] = useState(
        taskType?.reminderMinutes ?? [],
    )

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const create = useCreateTaskType()

    const update = useUpdateTaskType()

    const isPending = create.isPending || update.isPending

    useEffect(() => {
        onPendingChange?.(isPending)
    }, [isPending, onPendingChange])

    useEffect(
        () => () => {
            controller.current?.abort()
        },
        [],
    )

    async function submit() {
        if (controller.current) return

        setError(undefined)

        const trimmedName = name.trim()

        if (!trimmedName || trimmedName.length > 100) {
            setError('Nazwa typu musi mieć od 1 do 100 znaków.')

            return
        }

        if (
            !iconId ||
            !Number.isInteger(iconId) ||
            iconId < 1 ||
            iconId > 2147483647
        ) {
            setError('Wybierz ikonę typu wydarzenia.')

            return
        }

        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
            setError('Wybierz prawidłowy kolor.')

            return
        }

        if (
            reminderMinutes.length > 10 ||
            new Set(reminderMinutes).size !== reminderMinutes.length ||
            reminderMinutes.some(
                (minutes) =>
                    !Number.isInteger(minutes) ||
                    minutes < 0 ||
                    minutes > 525600,
            )
        ) {
            setError('Dodaj maksymalnie 10 różnych czasów przypomnień.')

            return
        }

        const dto: CreateTaskTypeDto = {
            name: trimmedName,
            iconId,
            color,
            reminderMinutes: [...reminderMinutes].sort((a, b) => b - a),
        }

        controller.current = new AbortController()

        try {
            if (taskType)
                await update.mutateAsync({
                    id: taskType.id,
                    dto,
                    signal: controller.current.signal,
                })
            else
                await create.mutateAsync({
                    dto,
                    signal: controller.current.signal,
                })

            onSuccess()
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać typu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label={
                taskType
                    ? 'Edycja typu wydarzenia'
                    : 'Tworzenie typu wydarzenia'
            }
            isPending={isPending}
            submitTitle={taskType ? 'Zapisz zmiany' : 'Dodaj typ'}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            <TextInput
                name="name"
                inputTitle="Nazwa typu"
                value={name}
                onChange={(value) => {
                    setName(value)

                    setError(undefined)
                }}
                maxLength={100}
                autoComplete="off"
                required
            />
            <FormIconInput
                inputTitle="Ikona"
                value={iconId}
                onChange={(value) => {
                    setIconId(value)

                    setError(undefined)
                }}
                color={color}
                disabled={isPending}
            />
            <FormColorInput
                inputTitle="Kolor"
                value={color}
                onChange={(value) => {
                    setColor(value)

                    setError(undefined)
                }}
                disabled={isPending}
            />
            <FormReminderInput
                inputTitle="Przypomnienia e-mail"
                value={reminderMinutes}
                onChange={(value) => {
                    setReminderMinutes(value)

                    setError(undefined)
                }}
                disabled={isPending}
            />
            <div
                className={c.preview}
                style={{ color }}
                aria-label="Podgląd typu"
            >
                <div className={c.icon}>
                    {iconId && <ThemedIcon iconId={iconId} size={42} />}
                </div>
                <div className={c.content}>
                    <strong>{name.trim() || 'Nazwa typu'}</strong>
                    <span>
                        <Bell size={13} aria-hidden="true" />
                        {reminderMinutes.length
                            ? `Przypomnienia e-mail: ${reminderMinutes.length}`
                            : 'Bez przypomnień'}
                    </span>
                </div>
            </div>
        </FormContainer>
    )
}
