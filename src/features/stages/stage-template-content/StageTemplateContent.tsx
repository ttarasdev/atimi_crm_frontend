'use client'

import { useEffect, useRef, useState } from 'react'
import {
    FileText,
    Download,
    Pencil,
    Plus,
    StickyNote,
    Trash2,
} from 'lucide-react'
import type { StageTemplateNote } from '@/api/stage-template-notes/stage-template-notes.types'
import type { StageTemplateDocument } from '@/api/stage-template-documents/stage-template-documents.types'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { ActionMenu } from '@/components/ui/action-menu/ActionMenu'
import { Button } from '@/components/ui/button/Button'
import {
    getDocumentDownloadName,
    getDocumentFormat,
} from '@/features/documents/document-format'
import {
    useInfiniteStageTemplateNotes,
    useInfiniteStageTemplateDocuments,
    useDownloadStageTemplateDocument,
} from '@/shared/hooks/useStageTemplateContent'
import c from './StageTemplateContent.module.scss'

export type StageTemplateContentEditor =
    | { kind: 'note'; note?: StageTemplateNote }
    | { kind: 'document'; document?: StageTemplateDocument }
    | { kind: 'deleteNote'; note: StageTemplateNote }
    | { kind: 'deleteDocument'; document: StageTemplateDocument }

export function StageTemplateContent({
    templateId,
    isAdmin,
    disabled,
    onEdit,
}: {
    templateId: number
    isAdmin: boolean
    disabled: boolean
    onEdit: (editor: StageTemplateContentEditor) => void
}) {
    const [noteSearch, setNoteSearch] = useState('')

    const [documentSearch, setDocumentSearch] = useState('')

    const [noteQuery, setNoteQuery] = useState('')

    const [documentQuery, setDocumentQuery] = useState('')

    const notes = useInfiniteStageTemplateNotes(templateId, {
        ...(noteQuery ? { search: noteQuery } : {}),
    })

    const documents = useInfiniteStageTemplateDocuments(templateId, {
        ...(documentQuery ? { search: documentQuery } : {}),
    })

    const noteRows = Array.from(
        new Map(
            (notes.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (note) => [note.id, note],
            ),
        ).values(),
    )

    const documentRows = Array.from(
        new Map(
            (documents.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (document) => [document.id, document],
            ),
        ).values(),
    )

    useEffect(() => {
        const timer = setTimeout(() => setNoteQuery(noteSearch.trim()), 300)

        return () => clearTimeout(timer)
    }, [noteSearch])

    useEffect(() => {
        const timer = setTimeout(
            () => setDocumentQuery(documentSearch.trim()),
            300,
        )

        return () => clearTimeout(timer)
    }, [documentSearch])

    return (
        <div className={c.content}>
            <section className={c.section} aria-label="Notatki domyślne">
                <header className={c.header}>
                    <h3>
                        <StickyNote size={16} aria-hidden="true" />
                        Notatki domyślne{' '}
                        <small>{notes.data?.pages[0]?.total ?? '–'}</small>
                    </h3>
                    {isAdmin && (
                        <Button
                            className={c.add}
                            type="button"
                            disabled={disabled}
                            onClick={() => onEdit({ kind: 'note' })}
                        >
                            <Plus size={14} aria-hidden="true" />
                            Dodaj notatkę
                        </Button>
                    )}
                </header>
                <TextInput
                    inputTitle="Szukaj notatki"
                    value={noteSearch}
                    onChange={setNoteSearch}
                    maxLength={100}
                    type="search"
                    placeholder="Treść notatki"
                    disabled={disabled}
                />
                <div aria-busy={notes.isFetching} className={c.rows}>
                    {notes.isPending && (
                        <p className={c.state} role="status">
                            Wczytywanie notatek…
                        </p>
                    )}
                    {noteRows.map((note) => (
                        <article key={note.id} className={c.note}>
                            <p>{note.body}</p>
                            {isAdmin && (
                                <ActionMenu
                                    label={`Opcje ${note.body.slice(0, 80)}`}
                                    disabled={disabled}
                                    items={[
                                        {
                                            label: 'Edytuj notatkę',
                                            icon: (
                                                <Pencil
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                            ),
                                            onSelect: () =>
                                                onEdit({ kind: 'note', note }),
                                        },
                                        {
                                            label: 'Usuń notatkę',
                                            icon: (
                                                <Trash2
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                            ),
                                            danger: true,
                                            onSelect: () =>
                                                onEdit({
                                                    kind: 'deleteNote',
                                                    note,
                                                }),
                                        },
                                    ]}
                                />
                            )}
                        </article>
                    ))}
                    {notes.isSuccess && !noteRows.length && (
                        <p className={c.state}>
                            {noteQuery
                                ? 'Nie znaleziono notatek.'
                                : 'Brak notatek domyślnych.'}
                        </p>
                    )}
                    {notes.isError && (
                        <div role="alert" className={c.error}>
                            <p>Nie udało się wczytać notatek.</p>
                            <Button
                                type="button"
                                pending={notes.isFetching}
                                onClick={() => void notes.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    )}
                    {notes.hasNextPage && !notes.isError && (
                        <Button
                            type="button"
                            disabled={disabled || notes.isFetching}
                            pending={notes.isFetchingNextPage}
                            onClick={() => void notes.fetchNextPage()}
                        >
                            Pokaż więcej notatek
                        </Button>
                    )}
                </div>
            </section>
            <section className={c.section} aria-label="Dokumenty domyślne">
                <header className={c.header}>
                    <h3>
                        <FileText size={16} aria-hidden="true" />
                        Dokumenty domyślne{' '}
                        <small>{documents.data?.pages[0]?.total ?? '–'}</small>
                    </h3>
                    {isAdmin && (
                        <Button
                            className={c.add}
                            type="button"
                            disabled={disabled}
                            onClick={() => onEdit({ kind: 'document' })}
                        >
                            <Plus size={14} aria-hidden="true" />
                            Dodaj dokument
                        </Button>
                    )}
                </header>
                <p className={c.hint}>
                    Pliki w szablonie są dostępne dla całego zespołu.
                </p>
                <TextInput
                    inputTitle="Szukaj dokumentu szablonu"
                    value={documentSearch}
                    onChange={setDocumentSearch}
                    maxLength={100}
                    type="search"
                    placeholder="Nazwa dokumentu"
                    disabled={disabled}
                />
                <div aria-busy={documents.isFetching} className={c.rows}>
                    {documents.isPending && (
                        <p className={c.state} role="status">
                            Wczytywanie dokumentów…
                        </p>
                    )}
                    {documentRows.map((document) => (
                        <article key={document.id} className={c.document}>
                            <FileText
                                size={19}
                                className={c.fileIcon}
                                aria-hidden="true"
                            />
                            <div className={c.documentText}>
                                <strong>{document.title}</strong>
                                <small>
                                    {document.privateAsset
                                        ? `${getDocumentFormat(document.privateAsset.mimeType)} · ${(Number(document.privateAsset.sizeBytes) / 1024).toFixed(0)} KB`
                                        : 'Dokument zespołu'}
                                </small>
                            </div>
                            <TemplateDocumentDownload
                                templateId={templateId}
                                document={document}
                                disabled={disabled}
                            />
                            {isAdmin && (
                                <ActionMenu
                                    label={`Opcje ${document.title}`}
                                    disabled={disabled}
                                    items={[
                                        {
                                            label: 'Edytuj dokument',
                                            icon: (
                                                <Pencil
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                            ),
                                            onSelect: () =>
                                                onEdit({
                                                    kind: 'document',
                                                    document,
                                                }),
                                        },
                                        {
                                            label: 'Odłącz dokument',
                                            icon: (
                                                <Trash2
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                            ),
                                            danger: true,
                                            onSelect: () =>
                                                onEdit({
                                                    kind: 'deleteDocument',
                                                    document,
                                                }),
                                        },
                                    ]}
                                />
                            )}
                        </article>
                    ))}
                    {documents.isSuccess && !documentRows.length && (
                        <p className={c.state}>
                            {documentQuery
                                ? 'Nie znaleziono dokumentów.'
                                : 'Brak dokumentów domyślnych.'}
                        </p>
                    )}
                    {documents.isError && (
                        <div role="alert" className={c.error}>
                            <p>Nie udało się wczytać dokumentów.</p>
                            <Button
                                type="button"
                                pending={documents.isFetching}
                                onClick={() => void documents.refetch()}
                            >
                                Spróbuj ponownie
                            </Button>
                        </div>
                    )}
                    {documents.hasNextPage && !documents.isError && (
                        <Button
                            type="button"
                            disabled={disabled || documents.isFetching}
                            pending={documents.isFetchingNextPage}
                            onClick={() => void documents.fetchNextPage()}
                        >
                            Pokaż więcej dokumentów
                        </Button>
                    )}
                </div>
            </section>
        </div>
    )
}

function TemplateDocumentDownload({
    templateId,
    document,
    disabled,
}: {
    templateId: number
    document: StageTemplateDocument
    disabled: boolean
}) {
    const download = useDownloadStageTemplateDocument()

    const controller = useRef<AbortController | null>(null)

    useEffect(() => () => controller.current?.abort(), [])

    return (
        <div className={c.download}>
            <Button
                className={c.downloadButton}
                type="button"
                title={`Pobierz ${document.title}`}
                aria-label={`Pobierz ${document.title}`}
                disabled={disabled}
                pending={download.isPending}
                onClick={() => {
                    controller.current = new AbortController()

                    download.mutate(
                        {
                            templateId,
                            id: document.id,
                            signal: controller.current.signal,
                        },
                        {
                            onSuccess: (blob) => {
                                const url = URL.createObjectURL(blob)

                                const anchor =
                                    window.document.createElement('a')

                                anchor.href = url

                                anchor.download = getDocumentDownloadName(
                                    document.title,
                                    blob.type,
                                )

                                anchor.click()

                                setTimeout(() => URL.revokeObjectURL(url), 1000)
                            },
                        },
                    )
                }}
            >
                <Download size={15} aria-hidden="true" />
            </Button>
            {download.isError && (
                <span role="alert">Nie udało się pobrać pliku.</span>
            )}
        </div>
    )
}
