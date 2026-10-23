'use client'

import { useEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import type { ManagerNote } from '@/api/manager-notes/manager-notes.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormColorInput } from '@/components/form-components/form-color-input/FormColorInput'
import {
    RichTextInput,
    EMPTY_RICH_TEXT,
} from '@/components/form-components/rich-text-input/RichTextInput'
import {
    useCreateManagerNote,
    useUpdateManagerNote,
} from '@/shared/hooks/useManagerNotes'

export function NoteForm({
    note,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    note?: ManagerNote
    onSuccess: (note: ManagerNote) => void
    onCancel: () => void
    onPendingChange: (value: boolean) => void
}) {
    const [title, setTitle] = useState(note?.title ?? '')

    const [content, setContent] = useState<JSONContent>(
        note?.content ?? EMPTY_RICH_TEXT,
    )

    const [color, setColor] = useState(note?.color ?? '#4676B4')

    const [isPinned, setIsPinned] = useState(note?.isPinned ?? false)

    const [error, setError] = useState<string>()

    const create = useCreateManagerNote()

    const update = useUpdateManagerNote()

    const mutation = note ? update : create

    const controller = useRef<AbortController | null>(null)

    useEffect(() => {
        onPendingChange(mutation.isPending)
    }, [mutation.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    return (
        <FormContainer
            aria-label={note ? 'Edycja notatki' : 'Tworzenie notatki'}
            isPending={mutation.isPending}
            onCancel={onCancel}
            submitTitle={note ? 'Zapisz zmiany' : 'Dodaj notatkę'}
            error={
                error ??
                (mutation.isError
                    ? 'Nie udało się zapisać notatki. Spróbuj ponownie.'
                    : undefined)
            }
            onSubmit={() => {
                if (!title.trim() || title.trim().length > 150) {
                    setError('Wpisz nazwę notatki (do 150 znaków).')

                    return
                }

                if (JSON.stringify(content).length > 250000) {
                    setError('Notatka jest zbyt długa.')

                    return
                }

                setError(undefined)

                controller.current = new AbortController()

                const dto = { title: title.trim(), content, color, isPinned }

                const options = {
                    onSuccess: (result: ManagerNote) => {
                        onPendingChange(false)

                        onSuccess(result)
                    },
                }

                if (note)
                    update.mutate(
                        { id: note.id, dto, signal: controller.current.signal },
                        options,
                    )
                else
                    create.mutate(
                        { dto, signal: controller.current.signal },
                        options,
                    )
            }}
        >
            <TextInput
                inputTitle="Nazwa notatki"
                value={title}
                onChange={setTitle}
                maxLength={150}
                required
                autoFocus
            />
            <FormColorInput
                inputTitle="Kolor notatki"
                value={color}
                onChange={setColor}
                disabled={mutation.isPending}
            />
            <RichTextInput
                inputTitle="Treść notatki"
                value={content}
                onChange={setContent}
                disabled={mutation.isPending}
            />
            <label>
                <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(event) => setIsPinned(event.target.checked)}
                />{' '}
                Przypnij na początku
            </label>
        </FormContainer>
    )
}
