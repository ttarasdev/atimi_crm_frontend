'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, FileText, Plus } from 'lucide-react'
import type { DocumentTemplate } from '@/api/document-templates/document-templates.types'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { DocumentDownloadButton } from '@/features/documents/document-download-button/DocumentDownloadButton'
import {
    useInfiniteDocumentTemplates,
    useDocumentTemplate,
    useDocumentTypes,
} from '@/shared/hooks/useDocumentTemplates'
import { useRoles } from '@/shared/hooks/useRoles'
import { GenerateDocumentPopup } from './generate-document-popup/GenerateDocumentPopup'
import { DocumentCatalog } from './DocumentCatalog'
import { DocumentTemplateDetails } from './document-template-details/DocumentTemplateDetails'
import { DocumentTemplateForm } from './document-template-form/DocumentTemplateForm'
import c from './DocumentTemplates.module.scss'

export function DocumentTemplatesPage({
    initialTemplateId,
}: {
    initialTemplateId?: number
}) {
    const router = useRouter()

    const [targetOpen, setTargetOpen] = useState(
        initialTemplateId !== undefined,
    )

    const target = useDocumentTemplate(
        targetOpen ? (initialTemplateId ?? null) : null,
    )

    const [catalog, setCatalog] = useState<'types' | 'fields' | null>(null)

    const [generating, setGenerating] = useState(false)

    const [typeId, setTypeId] = useState<number | null>(null)

    const types = useDocumentTypes()

    const [archived, setArchived] = useState(false)

    const [search, setSearch] = useState('')

    const [searchQuery, setSearchQuery] = useState('')

    const [creating, setCreating] = useState(false)

    const [localSelected, setSelected] = useState<DocumentTemplate | null>(null)

    const selected =
        localSelected ?? (targetOpen && !target.isError ? target.data : null)

    const [pending, setPending] = useState(false)

    const [result, setResult] = useState<{
        asset: PrivateAsset
        clientId: number | null
    } | null>(null)

    const section = useRef<HTMLElement>(null)

    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    function closeSelected() {
        setSelected(null)

        setTargetOpen(false)

        if (initialTemplateId)
            router.replace('/main/management/document-templates', {
                scroll: false,
            })
    }

    function closeResult() {
        setResult(null)

        if (initialTemplateId)
            router.replace('/main/management/document-templates', {
                scroll: false,
            })
    }

    const query = useInfiniteDocumentTemplates({
        isActive: !archived,
        ...(typeId ? { typeId } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
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
        <section
            ref={section}
            className={c.page}
            aria-label="Szablony dokumentów"
            tabIndex={-1}
        >
            <div className={c.block}>
                <header className={c.header}>
                    <div>
                        <h2>Szablony dokumentów</h2>
                        <p>
                            Przygotuj plik DOCX raz. Dane firmy, pracownika i
                            klienta uzupełnią się przy generowaniu.
                        </p>
                    </div>
                    {isAdmin && (
                        <Button
                            type="button"
                            className={c.create}
                            onClick={() => setCreating(true)}
                        >
                            <Plus size={16} aria-hidden="true" />
                            Dodaj szablon
                        </Button>
                    )}
                </header>
                {isAdmin && (
                    <div className={c.actions}>
                        <Button
                            type="button"
                            onClick={() => setCatalog('types')}
                        >
                            Rodzaje i pola dokumentów
                        </Button>
                    </div>
                )}
                <div className={c.actions}>
                    <Button type="button" onClick={() => setCatalog('fields')}>
                        Katalog zmiennych
                    </Button>
                    <Button type="button" onClick={() => setGenerating(true)}>
                        Generuj z szablonu
                    </Button>
                </div>
                <div className={c.filters}>
                    <div
                        className={c.segment}
                        aria-label="Widoczność szablonów"
                    >
                        {[false, true].map((value) => (
                            <Button
                                key={String(value)}
                                type="button"
                                aria-pressed={archived === value}
                                onClick={() => setArchived(value)}
                            >
                                {value ? 'Archiwum' : 'Aktywne'}
                            </Button>
                        ))}
                    </div>
                    <TextInput
                        inputTitle="Szukaj szablonu"
                        value={search}
                        onChange={setSearch}
                        type="search"
                        maxLength={100}
                        placeholder="Nazwa szablonu"
                    />
                    <FormSelect
                        selectTitle="Rodzaj dokumentu"
                        value={typeId}
                        onChange={setTypeId}
                        options={[
                            { title: 'Wszystkie rodzaje', value: null },
                            ...(types.data ?? []).map((type) => ({
                                title: type.name,
                                value: type.id,
                            })),
                        ]}
                    />
                    {query.data && (
                        <small>
                            {templates.length} / {query.data.pages[0].total}
                        </small>
                    )}
                </div>
                <div className={c.list} aria-busy={query.isFetching}>
                    {query.isPending && (
                        <p className={c.state} role="status">
                            Wczytywanie szablonów…
                        </p>
                    )}
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            className={c.row}
                            aria-label={`Otwórz szablon ${template.name}`}
                            onClick={() => setSelected(template)}
                        >
                            <span className={c.fileIcon}>
                                <FileText size={24} aria-hidden="true" />
                            </span>
                            <span className={c.rowText}>
                                <strong>{template.name}</strong>
                                {template.description && (
                                    <span>{template.description}</span>
                                )}
                                <small>
                                    DOCX · {template.fields.length} pól
                                    {template.type &&
                                        ` · ${template.type.name}`}
                                    {!template.isActive && ' · Archiwum'}
                                </small>
                            </span>
                            <ChevronRight size={17} aria-hidden="true" />
                        </button>
                    ))}
                    {query.isSuccess && !templates.length && (
                        <p className={c.state}>
                            {searchQuery
                                ? 'Nie znaleziono szablonów.'
                                : archived
                                  ? 'Brak szablonów w archiwum.'
                                  : 'Brak szablonów dokumentów.'}
                        </p>
                    )}
                    {query.isError && (
                        <div className={c.error} role="alert">
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
            {generating && (
                <GenerateDocumentPopup onClose={() => setGenerating(false)} />
            )}
            {catalog && (
                <Popup
                    title="Katalog dokumentów"
                    closeDisabled={pending}
                    fallbackFocusRef={section}
                    onClose={() => setCatalog(null)}
                >
                    <DocumentCatalog
                        initialSection={catalog}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {creating && (
                <Popup
                    title="Nowy szablon dokumentu"
                    closeDisabled={pending}
                    fallbackFocusRef={section}
                    onClose={() => setCreating(false)}
                >
                    <DocumentTemplateForm
                        onPendingChange={setPending}
                        onCancel={() => setCreating(false)}
                        onSuccess={(saved) => {
                            setPending(false)

                            setCreating(false)

                            setArchived(false)

                            setSearch('')

                            setSelected(saved)
                        }}
                    />
                </Popup>
            )}
            {(selected || targetOpen) && (
                <Popup
                    title={selected?.name ?? 'Szablon dokumentu'}
                    closeDisabled={pending}
                    fallbackFocusRef={section}
                    onClose={closeSelected}
                >
                    {selected ? (
                        <DocumentTemplateDetails
                            key={selected.id}
                            template={selected}
                            isAdmin={isAdmin}
                            onChange={setSelected}
                            onPendingChange={setPending}
                            onGenerated={(asset, clientId) => {
                                setPending(false)

                                setSelected(null)

                                setTargetOpen(false)

                                setResult({ asset, clientId })
                            }}
                        />
                    ) : target.isError ? (
                        <div role="alert">
                            <p>Nie można otworzyć tego szablonu dokumentu.</p>
                            <Button
                                type="button"
                                onClick={() => void target.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    ) : (
                        <p role="status">Wczytywanie szablonu…</p>
                    )}
                </Popup>
            )}
            {result && (
                <Popup
                    title="Dokument gotowy"
                    fallbackFocusRef={section}
                    onClose={closeResult}
                >
                    <div className={c.result}>
                        <CheckCircle2 size={30} aria-hidden="true" />
                        <strong>{result.asset.originalName}</strong>
                        <p>
                            {result.clientId
                                ? 'Dokument zapisano w karcie klienta i w bibliotece plików.'
                                : 'Dokument zapisano w Twojej prywatnej bibliotece.'}
                        </p>
                        <DocumentDownloadButton
                            id={result.asset.id}
                            filename={result.asset.originalName}
                        />
                        <Link
                            className={c.link}
                            href={
                                result.clientId
                                    ? `/main/clients/${result.clientId}`
                                    : '/main/documents'
                            }
                        >
                            {result.clientId
                                ? 'Otwórz klienta'
                                : 'Otwórz bibliotekę'}
                        </Link>
                    </div>
                </Popup>
            )}
        </section>
    )
}
