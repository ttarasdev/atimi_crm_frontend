'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/api-error'
import { PublicBucket } from '@/api/public-assets/public-assets.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { useCreatePublicAsset } from '@/shared/hooks/usePublicAssets'
import { useUploadName } from '@/shared/hooks/useUploadName'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export function IconCreateForm({
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    onSuccess: () => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const [selection, setSelection] = useState<{
        file: File
        previewUrl: string
    } | null>(null)

    const [validation, setValidation] = useState<string>()

    const previewUrl = useRef<string | null>(null)

    const controller = useRef<AbortController | null>(null)

    const mutation = useCreatePublicAsset()

    const uploadName = useUploadName()

    useEffect(() => {
        onPendingChange?.(mutation.isPending)
    }, [mutation.isPending, onPendingChange])

    useEffect(
        () => () => {
            controller.current?.abort()

            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
        },
        [],
    )

    function selectFile(file: File | null) {
        mutation.reset()

        setValidation(undefined)

        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)

        previewUrl.current = null

        setSelection(null)

        if (!file) return

        if (!['image/png', 'image/webp'].includes(file.type)) {
            setValidation('Wybierz plik PNG lub WebP.')

            return
        }

        if (!file.size || file.size > MAX_FILE_SIZE) {
            setValidation('Plik może mieć maksymalnie 20 MB.')

            return
        }

        previewUrl.current = URL.createObjectURL(file)

        setSelection({ file, previewUrl: previewUrl.current })

        uploadName.setFileName(file)
    }

    const uploadError =
        mutation.error instanceof ApiError && mutation.error.status === 413
            ? 'Plik może mieć maksymalnie 20 MB.'
            : mutation.error
              ? 'Nie udało się dodać ikony. Spróbuj ponownie.'
              : undefined

    return (
        <FormContainer
            aria-label="Dodawanie ikony"
            isPending={mutation.isPending}
            submitDisabled={!selection}
            submitTitle="Dodaj ikonę"
            pendingTitle="Dodawanie…"
            error={validation ?? uploadError}
            onCancel={onCancel}
            onSubmit={() => {
                if (!selection) return

                if (!uploadName.isValid) {
                    setValidation(
                        'Nazwa ikony musi mieć od 1 do 255 znaków bez znaków sterujących.',
                    )

                    return
                }

                setValidation(undefined)

                controller.current = new AbortController()

                mutation.mutate(
                    {
                        dto: {
                            bucket: PublicBucket.ICONS,
                            originalName: uploadName.name.trim(),
                        },
                        file: selection.file,
                        signal: controller.current.signal,
                    },
                    { onSuccess },
                )
            }}
        >
            <MediaFileInput
                name="file"
                inputTitle="Plik ikony"
                accept="image/png,image/webp"
                value={selection?.file}
                setFile={selectFile}
                hint="PNG lub WebP z przezroczystym tłem · do 20 MB"
                required
                preview={
                    selection ? (
                        <ThemedIcon
                            src={selection.previewUrl}
                            size={64}
                            decorative={false}
                            label="Podgląd ikony"
                        />
                    ) : undefined
                }
            />
            {selection && (
                <TextInput
                    inputTitle="Nazwa ikony"
                    value={uploadName.name}
                    onChange={(value) => {
                        uploadName.setName(value)

                        setValidation(undefined)
                    }}
                    maxLength={255}
                    required
                />
            )}
        </FormContainer>
    )
}
