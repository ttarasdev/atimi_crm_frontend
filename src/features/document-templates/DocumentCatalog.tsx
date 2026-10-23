'use client'

import { useState } from 'react'
import type {
    DocumentField,
    DocumentType,
} from '@/api/document-templates/document-templates.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import {
    useDocumentTypes,
    useDocumentFields,
    useSaveDocumentType,
    useSaveDocumentField,
} from '@/shared/hooks/useDocumentTemplates'
import { DocumentVariablesCatalog } from './DocumentVariablesCatalog'
import c from './DocumentTemplates.module.scss'

export function DocumentCatalog({
    onPendingChange,
    initialSection = 'types',
}: {
    initialSection?: 'types' | 'fields'
    onPendingChange: (pending: boolean) => void
}) {
    const [tab, setTab] = useState<'types' | 'fields'>(initialSection)

    const [editing, setEditing] = useState<
        DocumentType | DocumentField | 'new' | null
    >(null)

    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    const [showCustom, setShowCustom] = useState(false)

    const types = useDocumentTypes()

    const fields = useDocumentFields()

    const saveType = useSaveDocumentType()

    const submit = useClientSubmit(onPendingChange)

    const query = tab === 'types' ? types : fields

    if (editing)
        return (
            <DocumentCatalogForm
                key={editing === 'new' ? `${tab}-new` : `${tab}-${editing.id}`}
                kind={tab}
                item={editing === 'new' ? undefined : editing}
                onPendingChange={onPendingChange}
                onDone={() => setEditing(null)}
            />
        )

    return (
        <div className={c.details}>
            <div className={c.segment}>
                <Button
                    type="button"
                    aria-pressed={tab === 'types'}
                    onClick={() => setTab('types')}
                >
                    Rodzaje dokumentów
                </Button>
                <Button
                    type="button"
                    aria-pressed={tab === 'fields'}
                    onClick={() => setTab('fields')}
                >
                    Katalog zmiennych
                </Button>
            </div>
            <p className={c.hint}>
                {tab === 'types'
                    ? 'Grupuj szablony według rodzaju dokumentu. Archiwizacja rodzaju blokuje nowe generowanie jego szablonów.'
                    : 'Nazwy pól i wartości domyślne są wspólne dla szablonów. Klucz pozostaje stały; zmiana wartości domyślnej nie zmienia zapisanych dokumentów.'}
            </p>
            {tab === 'types' && isAdmin && (
                <Button
                    type="button"
                    className={c.create}
                    onClick={() => setEditing('new')}
                >
                    Dodaj rodzaj
                </Button>
            )}
            {query.isPending && (
                <p className={c.hint} role="status">
                    Wczytywanie…
                </p>
            )}
            {query.isError && (
                <div className={c.error} role="alert">
                    <p>Nie udało się wczytać katalogu.</p>
                    <Button type="button" onClick={() => void query.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {tab === 'types' ? (
                types.data?.map((type) => (
                    <div className={c.source} key={type.id}>
                        <span>
                            {type.name}
                            {!type.isActive && ' · Archiwum'}
                        </span>
                        {isAdmin && (
                            <div className={c.actions}>
                                <Button
                                    type="button"
                                    disabled={submit.pending}
                                    onClick={() => setEditing(type)}
                                >
                                    Edytuj
                                </Button>
                                <Button
                                    type="button"
                                    disabled={submit.pending}
                                    onClick={() =>
                                        void submit.run(async (signal) => {
                                            await saveType.mutateAsync({
                                                id: type.id,
                                                dto: {
                                                    isActive: !type.isActive,
                                                },
                                                signal,
                                            })
                                        })
                                    }
                                >
                                    {type.isActive ? 'Archiwizuj' : 'Przywróć'}
                                </Button>
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <DocumentVariablesCatalog
                    initialSource={showCustom ? 'custom' : 'system'}
                    onEdit={
                        isAdmin
                            ? (field) => {
                                  setShowCustom(true)

                                  setEditing(field)
                              }
                            : undefined
                    }
                    onCreate={
                        isAdmin
                            ? () => {
                                  setShowCustom(true)

                                  setEditing('new')
                              }
                            : undefined
                    }
                />
            )}
            {query.isSuccess && !query.data?.length && (
                <p className={c.hint}>Katalog jest pusty.</p>
            )}
            {submit.error && (
                <p role="alert" className={c.error}>
                    {submit.error}
                </p>
            )}
        </div>
    )
}

function DocumentCatalogForm({
    kind,
    item,
    onPendingChange,
    onDone,
}: {
    kind: 'types' | 'fields'
    item?: DocumentType | DocumentField
    onPendingChange: (pending: boolean) => void
    onDone: () => void
}) {
    const [name, setName] = useState(
        item ? ('name' in item ? item.name : item.label) : '',
    )

    const [key, setKey] = useState(item && 'key' in item ? item.key : '')

    const [description, setDescription] = useState(
        item && 'description' in item ? (item.description ?? '') : '',
    )

    const [defaultValue, setDefaultValue] = useState(
        item && 'defaultValue' in item ? (item.defaultValue ?? '') : '',
    )

    const saveType = useSaveDocumentType()

    const saveField = useSaveDocumentField()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label={
                kind === 'types' ? 'Rodzaj dokumentu' : 'Pole dokumentu'
            }
            onCancel={onDone}
            isPending={submit.pending}
            error={submit.error}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (
                        !name.trim() ||
                        (kind === 'fields' &&
                            !/^[a-zA-Z][a-zA-Z0-9_]{0,99}$/.test(key))
                    ) {
                        submit.setError(
                            'Wpisz nazwę oraz prawidłowy klucz pola (litery, cyfry, podkreślenie).',
                        )

                        return
                    }

                    if (kind === 'types') {
                        const dto = {
                            name: name.trim(),
                            description: description.trim(),
                        }

                        if (item)
                            await saveType.mutateAsync({
                                id: item.id,
                                dto,
                                signal,
                            })
                        else await saveType.mutateAsync({ dto, signal })
                    } else {
                        const dto = { label: name.trim(), defaultValue }

                        if (item)
                            await saveField.mutateAsync({
                                id: item.id,
                                dto,
                                signal,
                            })
                        else
                            await saveField.mutateAsync({
                                dto: { ...dto, key },
                                signal,
                            })
                    }

                    if (!signal.aborted) onDone()
                })
            }
        >
            <TextInput
                inputTitle={kind === 'types' ? 'Nazwa rodzaju' : 'Nazwa pola'}
                value={name}
                onChange={setName}
                required
                maxLength={150}
            />
            {kind === 'types' ? (
                <FormTextarea
                    inputTitle="Opis rodzaju"
                    value={description}
                    onChange={setDescription}
                    maxLength={4000}
                    rows={3}
                />
            ) : (
                <>
                    <TextInput
                        inputTitle="Klucz pola"
                        value={key}
                        onChange={setKey}
                        required
                        disabled={Boolean(item)}
                        maxLength={100}
                        hint="Przykład: numer_sprawy → w pliku {numer_sprawy}. Klucza nie można później zmienić."
                    />
                    <FormTextarea
                        inputTitle="Wartość domyślna"
                        value={defaultValue}
                        onChange={setDefaultValue}
                        maxLength={2000}
                        rows={3}
                        hint="Można ją zmienić jednorazowo przed generowaniem dokumentu."
                    />
                </>
            )}
        </FormContainer>
    )
}
