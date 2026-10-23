'use client'

import { useEffect, useRef, useState } from 'react'
import type { PrivateAsset } from '@/api/private-assets/private-assets.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useRenamePrivateAsset } from '@/shared/hooks/usePrivateAssets'
import { useUploadName } from '@/shared/hooks/useUploadName'

export function DocumentRenameForm({
    asset,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    asset: PrivateAsset
    onSuccess: (asset: PrivateAsset) => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const { name, setName, isValid } = useUploadName(asset.originalName)

    const rename = useRenamePrivateAsset()

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    useEffect(() => {
        onPendingChange(rename.isPending)
    }, [rename.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function submit() {
        if (!isValid || controller.current) return

        controller.current = new AbortController()

        setError(undefined)

        try {
            const saved = await rename.mutateAsync({
                id: asset.id,
                originalName: name.trim(),
                signal: controller.current.signal,
            })

            onPendingChange(false)

            onSuccess(saved)
        } catch {
            if (!controller.current.signal.aborted)
                setError('Nie udało się zmienić nazwy. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label="Zmiana nazwy dokumentu"
            isPending={rename.isPending}
            submitDisabled={!isValid || name.trim() === asset.originalName}
            onSubmit={() => void submit()}
            onCancel={onCancel}
            error={error}
        >
            <TextInput
                inputTitle="Nazwa dokumentu"
                value={name}
                onChange={setName}
                required
                maxLength={255}
                autoFocus
            />
            <p>
                Nazwa zmieni się w bibliotece i przy pobieraniu pliku. Tytuły
                załączników w sprawach klientów pozostają niezależne.
            </p>
        </FormContainer>
    )
}
