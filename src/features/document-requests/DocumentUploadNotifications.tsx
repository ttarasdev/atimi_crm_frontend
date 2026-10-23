'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import {
    useDocumentUploadNotifications,
    useReadDocumentNotification,
} from '@/shared/hooks/useDocumentRequests'
import {
    useMentionNotifications,
    useReadMentionNotification,
} from '@/shared/hooks/useNoteMentions'
import { clientProcessesQueryKeys } from '@/shared/query/client-processes-query'
import { documentRequestKeys } from '@/shared/query/document-requests-query'
import { clientsQueryKeys } from '@/shared/query/clients-query'
import c from './DocumentRequests.module.scss'

export function DocumentUploadNotifications() {
    const query = useDocumentUploadNotifications()

    const read = useReadDocumentNotification()

    const mentions = useMentionNotifications()

    const readMention = useReadMentionNotification()

    const cache = useQueryClient()

    const [open, setOpen] = useState(false)

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    const mentionRows = mentions.data?.pages.flatMap((page) => page.rows) ?? []

    const count =
        (query.data?.pages[0]?.unreadCount ?? 0) +
        (mentions.data?.pages[0]?.unreadCount ?? 0)

    return (
        <>
            <button
                type="button"
                className={c.bell}
                aria-label={`Powiadomienia${count ? `: ${count} nieprzeczytanych` : ''}`}
                onClick={() => {
                    setOpen(true)

                    void query.refetch()

                    void mentions.refetch()
                }}
            >
                <Bell size={19} aria-hidden="true" />
                {count > 0 && <span>{count > 99 ? '99+' : count}</span>}
            </button>
            {open && (
                <Popup title="Powiadomienia" onClose={() => setOpen(false)}>
                    <div className={c.notifications}>
                        <p>
                            Dokumenty od klientów i wzmianki w notatkach. Lista
                            odświeża się automatycznie.
                        </p>
                        <Button
                            type="button"
                            pending={query.isFetching || mentions.isFetching}
                            onClick={() => {
                                void query.refetch()

                                void mentions.refetch()
                            }}
                        >
                            Odśwież powiadomienia
                        </Button>
                        {query.isError && (
                            <p role="alert">
                                Nie udało się wczytać powiadomień.
                            </p>
                        )}
                        {query.isPending && <p role="status">Wczytywanie…</p>}
                        {query.isSuccess &&
                            mentions.isSuccess &&
                            !rows.length &&
                            !mentionRows.length && <p>Brak powiadomień.</p>}
                        {!!rows.length && <h3>Dokumenty od klientów</h3>}
                        {rows.map((row) => (
                            <article
                                key={row.id}
                                className={c.notification}
                                data-unread={!row.readAt}
                            >
                                <strong>{row.title}</strong>
                                <span>
                                    {row.clientName} przesłał(a) dokument
                                </span>
                                <small>
                                    {new Date(row.createdAt).toLocaleString(
                                        'pl-PL',
                                        { timeZone: 'Europe/Warsaw' },
                                    )}
                                </small>
                                <div className={c.actions}>
                                    <Link
                                        href={`/main/clients/${row.clientId}?tab=documents`}
                                        onClick={() => {
                                            void cache.invalidateQueries({
                                                queryKey:
                                                    clientsQueryKeys.records(
                                                        row.clientId,
                                                        'documents',
                                                    ),
                                            })

                                            void cache.invalidateQueries({
                                                queryKey:
                                                    documentRequestKeys.client(
                                                        row.clientId,
                                                    ),
                                            })

                                            setOpen(false)
                                        }}
                                    >
                                        Otwórz klienta
                                    </Link>
                                    {!row.readAt && (
                                        <Button
                                            type="button"
                                            pending={read.isPending}
                                            onClick={() => read.mutate(row.id)}
                                        >
                                            <Check size={14} /> Oznacz jako
                                            przeczytane
                                        </Button>
                                    )}
                                </div>
                            </article>
                        ))}
                        {!!mentionRows.length && <h3>Wzmianki w notatkach</h3>}
                        {mentions.isError && (
                            <p role="alert">
                                Nie udało się wczytać wzmianek. Użyj
                                odświeżania, aby spróbować ponownie.
                            </p>
                        )}
                        {mentionRows.map((row) => (
                            <article
                                key={`mention-${row.id}`}
                                className={c.notification}
                                data-unread={!row.readAt}
                            >
                                <strong>{row.title}</strong>
                                <span>
                                    {row.actorName} wspomniał(a) o Tobie ·{' '}
                                    {row.clientName}
                                </span>
                                <small>
                                    {new Date(row.createdAt).toLocaleString(
                                        'pl-PL',
                                        { timeZone: 'Europe/Warsaw' },
                                    )}
                                </small>
                                <div className={c.actions}>
                                    <Link
                                        href={
                                            row.kind === 'stage_note' &&
                                            row.processId &&
                                            row.stageId
                                                ? `/main/clients/${row.clientId}?processId=${row.processId}&stageId=${row.stageId}&stageNoteId=${row.noteId}`
                                                : `/main/clients/${row.clientId}?tab=notes&noteId=${row.noteId}`
                                        }
                                        onClick={() => {
                                            void cache.invalidateQueries({
                                                queryKey:
                                                    clientsQueryKeys.records(
                                                        row.clientId,
                                                        'notes',
                                                    ),
                                            })

                                            if (row.processId && row.stageId)
                                                void cache.invalidateQueries({
                                                    queryKey:
                                                        clientProcessesQueryKeys.records(
                                                            row.clientId,
                                                            row.processId,
                                                            row.stageId,
                                                            'notes',
                                                        ),
                                                })

                                            setOpen(false)
                                        }}
                                    >
                                        Otwórz notatkę
                                    </Link>
                                    {!row.readAt && (
                                        <Button
                                            type="button"
                                            pending={readMention.isPending}
                                            onClick={() =>
                                                readMention.mutate(row.id)
                                            }
                                        >
                                            <Check size={14} /> Oznacz jako
                                            przeczytane
                                        </Button>
                                    )}
                                </div>
                            </article>
                        ))}
                        {readMention.isError && (
                            <p role="alert">
                                Nie udało się oznaczyć wzmianki. Spróbuj
                                ponownie.
                            </p>
                        )}
                        {mentions.hasNextPage && (
                            <Button
                                type="button"
                                pending={mentions.isFetchingNextPage}
                                onClick={() => void mentions.fetchNextPage()}
                            >
                                Pokaż więcej wzmianek
                            </Button>
                        )}
                        {read.isError && (
                            <p role="alert">
                                Nie udało się oznaczyć powiadomienia. Spróbuj
                                ponownie.
                            </p>
                        )}
                        {query.hasNextPage && (
                            <Button
                                type="button"
                                pending={query.isFetchingNextPage}
                                onClick={() => void query.fetchNextPage()}
                            >
                                Pokaż więcej powiadomień
                            </Button>
                        )}
                    </div>
                </Popup>
            )}
        </>
    )
}
