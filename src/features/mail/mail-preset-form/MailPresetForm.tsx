'use client'

import { useEffect, useRef, useState } from 'react'
import type { MailPreset, MailPresetScope } from '@/api/mail/mail.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import {
    useCreateMailPreset,
    useUpdateMailPreset,
} from '@/shared/hooks/useMailPresets'

export function MailPresetForm({
    preset,
    scope = 'personal',
    initialSubject = '',
    initialText = '',
    onSaved,
    onCancel,
    onPendingChange,
}: {
    preset?: MailPreset
    scope?: MailPresetScope
    initialSubject?: string
    initialText?: string
    onSaved: (preset: MailPreset) => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const [name, setName] = useState(preset?.name ?? '')

    const [subject, setSubject] = useState(preset?.subject ?? initialSubject)

    const [text, setText] = useState(preset?.text ?? initialText)

    const [error, setError] = useState<string>()

    const create = useCreateMailPreset()

    const update = useUpdateMailPreset()

    const controller = useRef<AbortController | null>(null)

    const pending = create.isPending || update.isPending

    useEffect(() => {
        onPendingChange?.(pending)
    }, [pending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function submit() {
        if (controller.current) return

        setError(undefined)

        if (
            !name.trim() ||
            !subject.trim() ||
            !text.trim() ||
            /[\r\n]/.test(subject)
        ) {
            setError('Uzupełnij nazwę, temat i treść wiadomości.')

            return
        }

        controller.current = new AbortController()

        try {
            const dto = {
                name: name.trim(),
                subject: subject.trim(),
                text: text.trim(),
            }

            const saved = preset
                ? await update.mutateAsync({
                      id: preset.id,
                      dto,
                      signal: controller.current.signal,
                  })
                : await create.mutateAsync({
                      dto: { ...dto, scope },
                      signal: controller.current.signal,
                  })

            onSaved(saved)
        } catch {
            if (!controller.current?.signal.aborted)
                setError(
                    'Nie udało się zapisać szablonu. Wpisana treść została zachowana.',
                )
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label="Szablon treści wiadomości"
            onSubmit={() => void submit()}
            error={error}
            isPending={pending}
            onCancel={onCancel}
        >
            <TextInput
                inputTitle="Nazwa szablonu"
                value={name}
                onChange={setName}
                maxLength={100}
                required
                autoFocus
            />
            <TextInput
                inputTitle="Temat"
                value={subject}
                onChange={setSubject}
                maxLength={200}
                required
            />
            <FormTextarea
                inputTitle="Treść wiadomości"
                value={text}
                onChange={setText}
                maxLength={20000}
                rows={9}
                required
                hint="Dane firmy i podpis nadawcy są dodawane automatycznie."
            />
        </FormContainer>
    )
}
