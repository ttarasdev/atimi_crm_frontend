'use client'

import { useState } from 'react'
import type {
    ClientContact,
    ContactType,
    ClientNote,
} from '@/api/client-records/client-records.types'
import type { ClientStageNote } from '@/api/client-stage-records/client-stage-records.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import type { NoteMention } from '@/api/note-mentions/note-mentions.types'
import { NoteMentionInput } from '@/features/note-mentions/NoteMentionInput'
import { useSaveClientRecord } from '@/shared/hooks/useClients'
import { useClientSubmit } from '../useClientSubmit'
import { DuplicateClientWarning } from '../DuplicateClientWarning'
import c from '../Clients.module.scss'

interface FormCallbacks {
    onSaved: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}

export function ClientContactForm({
    clientId,
    contact,
    onSaved,
    onCancel,
    onPendingChange,
}: FormCallbacks & { clientId: number; contact?: ClientContact }) {
    const [type, setType] = useState<ContactType>(contact?.type ?? 'phone')

    const [value, setValue] = useState(contact?.value ?? '')

    const [label, setLabel] = useState(contact?.label ?? '')

    const [primary, setPrimary] = useState(contact?.isPrimary ?? false)

    const save = useSaveClientRecord()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Kontakt klienta"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle={contact ? 'Zapisz zmiany' : 'Dodaj kontakt'}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!value.trim()) {
                        submit.setError('Wpisz wartość kontaktu.')

                        return
                    }

                    await save.mutateAsync({
                        kind: 'contacts',
                        clientId,
                        id: contact?.id,
                        dto: {
                            type,
                            value: value.trim(),
                            label: label.trim() || null,
                            isPrimary: primary,
                        },
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <FormSelect<ContactType>
                selectTitle="Rodzaj kontaktu"
                value={type}
                onChange={setType}
                options={[
                    { title: 'Telefon', value: 'phone' },
                    { title: 'E-mail', value: 'email' },
                    { title: 'WhatsApp', value: 'whatsapp' },
                    { title: 'Telegram', value: 'telegram' },
                ]}
            />
            <TextInput
                inputTitle={
                    type === 'email'
                        ? 'Adres e-mail'
                        : type === 'telegram'
                          ? 'Nazwa użytkownika'
                          : 'Numer telefonu'
                }
                type={
                    type === 'email'
                        ? 'email'
                        : type === 'telegram'
                          ? 'text'
                          : 'tel'
                }
                value={value}
                onChange={setValue}
                maxLength={type === 'email' ? 254 : 255}
                required
            />
            {(type === 'email' || type === 'phone' || type === 'whatsapp') && (
                <DuplicateClientWarning
                    kind={type === 'email' ? 'email' : 'phone'}
                    value={value}
                    clientId={clientId}
                />
            )}
            <TextInput
                inputTitle="Etykieta"
                value={label}
                onChange={setLabel}
                maxLength={100}
                placeholder="np. prywatny, służbowy"
            />
            <label className={c.pair}>
                <input
                    type="checkbox"
                    checked={primary}
                    onChange={(e) => setPrimary(e.target.checked)}
                />
                Kontakt główny tego rodzaju
            </label>
        </FormContainer>
    )
}

export function ClientNoteForm({
    clientId,
    note,
    allowPin = true,
    onSave,
    onSaved,
    onCancel,
    onPendingChange,
}: FormCallbacks & {
    clientId: number
    note?: ClientNote | ClientStageNote
    allowPin?: boolean
    onSave: (
        dto: {
            title: string | null
            body: string
            isPinned: boolean
            mentionedManagerIds?: number[]
        },
        signal: AbortSignal,
    ) => Promise<unknown>
}) {
    const [title, setTitle] = useState(note?.title ?? '')

    const [body, setBody] = useState(note?.body ?? '')

    const [mentions, setMentions] = useState<NoteMention[]>(
        note?.mentions ?? [],
    )

    const [pinned, setPinned] = useState(
        note && 'isPinned' in note ? note.isPinned : false,
    )

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Notatka klienta"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!body.trim()) {
                        submit.setError('Napisz treść notatki.')

                        return
                    }

                    await onSave(
                        {
                            title: title.trim() || null,
                            body: body.trim(),
                            isPinned: pinned,
                            ...(mentions.length || note?.mentions?.length
                                ? {
                                      mentionedManagerIds: mentions.map(
                                          (mention) => mention.managerId,
                                      ),
                                  }
                                : {}),
                        },
                        signal,
                    )

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <TextInput
                inputTitle="Tytuł notatki"
                value={title}
                onChange={setTitle}
                maxLength={150}
            />
            <NoteMentionInput
                clientId={clientId}
                value={body}
                onChange={setBody}
                mentions={mentions}
                onMentionsChange={setMentions}
            />
            {allowPin && (
                <label className={c.pair}>
                    <input
                        type="checkbox"
                        checked={pinned}
                        onChange={(e) => setPinned(e.target.checked)}
                    />
                    Przypnij notatkę
                </label>
            )}
        </FormContainer>
    )
}
