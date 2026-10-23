'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/api-error'
import type { Manager } from '@/api/managers/managers.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { MediaFileInput } from '@/components/form-components/media-file-input/MediaFileInput'
import { Button } from '@/components/ui/button/Button'
import { ManagerAvatar } from '@/components/ui/manager-avatar/ManagerAvatar'
import { useChangeMyAvatar } from '@/shared/hooks/useManagers'
import c from './ProfileAvatarForm.module.scss'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export function ProfileAvatarForm({
    manager,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    manager: Manager
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [selection, setSelection] = useState<{
        file: File
        previewUrl: string
    } | null>(null)

    const [removing, setRemoving] = useState(false)

    const [error, setError] = useState<string>()

    const previewUrl = useRef<string | null>(null)

    const controller = useRef<AbortController | null>(null)

    const change = useChangeMyAvatar()

    useEffect(() => {
        onPendingChange(change.isPending)
    }, [change.isPending, onPendingChange])

    useEffect(
        () => () => {
            controller.current?.abort()

            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
        },
        [],
    )

    function selectFile(file: File | null) {
        setError(undefined)

        setRemoving(false)

        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)

        previewUrl.current = null

        setSelection(null)

        if (!file) return

        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            setError('Wybierz zdjęcie PNG, JPG lub WebP.')

            return
        }

        if (!file.size || file.size > MAX_FILE_SIZE) {
            setError('Zdjęcie może mieć maksymalnie 20 MB.')

            return
        }

        previewUrl.current = URL.createObjectURL(file)

        setSelection({ file, previewUrl: previewUrl.current })
    }

    async function submit() {
        const file = selection?.file ?? null

        if (controller.current || (!file && !removing)) return

        setError(undefined)

        controller.current = new AbortController()

        try {
            await change.mutateAsync({
                file: removing ? null : file,
                signal: controller.current.signal,
            })

            onSuccess()
        } catch (failure) {
            if (!controller.current?.signal.aborted)
                setError(
                    failure instanceof ApiError && failure.status === 413
                        ? 'Zdjęcie może mieć maksymalnie 20 MB.'
                        : failure instanceof ApiError && failure.status === 400
                          ? 'Ten plik nie jest poprawnym zdjęciem PNG, JPG lub WebP.'
                          : 'Nie udało się zmienić zdjęcia. Spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label="Zmiana zdjęcia profilowego"
            isPending={change.isPending}
            submitTitle={removing ? 'Usuń zdjęcie' : 'Zapisz zdjęcie'}
            submitDisabled={!selection && !removing}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            {removing ? (
                <p className={c.notice}>
                    Usunąć zdjęcie profilowe? W jego miejscu pojawią się Twoje
                    inicjały.
                </p>
            ) : (
                <MediaFileInput
                    inputTitle="Zdjęcie profilowe"
                    name="file"
                    accept="image/png,image/jpeg,image/webp"
                    value={selection?.file}
                    setFile={selectFile}
                    hint="PNG, JPG lub WebP · do 20 MB. Podgląd ma kwadratowy kształt."
                    preview={
                        <ManagerAvatar
                            manager={manager}
                            src={selection?.previewUrl}
                            size={64}
                            label="Podgląd zdjęcia"
                        />
                    }
                />
            )}
            {manager.avatarId && !removing && (
                <Button
                    className={c.remove}
                    type="button"
                    onClick={() => {
                        setRemoving(true)

                        setError(undefined)
                    }}
                >
                    Usuń zdjęcie
                </Button>
            )}
        </FormContainer>
    )
}
