'use client'

import { useEffect, useRef, useState } from 'react'
import type { Manager, UpdateManagerDto } from '@/api/managers/managers.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useUpdateMyManager } from '@/shared/hooks/useManagers'

export function ProfileEditForm({
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
    const [name, setName] = useState(manager.name)

    const [surname, setSurname] = useState(manager.surname)

    const [phone, setPhone] = useState(manager.phone ?? '')

    const [position, setPosition] = useState(manager.position ?? '')

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const update = useUpdateMyManager()

    const changed =
        name.trim() !== manager.name ||
        surname.trim() !== manager.surname ||
        phone.trim() !== (manager.phone ?? '') ||
        position.trim() !== (manager.position ?? '')

    useEffect(() => {
        onPendingChange(update.isPending)
    }, [update.isPending, onPendingChange])

    useEffect(
        () => () => {
            controller.current?.abort()
        },
        [],
    )

    async function submit() {
        if (controller.current || !changed) return

        setError(undefined)

        const trimmed = {
            name: name.trim(),
            surname: surname.trim(),
            phone: phone.trim(),
            position: position.trim(),
        }

        if (
            !trimmed.name ||
            !trimmed.surname ||
            trimmed.name.length > 100 ||
            trimmed.surname.length > 100
        ) {
            setError('Imię i nazwisko muszą mieć od 1 do 100 znaków.')

            return
        }

        if (trimmed.phone.length > 32 || trimmed.position.length > 100) {
            setError('Telefon może mieć do 32 znaków, a stanowisko do 100.')

            return
        }

        const dto: UpdateManagerDto = {}

        if (trimmed.name !== manager.name) dto.name = trimmed.name

        if (trimmed.surname !== manager.surname) dto.surname = trimmed.surname

        if (trimmed.phone !== (manager.phone ?? ''))
            dto.phone = trimmed.phone || null

        if (trimmed.position !== (manager.position ?? ''))
            dto.position = trimmed.position || null

        controller.current = new AbortController()

        try {
            await update.mutateAsync({ dto, signal: controller.current.signal })

            onSuccess()
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać profilu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label="Edycja profilu"
            isPending={update.isPending}
            submitTitle="Zapisz zmiany"
            submitDisabled={!changed}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            <TextInput
                name="name"
                inputTitle="Imię"
                value={name}
                onChange={setName}
                autoComplete="given-name"
                maxLength={100}
                required
            />
            <TextInput
                name="surname"
                inputTitle="Nazwisko"
                value={surname}
                onChange={setSurname}
                autoComplete="family-name"
                maxLength={100}
                required
            />
            <TextInput
                name="phone"
                type="tel"
                inputTitle="Telefon"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                maxLength={32}
            />
            <TextInput
                name="position"
                inputTitle="Stanowisko"
                value={position}
                onChange={setPosition}
                autoComplete="organization-title"
                maxLength={100}
            />
        </FormContainer>
    )
}
