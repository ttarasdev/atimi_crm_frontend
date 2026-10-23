'use client'

import { useState } from 'react'
import { Copy, FileUp, Link2, XCircle } from 'lucide-react'
import type {
    DocumentRequest,
    DocumentRequestLink,
} from '@/api/document-requests/document-requests.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { ClientConfirmForm } from '@/features/clients/ClientConfirmForm'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import {
    useCreateDocumentRequest,
    useDocumentRequests,
    useRenewDocumentRequest,
    useRevokeDocumentRequest,
} from '@/shared/hooks/useDocumentRequests'
import c from './DocumentRequests.module.scss'

const statuses = {
    pending: 'Oczekuje na plik',
    submitted: 'Przesłano',
    expired: 'Link wygasł',
    revoked: 'Link unieważniony',
}

const expiries = [1, 3, 7, 14, 30].map((value) => ({
    title: `${value} ${value === 1 ? 'dzień' : 'dni'}`,
    value,
}))

export function ClientDocumentRequests({
    clientId,
    readonly,
}: {
    clientId: number
    readonly: boolean
}) {
    const query = useDocumentRequests(clientId)

    const revoke = useRevokeDocumentRequest()

    const [editor, setEditor] = useState<DocumentRequest | 'new' | null>(null)

    const [revoking, setRevoking] = useState<DocumentRequest | null>(null)

    const [pending, setPending] = useState(false)

    const [links, setLinks] = useState<Record<number, string>>({})

    const [message, setMessage] = useState('')

    const rows =
        query.data?.pages
            .flatMap((page) => page.rows)
            .filter((row) => row.status !== 'submitted') ?? []

    async function copy(request: DocumentRequest) {
        try {
            await navigator.clipboard.writeText(links[request.id])

            setMessage(`Skopiowano link: ${request.title}.`)
        } catch {
            setMessage('Zaznacz i skopiuj link poniżej.')
        }
    }

    return (
        <section className={c.requests} aria-label="Dokumenty oczekiwane">
            <header>
                <div>
                    <h3>Prośby o dokumenty (opcjonalnie)</h3>
                    <p>
                        W razie potrzeby utwórz prośbę i przekaż klientowi link
                        do bezpiecznego przesłania pliku bez konta.
                    </p>
                </div>
                {!readonly && (
                    <Button type="button" onClick={() => setEditor('new')}>
                        <FileUp size={15} /> Poproś o dokument
                    </Button>
                )}
            </header>
            {query.isPending && <p role="status">Wczytywanie próśb…</p>}
            {query.isError && (
                <p role="alert">
                    Nie udało się wczytać próśb.{' '}
                    <Button type="button" onClick={() => void query.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </p>
            )}
            {!rows.length && query.isSuccess && (
                <p>
                    Brak oczekujących dokumentów. Przesłane pliki pojawiają się
                    na liście dokumentów klienta.
                </p>
            )}
            {rows.map((request) => (
                <article key={request.id} className={c.request}>
                    <div>
                        <strong>{request.title}</strong>
                        <span className={c.status}>
                            {statuses[request.status]}
                        </span>
                    </div>
                    {request.instructions && (
                        <p className={c.text}>{request.instructions}</p>
                    )}
                    <small>
                        Link ważny do:{' '}
                        {new Date(request.expiresAt).toLocaleString('pl-PL', {
                            timeZone: 'Europe/Warsaw',
                        })}
                    </small>
                    {!readonly && (
                        <div className={c.actions}>
                            {links[request.id] &&
                            request.status === 'pending' ? (
                                <Button
                                    type="button"
                                    onClick={() => void copy(request)}
                                >
                                    <Copy size={14} /> Kopiuj link
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => setEditor(request)}
                                >
                                    <Link2 size={14} /> Utwórz nowy link
                                </Button>
                            )}
                            {request.status === 'pending' && (
                                <Button
                                    type="button"
                                    onClick={() => setRevoking(request)}
                                >
                                    <XCircle size={14} /> Unieważnij link
                                </Button>
                            )}
                        </div>
                    )}
                    {!readonly &&
                        links[request.id] &&
                        request.status === 'pending' && (
                            <TextInput
                                inputTitle={`Link do dokumentu ${request.title}`}
                                value={links[request.id]}
                                onChange={() => {}}
                                readOnly
                            />
                        )}
                </article>
            ))}
            {message && <p role="status">{message}</p>}
            {query.hasNextPage && (
                <Button
                    type="button"
                    pending={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                >
                    Pokaż więcej próśb
                </Button>
            )}
            {editor && (
                <Popup
                    title={
                        editor === 'new'
                            ? 'Poproś o dokument'
                            : 'Nowy link do dokumentu'
                    }
                    closeDisabled={pending}
                    onClose={() => setEditor(null)}
                >
                    <DocumentRequestForm
                        clientId={clientId}
                        request={editor === 'new' ? undefined : editor}
                        onPendingChange={setPending}
                        onCancel={() => setEditor(null)}
                        onSaved={(saved) => {
                            setLinks((current) => ({
                                ...current,
                                [saved.id]: saved.uploadUrl,
                            }))

                            setEditor(null)

                            setMessage(
                                'Link jest gotowy. Skopiuj go i przekaż klientowi.',
                            )
                        }}
                    />
                </Popup>
            )}
            {revoking && (
                <Popup
                    title="Unieważnij link"
                    closeDisabled={pending}
                    onClose={() => setRevoking(null)}
                >
                    <ClientConfirmForm
                        message="Klient nie będzie mógł użyć tego linku do przesłania dokumentu."
                        submitTitle="Unieważnij link"
                        onConfirm={(signal) =>
                            revoke.mutateAsync({
                                clientId,
                                id: revoking.id,
                                signal,
                            })
                        }
                        onSaved={() => setRevoking(null)}
                        onCancel={() => setRevoking(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}

function DocumentRequestForm({
    clientId,
    request,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    clientId: number
    request?: DocumentRequest
    onSaved: (request: DocumentRequestLink) => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [title, setTitle] = useState('')

    const [instructions, setInstructions] = useState('')

    const [days, setDays] = useState(7)

    const create = useCreateDocumentRequest()

    const renew = useRenewDocumentRequest()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Prośba o dokument"
            submitTitle={request ? 'Utwórz nowy link' : 'Utwórz prośbę'}
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (
                        !request &&
                        (!title.trim() || /[\x00-\x1f\x7f-\x9f]/.test(title))
                    ) {
                        submit.setError(
                            'Wpisz nazwę dokumentu bez znaków sterujących.',
                        )

                        return
                    }

                    const saved = request
                        ? await renew.mutateAsync({
                              clientId,
                              id: request.id,
                              expiresInDays: days,
                              signal,
                          })
                        : await create.mutateAsync({
                              clientId,
                              dto: {
                                  title: title.trim(),
                                  instructions: instructions.trim(),
                                  expiresInDays: days,
                              },
                              signal,
                          })

                    if (!signal.aborted) onSaved(saved)
                })
            }
        >
            {request ? (
                <p>
                    Nowy link do „{request.title}” zastąpi poprzedni. Poprzedni
                    link przestanie działać.
                </p>
            ) : (
                <>
                    <TextInput
                        inputTitle="Nazwa oczekiwanego dokumentu"
                        value={title}
                        onChange={setTitle}
                        required
                        maxLength={255}
                    />
                    <FormTextarea
                        inputTitle="Instrukcje dla klienta"
                        value={instructions}
                        onChange={setInstructions}
                        maxLength={2000}
                        rows={3}
                        hint="Tę nazwę i instrukcje zobaczy osoba otwierająca link."
                    />
                </>
            )}
            <FormSelect
                selectTitle="Ważność linku"
                value={days}
                onChange={setDays}
                options={expiries}
            />
        </FormContainer>
    )
}
