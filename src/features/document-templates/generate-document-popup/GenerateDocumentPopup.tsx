'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, FileText } from 'lucide-react'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { DocumentDownloadButton } from '@/features/documents/document-download-button/DocumentDownloadButton'
import {
    useDocumentTemplate,
    useDocumentTypes,
    useInfiniteDocumentTemplates,
} from '@/shared/hooks/useDocumentTemplates'
import { GenerateDocumentForm } from '../generate-document-form/GenerateDocumentForm'
import c from '../DocumentTemplates.module.scss'

export function GenerateDocumentPopup({
    open = true,
    clientId,
    initialTemplateId,
    onClose,
    onSuccess,
}: {
    open?: boolean
    clientId?: number
    initialTemplateId?: number
    onClose: () => void
    onSuccess?: (asset: PrivateAsset, clientId: number | null) => void
}) {
    if (!open) return null

    return (
        <GenerateDocumentContent
            clientId={clientId}
            initialTemplateId={initialTemplateId}
            onClose={onClose}
            onSuccess={onSuccess}
        />
    )
}

function GenerateDocumentContent({
    clientId,
    initialTemplateId,
    onClose,
    onSuccess,
}: Omit<Parameters<typeof GenerateDocumentPopup>[0], 'open'>) {
    const [templateId, setTemplateId] = useState<number | null>(
        initialTemplateId ?? null,
    )

    const [pending, setPending] = useState(false)

    const [result, setResult] = useState<PrivateAsset | null>(null)

    const [resultClientId, setResultClientId] = useState<number | null>(null)

    const selected = useDocumentTemplate(templateId)

    return (
        <Popup
            title={
                result
                    ? 'Dokument gotowy'
                    : templateId
                      ? `Generuj: ${selected.data?.name ?? 'dokument'}`
                      : 'Generuj dokument z szablonu'
            }
            closeDisabled={pending}
            onClose={onClose}
        >
            {result ? (
                <div className={c.result}>
                    <CheckCircle2 size={30} aria-hidden="true" />
                    <strong>{result.originalName}</strong>
                    <p>
                        {resultClientId
                            ? 'Dokument zapisano w karcie klienta i bibliotece plików.'
                            : 'Dokument zapisano w bibliotece plików.'}
                    </p>
                    <DocumentDownloadButton
                        id={result.id}
                        filename={result.originalName}
                    />
                    <Button type="button" onClick={onClose}>
                        Gotowe
                    </Button>
                </div>
            ) : templateId ? (
                <div className={c.details}>
                    {selected.isPending && (
                        <p role="status" className={c.hint}>
                            Wczytywanie szablonu…
                        </p>
                    )}
                    {selected.isError && (
                        <div role="alert" className={c.error}>
                            <p>Nie udało się wczytać szablonu.</p>
                            <Button
                                type="button"
                                pending={selected.isFetching}
                                onClick={() => void selected.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    )}
                    {selected.data && !selected.isError && (
                        <GenerateDocumentForm
                            key={selected.data.id}
                            template={selected.data}
                            clientId={clientId}
                            onPendingChange={setPending}
                            onCancel={() => setTemplateId(null)}
                            onSuccess={(asset, generatedClientId) => {
                                setPending(false)

                                setResult(asset)

                                setResultClientId(generatedClientId)

                                onSuccess?.(asset, generatedClientId)
                            }}
                        />
                    )}
                    {!selected.data && (
                        <Button
                            type="button"
                            onClick={() => setTemplateId(null)}
                        >
                            Wybierz inny szablon
                        </Button>
                    )}
                </div>
            ) : (
                <DocumentTemplatePicker onSelect={setTemplateId} />
            )}
        </Popup>
    )
}

function DocumentTemplatePicker({
    onSelect,
}: {
    onSelect: (id: number) => void
}) {
    const [search, setSearch] = useState('')

    const [searchQuery, setSearchQuery] = useState('')

    const [typeId, setTypeId] = useState<number | null>(null)

    const types = useDocumentTypes()

    const query = useInfiniteDocumentTemplates({
        isActive: true,
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(typeId ? { typeId } : {}),
    })

    const templates = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (template) => [template.id, template],
            ),
        ).values(),
    )

    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(search.trim()), 300)

        return () => clearTimeout(timer)
    }, [search])

    return (
        <div className={c.details}>
            <TextInput
                inputTitle="Szukaj szablonu"
                type="search"
                value={search}
                onChange={setSearch}
                maxLength={100}
            />
            <FormSelect
                selectTitle="Rodzaj dokumentu"
                value={typeId}
                onChange={setTypeId}
                options={[
                    { title: 'Wszystkie rodzaje', value: null },
                    ...(types.data ?? [])
                        .filter((type) => type.isActive)
                        .map((type) => ({ title: type.name, value: type.id })),
                ]}
            />
            <div className={c.list} aria-busy={query.isFetching}>
                {query.isPending && (
                    <p role="status" className={c.hint}>
                        Wczytywanie szablonów…
                    </p>
                )}
                {templates.map((template) => (
                    <button
                        key={template.id}
                        type="button"
                        className={c.row}
                        disabled={template.type?.isActive === false}
                        aria-label={`Wybierz szablon ${template.name}`}
                        onClick={() => onSelect(template.id)}
                    >
                        <span className={c.fileIcon}>
                            <FileText size={22} aria-hidden="true" />
                        </span>
                        <span className={c.rowText}>
                            <strong>{template.name}</strong>
                            {template.description && (
                                <span>{template.description}</span>
                            )}
                            <small>
                                {template.fields.length} pól
                                {template.type
                                    ? ` · ${template.type.name}`
                                    : ''}
                                {template.type?.isActive === false
                                    ? ' · Rodzaj w archiwum'
                                    : ''}
                            </small>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                ))}
                {query.isSuccess && !templates.length && (
                    <p className={c.state}>
                        Nie znaleziono aktywnych szablonów.
                    </p>
                )}
                {query.isError && (
                    <div role="alert" className={c.error}>
                        <p>Nie udało się wczytać szablonów.</p>
                        <Button
                            type="button"
                            pending={query.isFetching}
                            onClick={() => void query.refetch()}
                        >
                            Spróbuj ponownie
                        </Button>
                    </div>
                )}
                {query.hasNextPage && !query.isError && (
                    <Button
                        type="button"
                        disabled={query.isFetching}
                        pending={query.isFetchingNextPage}
                        onClick={() => void query.fetchNextPage()}
                    >
                        Pokaż więcej szablonów
                    </Button>
                )}
            </div>
        </div>
    )
}
