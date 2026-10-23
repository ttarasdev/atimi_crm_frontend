'use client'

import { useState } from 'react'
import type { StageTemplateNote } from '@/api/stage-template-notes/stage-template-notes.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import {
    useCreateStageTemplateNote,
    useUpdateStageTemplateNote,
} from '@/shared/hooks/useStageTemplateContent'

export function StageTemplateNoteForm({
    templateId,
    note,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    templateId: number
    note?: StageTemplateNote
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [body, setBody] = useState(note?.body ?? '')

    const create = useCreateStageTemplateNote()

    const update = useUpdateStageTemplateNote()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label={
                note ? 'Edycja notatki domyślnej' : 'Nowa notatka domyślna'
            }
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    const text = body.trim()

                    if (!text || text.length > 10000) {
                        submit.setError(
                            'Wpisz treść notatki (maksymalnie 10 000 znaków).',
                        )

                        return
                    }

                    if (note)
                        await update.mutateAsync({
                            templateId,
                            id: note.id,
                            dto: { body: text },
                            signal,
                        })
                    else
                        await create.mutateAsync({
                            templateId,
                            dto: { body: text },
                            signal,
                        })

                    if (!signal.aborted) onSuccess()
                })
            }
        >
            <FormTextarea
                inputTitle="Treść notatki"
                value={body}
                onChange={setBody}
                required
                maxLength={10000}
                rows={7}
                hint="Notatka zostanie skopiowana przy dodaniu etapu do sprawy. Późniejsze zmiany szablonu nie zmienią istniejących notatek."
            />
        </FormContainer>
    )
}
