'use client'

import { useEffect, useRef, useState } from 'react'
import type {
    CreateStageTemplateTaskDto,
    StageTemplateTask,
    UpdateStageTemplateTaskDto,
} from '@/api/stage-template-tasks/stage-template-tasks.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTaskTypeInput } from '@/components/form-components/form-task-type-input/FormTaskTypeInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import {
    useCreateStageTemplateTask,
    useUpdateStageTemplateTask,
} from '@/shared/hooks/useStageTemplates'
import { useInfiniteTaskTypes } from '@/shared/hooks/useTaskTypes'
import c from './StageTemplateTaskForm.module.scss'

export function StageTemplateTaskForm({
    templateId,
    task,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    templateId: number
    task?: StageTemplateTask
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [title, setTitle] = useState(task?.title ?? '')

    const [description, setDescription] = useState(task?.description ?? '')

    const [typeId, setTypeId] = useState<number | null>(
        task?.taskTypeId ?? null,
    )

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const typeQuery = useInfiniteTaskTypes({ isActive: true })

    const types = typeQuery.data?.pages.flatMap((page) => page.rows) ?? []

    const chosenTypeId =
        typeId ?? types.find((type) => type.isDefault)?.id ?? null

    const selectedType =
        types.find((type) => type.id === chosenTypeId) ??
        (task?.taskType?.id === chosenTypeId ? task.taskType : undefined)

    const create = useCreateStageTemplateTask()

    const update = useUpdateStageTemplateTask()

    const isPending = create.isPending || update.isPending

    useEffect(() => {
        onPendingChange(isPending)
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

        const trimmedTitle = title.trim()

        const trimmedDescription = description.trim()

        if (!trimmedTitle || trimmedTitle.length > 255) {
            setError('Nazwa zadania musi mieć od 1 do 255 znaków.')

            return
        }

        if (
            !chosenTypeId ||
            !Number.isInteger(chosenTypeId) ||
            chosenTypeId < 1 ||
            chosenTypeId > 2147483647
        ) {
            setError('Wybierz typ zadania.')

            return
        }

        if (trimmedDescription.length > 10000) {
            setError('Opis może mieć maksymalnie 10 000 znaków.')

            return
        }

        controller.current = new AbortController()

        try {
            if (task) {
                const dto: UpdateStageTemplateTaskDto = {}

                if (trimmedTitle !== task.title) dto.title = trimmedTitle

                if (chosenTypeId !== task.taskTypeId)
                    dto.taskTypeId = chosenTypeId

                if (trimmedDescription !== (task.description ?? ''))
                    dto.description = trimmedDescription || null

                if (Object.keys(dto).length)
                    await update.mutateAsync({
                        templateId,
                        id: task.id,
                        dto,
                        signal: controller.current.signal,
                    })
            } else {
                const dto: CreateStageTemplateTaskDto = {
                    title: trimmedTitle,
                    taskTypeId: chosenTypeId,
                    ...(trimmedDescription
                        ? { description: trimmedDescription }
                        : {}),
                }

                await create.mutateAsync({
                    templateId,
                    dto,
                    signal: controller.current.signal,
                })
            }

            onPendingChange(false)

            onSuccess()
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać zadania. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label={
                task
                    ? 'Edycja zadania domyślnego'
                    : 'Tworzenie zadania domyślnego'
            }
            isPending={isPending}
            submitTitle={task ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            <TextInput
                inputTitle="Nazwa zadania"
                name="title"
                value={title}
                onChange={setTitle}
                maxLength={255}
                autoComplete="off"
                required
            />
            <FormTaskTypeInput
                inputTitle="Typ zadania"
                value={chosenTypeId}
                onChange={setTypeId}
                selectedType={selectedType}
                disabled={isPending}
            />
            <FormTextarea
                inputTitle="Opis zadania"
                name="description"
                value={description}
                onChange={setDescription}
                maxLength={10000}
                rows={3}
            />
            <p className={c.hint}>
                Datę i godzinę ustalisz później w sprawie klienta.
            </p>
            {selectedType && !selectedType.isActive && (
                <p className={c.warning}>
                    Ten typ jest archiwalny. Wybierz aktywny typ, aby móc dodać
                    etap do nowej sprawy klienta.
                </p>
            )}
        </FormContainer>
    )
}
