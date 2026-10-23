'use client'

import { useEffect, useState } from 'react'
import {
    Plus,
    Pencil,
    Trash2,
    Phone,
    Mail,
    Pin,
    FileText,
    Download,
} from 'lucide-react'
import type {
    ClientContact,
    ClientNote,
    ClientDocument,
} from '@/api/client-records/client-records.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import {
    useClientContacts,
    useClientNotes,
    useClientDocuments,
    useDeleteClientRecord,
    useSaveClientRecord,
} from '@/shared/hooks/useClients'
import { useDownloadPrivateAsset } from '@/shared/hooks/usePrivateAssets'
import { useExactClientNote } from '@/shared/hooks/useNoteMentions'
import { NoteMentionBody } from '@/features/note-mentions/NoteMentionBody'
import mentionsCss from '@/features/note-mentions/NoteMentions.module.scss'
import { ClientDocumentRequests } from '@/features/document-requests/ClientDocumentRequests'
import { GenerateDocumentPopup } from '@/features/document-templates/generate-document-popup/GenerateDocumentPopup'
import { getDocumentDownloadName } from '@/features/documents/document-format'
import { ClientQueryState } from '../ClientQueryState'
import { ClientConfirmForm } from '../ClientConfirmForm'
import { ClientContactForm, ClientNoteForm } from './ClientRecordForms'
import { ClientDocumentForm } from './ClientDocumentForm'
import c from '../Clients.module.scss'

export function ClientDocumentDownload({
    id,
    title,
    filename,
}: {
    id: number
    title: string
    filename?: string
}) {
    const download = useDownloadPrivateAsset()

    const [error, setError] = useState(false)

    return (
        <>
            <Button
                className={c.iconButton}
                aria-label={`Pobierz ${title}`}
                pending={download.isPending}
                onClick={async () => {
                    setError(false)

                    try {
                        const blob = await download.mutateAsync({ id })

                        const url = URL.createObjectURL(blob)

                        const link = document.createElement('a')

                        link.href = url

                        link.download = getDocumentDownloadName(
                            filename ?? title,
                            blob.type,
                        )

                        link.click()

                        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
                    } catch {
                        setError(true)
                    }
                }}
            >
                <Download size={15} />
            </Button>
            {error && (
                <span className={c.error} role="alert">
                    Błąd pobierania
                </span>
            )}
        </>
    )
}

function More({
    visible,
    pending,
    onClick,
}: {
    visible: boolean
    pending: boolean
    onClick: () => void
}) {
    return visible ? (
        <Button className={c.secondary} pending={pending} onClick={onClick}>
            Pokaż więcej
        </Button>
    ) : null
}

function Actions({
    title,
    onEdit,
    onDelete,
}: {
    title: string
    onEdit: () => void
    onDelete: () => void
}) {
    return (
        <div className={c.actions}>
            <Button
                className={c.iconButton}
                aria-label={`Edytuj ${title}`}
                onClick={onEdit}
            >
                <Pencil size={14} />
            </Button>
            <Button
                className={c.iconButton}
                aria-label={`Usuń ${title}`}
                onClick={onDelete}
            >
                <Trash2 size={14} />
            </Button>
        </div>
    )
}

export function ClientContacts({
    clientId,
    readonly,
}: {
    clientId: number
    readonly: boolean
}) {
    const query = useClientContacts(clientId)

    const remove = useDeleteClientRecord()

    const [edit, setEdit] = useState<ClientContact | 'new' | null>(null)

    const [deleting, setDeleting] = useState<ClientContact | null>(null)

    const [pending, setPending] = useState(false)

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <section
            className={`${c.panel} ${c.stack}`}
            aria-label="Kontakty klienta"
        >
            <header className={c.header}>
                <h2 className={c.heading}>Kontakty</h2>
                {!readonly && (
                    <Button
                        className={c.primary}
                        onClick={() => setEdit('new')}
                    >
                        <Plus size={14} />
                        Dodaj kontakt
                    </Button>
                )}
            </header>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
                emptyTitle="Dodaj telefon, e-mail lub komunikator klienta."
            />
            <ul className={c.recordList}>
                {rows.map((contact) => (
                    <li className={c.record} key={contact.id}>
                        {contact.type === 'email' ? (
                            <Mail size={17} />
                        ) : (
                            <Phone size={17} />
                        )}
                        <div className={c.recordContent}>
                            <strong>{contact.value}</strong>
                            <span className={c.meta}>
                                {contact.label || contact.type}
                                {contact.isPrimary && (
                                    <span className={c.badge}>Główny</span>
                                )}
                            </span>
                        </div>
                        {!readonly && (
                            <Actions
                                title={contact.value}
                                onEdit={() => setEdit(contact)}
                                onDelete={() => setDeleting(contact)}
                            />
                        )}
                    </li>
                ))}
            </ul>
            <More
                visible={!!query.hasNextPage}
                pending={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
            />
            {edit && (
                <Popup
                    title={edit === 'new' ? 'Nowy kontakt' : 'Edytuj kontakt'}
                    closeDisabled={pending}
                    onClose={() => setEdit(null)}
                >
                    <ClientContactForm
                        clientId={clientId}
                        contact={edit === 'new' ? undefined : edit}
                        onSaved={() => setEdit(null)}
                        onCancel={() => setEdit(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Usuń kontakt"
                    closeDisabled={pending}
                    onClose={() => setDeleting(null)}
                >
                    <ClientConfirmForm
                        message={`Usunąć kontakt ${deleting.value}?`}
                        submitTitle="Usuń kontakt"
                        onConfirm={(signal) =>
                            remove.mutateAsync({
                                clientId,
                                kind: 'contacts',
                                id: deleting.id,
                                signal,
                            })
                        }
                        onSaved={() => setDeleting(null)}
                        onCancel={() => setDeleting(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}

export function ClientNotes({
    clientId,
    readonly,
    selectedNoteId,
}: {
    clientId: number
    readonly: boolean
    selectedNoteId?: number
}) {
    const query = useClientNotes(clientId)

    const exact = useExactClientNote(clientId, selectedNoteId)

    const save = useSaveClientRecord()

    const remove = useDeleteClientRecord()

    const [edit, setEdit] = useState<ClientNote | 'new' | null>(null)

    const [deleting, setDeleting] = useState<ClientNote | null>(null)

    const [pending, setPending] = useState(false)

    const loaded = query.data?.pages.flatMap((page) => page.rows) ?? []

    const rows =
        !exact.isError &&
        exact.data &&
        !loaded.some((note) => note.id === exact.data.id)
            ? [exact.data, ...loaded]
            : loaded.filter(
                  (note) => !(exact.isError && note.id === selectedNoteId),
              )

    useEffect(() => {
        if (selectedNoteId && exact.data)
            document
                .getElementById(`client-note-${selectedNoteId}`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [selectedNoteId, exact.data])

    return (
        <section
            className={`${c.panel} ${c.stack}`}
            aria-label="Notatki klienta"
        >
            <header className={c.header}>
                <h2 className={c.heading}>Notatki</h2>
                {!readonly && (
                    <Button
                        className={c.primary}
                        onClick={() => setEdit('new')}
                    >
                        <Plus size={14} />
                        Dodaj notatkę
                    </Button>
                )}
            </header>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
            />
            {selectedNoteId && exact.isError && (
                <p role="alert">
                    Ta notatka jest niedostępna lub została usunięta.
                </p>
            )}
            <ul className={c.recordList}>
                {rows.map((note) => (
                    <li
                        id={`client-note-${note.id}`}
                        className={`${c.record} ${c.note} ${note.id === selectedNoteId ? mentionsCss.target : ''}`}
                        key={note.id}
                    >
                        <div className={c.recordContent}>
                            <strong>
                                {note.isPinned && <Pin size={12} />}{' '}
                                {note.title || 'Notatka'}
                            </strong>
                            <p>
                                <NoteMentionBody
                                    body={note.body}
                                    mentions={note.mentions}
                                />
                            </p>
                            <span className={c.meta}>
                                {new Date(note.createdAt).toLocaleDateString(
                                    'pl-PL',
                                )}
                            </span>
                        </div>
                        {!readonly && (
                            <Actions
                                title={note.title || 'notatkę'}
                                onEdit={() => setEdit(note)}
                                onDelete={() => setDeleting(note)}
                            />
                        )}
                    </li>
                ))}
            </ul>
            <More
                visible={!!query.hasNextPage}
                pending={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
            />
            {edit && (
                <Popup
                    title={edit === 'new' ? 'Nowa notatka' : 'Edytuj notatkę'}
                    closeDisabled={pending}
                    onClose={() => setEdit(null)}
                >
                    <ClientNoteForm
                        clientId={clientId}
                        note={edit === 'new' ? undefined : edit}
                        onSave={(dto, signal) =>
                            save.mutateAsync({
                                kind: 'notes',
                                clientId,
                                id: edit === 'new' ? undefined : edit.id,
                                dto,
                                signal,
                            })
                        }
                        onSaved={() => setEdit(null)}
                        onCancel={() => setEdit(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {deleting && (
                <Popup
                    title="Usuń notatkę"
                    closeDisabled={pending}
                    onClose={() => setDeleting(null)}
                >
                    <ClientConfirmForm
                        message="Usunąć tę notatkę?"
                        submitTitle="Usuń"
                        onConfirm={(signal) =>
                            remove.mutateAsync({
                                clientId,
                                kind: 'notes',
                                id: deleting.id,
                                signal,
                            })
                        }
                        onSaved={() => setDeleting(null)}
                        onCancel={() => setDeleting(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}

export function ClientDocuments({
    clientId,
    readonly,
}: {
    clientId: number
    readonly: boolean
}) {
    const query = useClientDocuments(clientId)

    const save = useSaveClientRecord()

    const remove = useDeleteClientRecord()

    const [edit, setEdit] = useState<ClientDocument | 'new' | null>(null)

    const [deleting, setDeleting] = useState<ClientDocument | null>(null)

    const [pending, setPending] = useState(false)

    const [generating, setGenerating] = useState(false)

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <section
            className={`${c.panel} ${c.stack}`}
            aria-label="Dokumenty klienta"
        >
            <header className={c.header}>
                <h2 className={c.heading}>Dokumenty</h2>
                {!readonly && (
                    <Button
                        className={c.primary}
                        onClick={() => setEdit('new')}
                    >
                        <Plus size={14} />
                        Dodaj dokument
                    </Button>
                )}
            </header>
            <ClientDocumentRequests clientId={clientId} readonly={readonly} />
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
                emptyTitle="Dokumenty klienta są dostępne tylko zgodnie z uprawnieniami do pliku."
            />
            <ul className={c.recordList}>
                {rows.map((doc) => (
                    <li className={c.record} key={doc.id}>
                        <FileText size={17} />
                        <div className={c.recordContent}>
                            <strong>{doc.title}</strong>
                            <span className={c.meta}>
                                {doc.category || 'Dokument'}
                            </span>
                        </div>
                        <ClientDocumentDownload
                            id={doc.privateAssetId}
                            title={doc.title}
                            filename={doc.asset?.originalName}
                        />
                        {!readonly && (
                            <Actions
                                title={doc.title}
                                onEdit={() => setEdit(doc)}
                                onDelete={() => setDeleting(doc)}
                            />
                        )}
                    </li>
                ))}
            </ul>
            <More
                visible={!!query.hasNextPage}
                pending={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
            />
            {edit && (
                <Popup
                    title={edit === 'new' ? 'Nowy dokument' : 'Edytuj dokument'}
                    closeDisabled={pending}
                    onClose={() => setEdit(null)}
                >
                    <ClientDocumentForm
                        onGenerate={
                            edit === 'new'
                                ? () => {
                                      setEdit(null)

                                      setGenerating(true)
                                  }
                                : undefined
                        }
                        document={edit === 'new' ? undefined : edit}
                        onSave={(dto, signal) =>
                            save.mutateAsync({
                                kind: 'documents',
                                clientId,
                                id: edit === 'new' ? undefined : edit.id,
                                dto,
                                signal,
                            })
                        }
                        onSaved={() => setEdit(null)}
                        onCancel={() => setEdit(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {generating && (
                <GenerateDocumentPopup
                    clientId={clientId}
                    onClose={() => setGenerating(false)}
                />
            )}
            {deleting && (
                <Popup
                    title="Odłącz dokument"
                    closeDisabled={pending}
                    onClose={() => setDeleting(null)}
                >
                    <ClientConfirmForm
                        message="Dokument zostanie odłączony od klienta. Plik pozostanie w bibliotece."
                        submitTitle="Odłącz"
                        onConfirm={(signal) =>
                            remove.mutateAsync({
                                clientId,
                                kind: 'documents',
                                id: deleting.id,
                                signal,
                            })
                        }
                        onSaved={() => setDeleting(null)}
                        onCancel={() => setDeleting(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}
