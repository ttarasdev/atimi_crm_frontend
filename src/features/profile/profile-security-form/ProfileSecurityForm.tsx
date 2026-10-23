'use client'

import { useEffect, useRef, useState } from 'react'
import { CircleCheck, MailCheck } from 'lucide-react'
import { ApiError } from '@/api/api-error'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import {
    useRequestEmailChange,
    useRequestPasswordChange,
} from '@/shared/hooks/useManagerSecurity'
import c from './ProfileSecurityForm.module.scss'

export function ProfileSecurityForm({
    operation,
    email,
    onCancel,
    onPendingChange,
}: {
    operation: 'email' | 'password'
    email: string
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [currentPassword, setCurrentPassword] = useState('')

    const [newEmail, setNewEmail] = useState('')

    const [password, setPassword] = useState('')

    const [repeat, setRepeat] = useState('')

    const [error, setError] = useState<string>()

    const [sentTo, setSentTo] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const requestEmail = useRequestEmailChange()

    const requestPassword = useRequestPasswordChange()

    const pending = requestEmail.isPending || requestPassword.isPending

    useEffect(() => {
        onPendingChange(pending)
    }, [pending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    async function submit() {
        if (controller.current) return

        setError(undefined)

        const address = newEmail.trim().toLowerCase()

        if (!currentPassword || currentPassword.length > 128) {
            setError('Wpisz aktualne hasło.')

            return
        }

        if (
            operation === 'email' &&
            (address === email.toLowerCase() ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ||
                address.length > 254)
        ) {
            setError('Podaj poprawny adres e-mail inny niż obecny.')

            return
        }

        if (
            operation === 'password' &&
            (password.length < 12 || password.length > 128)
        ) {
            setError('Nowe hasło musi mieć od 12 do 128 znaków.')

            return
        }

        if (operation === 'password' && password !== repeat) {
            setError('Hasła muszą być takie same.')

            return
        }

        if (operation === 'password' && password === currentPassword) {
            setError('Nowe hasło musi różnić się od aktualnego.')

            return
        }

        controller.current = new AbortController()

        try {
            if (operation === 'email')
                await requestEmail.mutateAsync({
                    dto: { currentPassword, newEmail: address },
                    signal: controller.current.signal,
                })
            else
                await requestPassword.mutateAsync({
                    dto: { currentPassword, password },
                    signal: controller.current.signal,
                })

            setCurrentPassword('')

            setPassword('')

            setRepeat('')

            setSentTo(operation === 'email' ? address : email)
        } catch (failure) {
            if (!controller.current?.signal.aborted)
                setError(
                    failure instanceof ApiError &&
                        (failure.status === 429 ||
                            (failure.status === 409 &&
                                failure.messages.some((message) =>
                                    message.includes(
                                        'Confirmation was recently sent',
                                    ),
                                )))
                        ? 'Poczekaj minutę przed wysłaniem kolejnego potwierdzenia.'
                        : failure instanceof ApiError &&
                            failure.status === 409 &&
                            operation === 'email'
                          ? 'Ten adres e-mail jest już zajęty. Wybierz inny.'
                          : failure instanceof ApiError &&
                              failure.status === 400
                            ? 'Sprawdź aktualne hasło i poprawność danych. Spróbuj ponownie.'
                            : 'Nie udało się wysłać potwierdzenia. Spróbuj ponownie.',
                )
        } finally {
            controller.current = null
        }
    }

    if (sentTo)
        return (
            <div className={c.success} role="status">
                <span className={c.successIcon}>
                    <MailCheck size={25} aria-hidden="true" />
                </span>
                <h3>Sprawdź pocztę</h3>
                {operation === 'email' ? (
                    <p>
                        Wysłaliśmy linki na <strong>{email}</strong> oraz{' '}
                        <strong>{sentTo}</strong>. Potwierdź oba adresy, aby
                        zakończyć zmianę. Do tego czasu obecny e-mail pozostaje
                        aktualny.
                    </p>
                ) : (
                    <p>
                        Wysłaliśmy link na <strong>{email}</strong>. Aktualne
                        hasło działa do czasu potwierdzenia zmiany.
                    </p>
                )}
                <p>
                    Linki są jednorazowe i ważne przez 30 minut. Po zakończeniu
                    zmiany zalogujesz się ponownie.
                </p>
                <Button type="button" onClick={onCancel}>
                    <CircleCheck size={16} aria-hidden="true" />
                    Gotowe
                </Button>
            </div>
        )

    return (
        <FormContainer
            aria-label={
                operation === 'email' ? 'Zmiana adresu e-mail' : 'Zmiana hasła'
            }
            isPending={pending}
            error={error}
            submitTitle="Wyślij potwierdzenie"
            pendingTitle="Wysyłanie…"
            onCancel={onCancel}
            onSubmit={() => {
                void submit()
            }}
        >
            <p className={c.notice}>
                {operation === 'email'
                    ? 'Zmianę potwierdzisz linkami wysłanymi na obecny i nowy adres e-mail.'
                    : 'Zmianę potwierdzisz linkiem wysłanym na Twój e-mail.'}
            </p>
            {operation === 'email' && (
                <TextInput
                    name="newEmail"
                    type="email"
                    inputTitle="Nowy adres e-mail"
                    autoComplete="email"
                    value={newEmail}
                    onChange={setNewEmail}
                    maxLength={254}
                    required
                />
            )}
            <TextInput
                name="currentPassword"
                type="password"
                inputTitle="Aktualne hasło"
                autoComplete="current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                maxLength={128}
                required
            />
            {operation === 'password' && (
                <>
                    <TextInput
                        name="password"
                        type="password"
                        inputTitle="Nowe hasło"
                        autoComplete="new-password"
                        value={password}
                        onChange={setPassword}
                        minLength={12}
                        maxLength={128}
                        hint="Od 12 do 128 znaków."
                        required
                    />
                    <TextInput
                        name="repeatPassword"
                        type="password"
                        inputTitle="Powtórz nowe hasło"
                        autoComplete="new-password"
                        value={repeat}
                        onChange={setRepeat}
                        minLength={12}
                        maxLength={128}
                        required
                    />
                </>
            )}
        </FormContainer>
    )
}
