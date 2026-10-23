'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError } from '@/api/api-error'
import type {
    Manager,
    ManagerRole,
    UpdateManagerDto,
} from '@/api/managers/managers.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormInput } from '@/components/form-components/form-input/FormInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useCreateManager, useUpdateManager } from '@/shared/hooks/useManagers'
import c from './ManagerForm.module.scss'

export function ManagerForm({
    manager,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    manager?: Manager
    onSuccess: (id: number) => void
    onCancel: () => void
    onPendingChange: (value: boolean) => void
}) {
    const [roleNames, setRoleNames] = useState<ManagerRole[]>([
        'manager',
        'sender',
    ])

    const [name, setName] = useState(manager?.name ?? '')

    const [surname, setSurname] = useState(manager?.surname ?? '')

    const [email, setEmail] = useState('')

    const [password, setPassword] = useState('')

    const [confirmation, setConfirmation] = useState('')

    const [phone, setPhone] = useState(manager?.phone ?? '')

    const [position, setPosition] = useState(manager?.position ?? '')

    const [error, setError] = useState<string>()

    const create = useCreateManager()

    const update = useUpdateManager()

    const mutation = manager ? update : create

    const controller = useRef<AbortController | null>(null)

    useEffect(() => {
        onPendingChange(mutation.isPending)
    }, [mutation.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    const apiError =
        mutation.error instanceof ApiError && mutation.error.status === 409
            ? 'Ten adres email jest już używany. Sprawdź listę pracowników.'
            : mutation.isError
              ? manager
                  ? 'Nie udało się zapisać danych. Spróbuj ponownie.'
                  : 'Nie udało się zakończyć tworzenia konta. Sprawdź listę pracowników; jeśli konto już istnieje, wyślij ponownie potwierdzenie.'
              : undefined

    return (
        <FormContainer
            aria-label={manager ? 'Edycja pracownika' : 'Tworzenie pracownika'}
            isPending={mutation.isPending}
            error={error ?? apiError}
            onCancel={onCancel}
            submitTitle={manager ? 'Zapisz dane' : 'Utwórz konto'}
            onSubmit={() => {
                if (
                    !name.trim() ||
                    !surname.trim() ||
                    name.trim().length > 100 ||
                    surname.trim().length > 100
                ) {
                    setError('Wpisz imię i nazwisko (do 100 znaków).')

                    return
                }

                if (
                    !manager &&
                    (password.length < 12 ||
                        password.length > 128 ||
                        password !== confirmation)
                ) {
                    setError(
                        'Hasło musi mieć 12–128 znaków, a oba pola muszą się zgadzać.',
                    )

                    return
                }

                if (!manager && !roleNames.length) {
                    setError('Wybierz przynajmniej jedną rolę.')

                    return
                }

                setError(undefined)

                controller.current = new AbortController()

                const options = {
                    onSuccess: (result: { id: number }) => {
                        onPendingChange(false)

                        onSuccess(result.id)
                    },
                }

                if (manager) {
                    const dto: UpdateManagerDto = {}

                    if (name.trim() !== manager.name) dto.name = name.trim()

                    if (surname.trim() !== manager.surname)
                        dto.surname = surname.trim()

                    if (phone.trim() !== (manager.phone ?? ''))
                        dto.phone = phone.trim() || null

                    if (position.trim() !== (manager.position ?? ''))
                        dto.position = position.trim() || null

                    update.mutate(
                        {
                            id: manager.id,
                            dto,
                            signal: controller.current.signal,
                        },
                        options,
                    )
                } else
                    create.mutate(
                        {
                            dto: {
                                name: name.trim(),
                                surname: surname.trim(),
                                email: email.trim().toLowerCase(),
                                password,
                                roleNames,
                            },
                            signal: controller.current.signal,
                        },
                        options,
                    )
            }}
        >
            <div className={c.row}>
                <TextInput
                    inputTitle="Imię"
                    value={name}
                    onChange={setName}
                    maxLength={100}
                    autoComplete="given-name"
                    required
                    autoFocus
                />
                <TextInput
                    inputTitle="Nazwisko"
                    value={surname}
                    onChange={setSurname}
                    maxLength={100}
                    autoComplete="family-name"
                    required
                />
            </div>
            {manager ? (
                <>
                    <TextInput
                        inputTitle="Telefon"
                        value={phone}
                        onChange={setPhone}
                        type="tel"
                        maxLength={32}
                        autoComplete="tel"
                    />
                    <TextInput
                        inputTitle="Stanowisko"
                        value={position}
                        onChange={setPosition}
                        maxLength={100}
                        autoComplete="organization-title"
                    />
                    <p className={c.hint}>
                        Adres email i hasło pracownik zmienia w swoim profilu, z
                        potwierdzeniem pocztą.
                    </p>
                </>
            ) : (
                <>
                    <TextInput
                        inputTitle="Email"
                        value={email}
                        onChange={setEmail}
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        required
                    />
                    <FormInput
                        label="Hasło początkowe"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        required
                    />
                    <FormInput
                        label="Powtórz hasło"
                        type="password"
                        value={confirmation}
                        onChange={(event) =>
                            setConfirmation(event.target.value)
                        }
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        required
                    />
                    <fieldset className={c.roles}>
                        <legend>Role pracownika</legend>
                        {(
                            [
                                ['manager', 'Doradca'],
                                ['sender', 'Sender'],
                                ['admin', 'Administrator'],
                            ] as const
                        ).map(([value, title]) => (
                            <label key={value}>
                                <input
                                    type="checkbox"
                                    checked={roleNames.includes(value)}
                                    onChange={(event) =>
                                        setRoleNames(
                                            event.target.checked
                                                ? [...roleNames, value]
                                                : roleNames.filter(
                                                      (role) => role !== value,
                                                  ),
                                        )
                                    }
                                />
                                {title}
                            </label>
                        ))}
                    </fieldset>
                    <p className={c.hint}>
                        Konto otrzyma wybrane role i własny kalendarz. Pracownik
                        aktywuje je linkiem wysłanym na podany email. Hasła nie
                        wysyłamy pocztą.
                    </p>
                </>
            )}
        </FormContainer>
    )
}
