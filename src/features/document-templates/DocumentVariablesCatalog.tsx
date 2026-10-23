'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { DocumentField } from '@/api/document-templates/document-templates.types'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import {
    useDocumentFields,
    useDocumentTemplateVariables,
} from '@/shared/hooks/useDocumentTemplates'
import c from './DocumentTemplates.module.scss'

export const documentVariableGroups: Record<string, string> = {
    company: 'Firma',
    manager: 'Pracownik',
    client: 'Klient',
    legalization: 'Legalizacja',
    documents: 'Dokumenty klienta',
    date: 'Data',
    custom: 'Własne pola',
    unknown: 'Nierozpoznane pola',
}

export function DocumentVariablesCatalog({
    onEdit,
    onCreate,
    initialSource = 'system',
}: {
    initialSource?: 'system' | 'custom'
    onEdit?: (field: DocumentField) => void
    onCreate?: () => void
}) {
    const [tab, setTab] = useState<'system' | 'custom'>(initialSource)

    const [search, setSearch] = useState('')

    const [copied, setCopied] = useState('')

    const [copyError, setCopyError] = useState(false)

    const variables = useDocumentTemplateVariables()

    const fields = useDocumentFields()

    const query = tab === 'system' ? variables : fields

    const entries =
        tab === 'system'
            ? (variables.data ?? []).map((field) => ({
                  ...field,
                  group: field.group ?? 'client',
                  defaultValue: '',
                  id: 0,
              }))
            : (fields.data ?? []).map((field) => ({
                  ...field,
                  group: 'custom',
              }))

    const filtered = entries.filter((field) =>
        `${field.key} ${field.label} ${documentVariableGroups[field.group] ?? ''}`
            .toLocaleLowerCase('pl-PL')
            .includes(search.trim().toLocaleLowerCase('pl-PL')),
    )

    async function copyKey(key: string) {
        try {
            await navigator.clipboard.writeText(`{${key}}`)

            setCopied(key)

            setCopyError(false)
        } catch {
            setCopyError(true)
        }
    }

    return (
        <section
            className={c.catalog}
            aria-label="Katalog zmiennych dokumentów"
        >
            <div className={c.segment}>
                <Button
                    type="button"
                    aria-pressed={tab === 'system'}
                    onClick={() => setTab('system')}
                >
                    Pola systemowe
                </Button>
                <Button
                    type="button"
                    aria-pressed={tab === 'custom'}
                    onClick={() => setTab('custom')}
                >
                    Własne pola
                </Button>
            </div>
            <p className={c.hint}>
                {tab === 'system'
                    ? 'Dane z CRM: firmy, pracownika, klienta, legalizacji i dokumentów. Skopiuj znacznik i wstaw go w odpowiednim miejscu pliku DOCX.'
                    : 'Utwórz pole z nazwą i opcjonalną wartością domyślną przed dodaniem go do DOCX. To samo pole można wykorzystać w wielu szablonach.'}
            </p>
            <TextInput
                inputTitle="Szukaj pola"
                type="search"
                value={search}
                onChange={setSearch}
                maxLength={100}
                placeholder="Nazwa, klucz lub źródło danych"
            />
            {tab === 'custom' && onCreate && (
                <Button type="button" onClick={onCreate}>
                    Dodaj pole
                </Button>
            )}
            {query.isPending && (
                <p role="status" className={c.hint}>
                    Wczytywanie pól…
                </p>
            )}
            {query.isError && (
                <div role="alert" className={c.error}>
                    <p>Nie udało się wczytać katalogu pól.</p>
                    <Button type="button" onClick={() => void query.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            <div className={c.catalogScroll}>
                {Object.entries(documentVariableGroups).map(
                    ([group, title]) => {
                        const rows = filtered.filter(
                            (field) => field.group === group,
                        )

                        return (
                            rows.length > 0 && (
                                <section
                                    key={group}
                                    className={c.fieldList}
                                    aria-label={title}
                                >
                                    <h3>{title}</h3>
                                    {rows.map((field) => (
                                        <div
                                            key={field.key}
                                            className={c.catalogRow}
                                        >
                                            <div>
                                                <strong>{field.label}</strong>
                                                <code>{`{${field.key}}`}</code>
                                                <small>
                                                    Źródło: {title}
                                                    {tab === 'custom'
                                                        ? ' · uzupełniane przy generowaniu'
                                                        : ' · dane CRM'}
                                                </small>
                                                {field.defaultValue && (
                                                    <small>
                                                        Domyślnie:{' '}
                                                        {field.defaultValue}
                                                    </small>
                                                )}
                                            </div>
                                            <div className={c.actions}>
                                                <Button
                                                    type="button"
                                                    aria-label={`Kopiuj {${field.key}}`}
                                                    onClick={() =>
                                                        void copyKey(field.key)
                                                    }
                                                >
                                                    {copied === field.key ? (
                                                        <Check size={15} />
                                                    ) : (
                                                        <Copy size={15} />
                                                    )}{' '}
                                                    Kopiuj
                                                </Button>
                                                {tab === 'custom' && onEdit && (
                                                    <Button
                                                        type="button"
                                                        aria-label={`Edytuj pole ${field.label}`}
                                                        onClick={() => {
                                                            const item =
                                                                fields.data?.find(
                                                                    (item) =>
                                                                        item.id ===
                                                                        field.id,
                                                                )

                                                            if (item)
                                                                onEdit(item)
                                                        }}
                                                    >
                                                        Edytuj
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            )
                        )
                    },
                )}
            </div>
            {query.isSuccess && !filtered.length && (
                <p className={c.hint}>Nie znaleziono pól.</p>
            )}
            {copied && (
                <p role="status" className={c.hint}>
                    Skopiowano {`{${copied}}`}.
                </p>
            )}
            {copyError && (
                <p role="alert" className={c.hint}>
                    Nie udało się skopiować. Zaznacz znacznik i skopiuj go
                    ręcznie.
                </p>
            )}
        </section>
    )
}
