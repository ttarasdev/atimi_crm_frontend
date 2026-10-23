'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { CheckCircle2, FileUp } from 'lucide-react'
import { ApiError } from '@/api/api-error'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { Button } from '@/components/ui/button/Button'
import {
    usePublicDocumentRequest,
    useSubmitRequestedDocument,
} from '@/shared/hooks/useDocumentRequests'
import c from './DocumentRequests.module.scss'

const subscribe = (listener: () => void) => {
    window.addEventListener('hashchange', listener)

    return () => window.removeEventListener('hashchange', listener)
}

const readToken = () => window.location.hash.slice(1)

const serverToken = () => null

export function PublicDocumentUpload() {
    const token = useSyncExternalStore(subscribe, readToken, serverToken)

    return (
        <main className={c.publicPage}>
            <div className={c.publicCard}>
                <span className={c.brand}>Atlantis · Atimi</span>
                {token !== null ? (
                    <UploadForm key={token} token={token} />
                ) : (
                    <p role="status">Wczytywanie prośby…</p>
                )}
            </div>
        </main>
    )
}

function UploadForm({ token }: { token: string }) {
    const view = usePublicDocumentRequest()

    const upload = useSubmitRequestedDocument()

    const [file, setFile] = useState<File | null>(null)

    const [error, setError] = useState('')

    const valid = /^[A-Za-z0-9_-]{43}$/.test(token)

    const { mutate: load } = view

    useEffect(() => {
        if (!valid) return

        const controller = new AbortController()

        load({ token, signal: controller.signal })

        return () => controller.abort()
    }, [load, token, valid])

    if (!valid || view.isError)
        return (
            <>
                <h1>Link jest niedostępny</h1>
                <p>
                    Link mógł wygasnąć lub zostać unieważniony. Poproś opiekuna
                    o nowy link.
                </p>
                {valid && (
                    <Button type="button" onClick={() => load({ token })}>
                        Sprawdź ponownie
                    </Button>
                )}
            </>
        )

    if (!view.data || view.isPending)
        return <p role="status">Wczytywanie prośby…</p>

    if (view.data.status === 'submitted' || upload.isSuccess)
        return (
            <div className={c.success} role="status">
                <CheckCircle2 size={38} />
                <h1>Dokument został przesłany</h1>
                <p>Opiekun otrzymał powiadomienie. Możesz zamknąć tę stronę.</p>
            </div>
        )

    return (
        <>
            <FileUp size={30} aria-hidden="true" />
            <h1>{view.data.title}</h1>
            {view.data.instructions && (
                <p className={c.text}>{view.data.instructions}</p>
            )}
            <p className={c.muted}>
                Link ważny do:{' '}
                {new Date(view.data.expiresAt).toLocaleString('pl-PL', {
                    timeZone: 'Europe/Warsaw',
                })}
            </p>
            <FormContainer
                aria-label="Prześlij dokument"
                submitTitle="Prześlij dokument"
                pendingTitle="Przesyłanie…"
                isPending={upload.isPending}
                submitDisabled={!file}
                error={error}
                onSubmit={async () => {
                    if (!file) return

                    setError('')

                    if (file.size > 20 * 1024 * 1024) {
                        setError(
                            'Plik jest za duży. Maksymalny rozmiar to 20 MB.',
                        )

                        return
                    }

                    try {
                        await upload.mutateAsync({ token, file })
                    } catch (caught) {
                        setError(
                            caught instanceof ApiError && caught.status === 413
                                ? 'Plik jest za duży. Maksymalny rozmiar to 20 MB.'
                                : caught instanceof ApiError &&
                                    (caught.status === 404 ||
                                        caught.status === 410)
                                  ? 'Link nie jest już aktywny lub dokument został już przesłany. Sprawdź, czy plik dotarł.'
                                  : 'Nie udało się przesłać pliku. Sprawdź, czy plik dotarł, zanim spróbujesz ponownie. Dozwolone są PDF, DOCX, XLSX, JPG, PNG i WebP do 20 MB.',
                        )
                    }
                }}
            >
                <MediaFileInput
                    inputTitle="Plik dokumentu"
                    value={file}
                    setFile={(selected) => {
                        setFile(selected)

                        setError('')
                    }}
                    required={!file}
                    accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp"
                    hint="Jeden plik: PDF, DOCX, XLSX, JPG, PNG lub WebP. Maksymalnie 20 MB. Możesz wybrać zdjęcie z telefonu."
                />
            </FormContainer>
            {error && (
                <Button
                    type="button"
                    pending={view.isPending}
                    onClick={() => load({ token })}
                >
                    Sprawdź, czy plik dotarł
                </Button>
            )}
            <p className={c.muted}>
                Nie potrzebujesz konta. Plik trafi bezpośrednio do dokumentów
                opiekuna.
            </p>
        </>
    )
}
