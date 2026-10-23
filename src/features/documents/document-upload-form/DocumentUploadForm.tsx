'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/api-error'
import {
    PrivateBucket,
    type AssetVisibility,
    type PrivateAsset,
} from '@/api/private-assets/private-assets.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useCreatePrivateAsset } from '@/shared/hooks/usePrivateAssets'
import { useUploadName } from '@/shared/hooks/useUploadName'

const supported = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp',
]

export function DocumentUploadForm({
    bucket: initialBucket = PrivateBucket.MANAGER_DOCUMENTS,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    bucket?: PrivateBucket
    onSuccess: (asset: PrivateAsset) => void
    onCancel: () => void
    onPendingChange: (value: boolean) => void
}) {
    const [file, setFile] = useState<File | null>(null)

    const { name, setName, setFileName, isValid } = useUploadName()

    const [bucket, setBucket] = useState(initialBucket)

    const [visibility, setVisibility] = useState<AssetVisibility>('author')

    const [error, setError] = useState<string>()

    const upload = useCreatePrivateAsset()

    const controller = useRef<AbortController | null>(null)

    useEffect(() => {
        onPendingChange(upload.isPending)
    }, [upload.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    return (
        <FormContainer
            aria-label="Dodawanie dokumentu"
            isPending={upload.isPending}
            submitTitle="Dodaj dokument"
            pendingTitle="Przesyłanie…"
            submitDisabled={!file || !isValid}
            onCancel={onCancel}
            error={
                error ??
                (upload.isError
                    ? upload.error instanceof ApiError &&
                      upload.error.status === 413
                        ? 'Plik może mieć maksymalnie 20 MB.'
                        : 'Nie udało się dodać dokumentu. Sprawdź plik i spróbuj ponownie.'
                    : undefined)
            }
            onSubmit={() => {
                if (!file || !isValid) return

                controller.current = new AbortController()

                upload.mutate(
                    {
                        dto: { bucket, visibility, originalName: name.trim() },
                        file,
                        signal: controller.current.signal,
                    },
                    {
                        onSuccess: (asset) => {
                            onPendingChange(false)

                            onSuccess(asset)
                        },
                    },
                )
            }}
        >
            <MediaFileInput
                inputTitle="Plik dokumentu"
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
                value={file}
                required
                hint="PDF, DOCX, XLSX lub zdjęcie · do 20 MB · oryginalny format"
                setFile={(selected) => {
                    upload.reset()

                    setError(undefined)

                    if (
                        selected &&
                        (!selected.size ||
                            selected.size > 20 * 1024 * 1024 ||
                            (selected.type &&
                                !supported.includes(selected.type)))
                    ) {
                        setFile(null)

                        setError(
                            'Wybierz PDF, DOCX, XLSX lub zdjęcie o wielkości do 20 MB.',
                        )

                        return
                    }

                    setFile(selected)

                    setFileName(selected)
                }}
            />
            <TextInput
                inputTitle="Nazwa dokumentu"
                value={name}
                onChange={setName}
                required
                maxLength={255}
                hint="Możesz wpisać własną nazwę. Format pliku pozostaje bez zmian."
            />
            <FormSelect
                selectTitle="Folder"
                value={bucket}
                onChange={(value) => {
                    if (
                        value === PrivateBucket.MANAGER_DOCUMENTS ||
                        value === PrivateBucket.USER_DOCUMENTS
                    )
                        setBucket(value)
                }}
                options={[
                    {
                        title: 'Moje dokumenty',
                        value: PrivateBucket.MANAGER_DOCUMENTS,
                    },
                    {
                        title: 'Materiały dla klientów',
                        value: PrivateBucket.USER_DOCUMENTS,
                    },
                ]}
            />
            <FormSelect
                selectTitle="Widoczność"
                value={visibility}
                onChange={(value) => {
                    if (value === 'author' || value === 'team')
                        setVisibility(value)
                }}
                options={[
                    {
                        title: 'Prywatny — tylko ja i administrator',
                        value: 'author',
                    },
                    { title: 'Dla zespołu', value: 'team' },
                ]}
            />
            <p>
                Plik możesz później dołączyć do sprawy klienta lub wiadomości
                email.
            </p>
        </FormContainer>
    )
}
