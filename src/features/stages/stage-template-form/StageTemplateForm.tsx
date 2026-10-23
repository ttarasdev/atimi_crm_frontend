'use client'

import { useEffect, useRef, useState } from 'react'
import { Layers } from 'lucide-react'
import type {
    CreateStageTemplateDto,
    StageTemplate,
    UpdateStageTemplateDto,
} from '@/api/stage-templates/stage-templates.types'
import { FormColorInput } from '@/components/form-components/form-color-input/FormColorInput'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormIconInput } from '@/components/form-components/form-icon-input/FormIconInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import {
    useCreateStageTemplate,
    useUpdateStageTemplate,
} from '@/shared/hooks/useStageTemplates'
import c from './StageTemplateForm.module.scss'

export function StageTemplateForm({
    template,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    template?: StageTemplate
    onSuccess: (template: StageTemplate) => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [title, setTitle] = useState(template?.title ?? '')

    const [description, setDescription] = useState(template?.description ?? '')

    const [iconId, setIconId] = useState<number | null>(
        template?.iconId ?? null,
    )

    const [color, setColor] = useState(template?.color ?? '#4676B4')

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const create = useCreateStageTemplate()

    const update = useUpdateStageTemplate()

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

        if (!trimmedTitle || trimmedTitle.length > 150) {
            setError('Nazwa etapu musi mieć od 1 do 150 znaków.')

            return
        }

        if (!template && !iconId) {
            setError('Wybierz ikonę etapu.')

            return
        }

        if (
            iconId !== null &&
            (!Number.isInteger(iconId) || iconId < 1 || iconId > 2147483647)
        ) {
            setError('Wybierz prawidłową ikonę etapu.')

            return
        }

        if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
            setError('Wybierz prawidłowy kolor.')

            return
        }

        if (trimmedDescription.length > 10000) {
            setError('Opis może mieć maksymalnie 10 000 znaków.')

            return
        }

        controller.current = new AbortController()

        try {
            let saved: StageTemplate

            if (template) {
                const dto: UpdateStageTemplateDto = {}

                if (trimmedTitle !== template.title) dto.title = trimmedTitle

                if (iconId !== (template.iconId ?? null)) dto.iconId = iconId

                if (color !== template.color) dto.color = color

                if (trimmedDescription !== (template.description ?? ''))
                    dto.description = trimmedDescription || null

                saved = Object.keys(dto).length
                    ? await update.mutateAsync({
                          id: template.id,
                          dto,
                          signal: controller.current.signal,
                      })
                    : template
            } else {
                const dto: CreateStageTemplateDto = {
                    title: trimmedTitle,
                    iconId,
                    color,
                    ...(trimmedDescription
                        ? { description: trimmedDescription }
                        : {}),
                }

                saved = await create.mutateAsync({
                    dto,
                    signal: controller.current.signal,
                })
            }

            onPendingChange(false)

            onSuccess(saved)
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać etapu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label={
                template ? 'Edycja szablonu etapu' : 'Tworzenie szablonu etapu'
            }
            isPending={isPending}
            submitTitle={template ? 'Zapisz zmiany' : 'Dodaj etap'}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            <TextInput
                inputTitle="Nazwa etapu"
                name="title"
                value={title}
                onChange={setTitle}
                maxLength={150}
                autoComplete="off"
                required
            />
            <FormIconInput
                inputTitle="Ikona"
                value={iconId}
                onChange={setIconId}
                color={color}
                disabled={isPending}
            />
            <FormColorInput
                inputTitle="Kolor"
                value={color}
                onChange={setColor}
                disabled={isPending}
            />
            <FormTextarea
                inputTitle="Opis"
                name="description"
                value={description}
                onChange={setDescription}
                maxLength={10000}
                rows={3}
            />
            <div
                className={c.preview}
                style={{ color }}
                aria-label="Podgląd etapu"
            >
                <span className={c.icon}>
                    {iconId ? (
                        <ThemedIcon iconId={iconId} size={32} />
                    ) : (
                        <Layers size={25} aria-hidden="true" />
                    )}
                </span>
                <strong>{title.trim() || 'Nazwa etapu'}</strong>
            </div>
            {!template && (
                <p className={c.hint}>
                    Po zapisaniu dodasz zadania domyślne do tego etapu.
                </p>
            )}
        </FormContainer>
    )
}
