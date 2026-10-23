'use client'

import Link from 'next/link'
import { useState, useEffect, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import { authErrorMessage } from '@/shared/auth/auth-errors'
import { routes } from '@/shared/config/routes'
import { FormInput } from '@/components/form-components/form-input/FormInput'
import { Button } from '@/components/ui/button/Button'
import { AuthShell } from '../auth-shell/AuthShell'
import c from '../auth-shell/AuthShell.module.scss'

export function EmailRequestForm({
    confirmation = false,
}: {
    confirmation?: boolean
}) {
    const [email, setEmail] = useState('')

    const [sent, setSent] = useState(false)

    const [remaining, setRemaining] = useState(0)

    useEffect(() => {
        if (!remaining) return

        const timer = setTimeout(() => setRemaining(remaining - 1), 1000)

        return () => clearTimeout(timer)
    }, [remaining])

    const request = useMutation({
        meta: { skipAuthHandling: true },
        mutationFn: () =>
            (confirmation
                ? managerAuthApi.resendConfirmation
                : managerAuthApi.forgotPassword)(
                { email: email.trim().toLowerCase() },
                { signal: AbortSignal.timeout(15000) },
            ),
        onSuccess: () => {
            setSent(true)

            setRemaining(60)
        },
    })

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!request.isPending && !remaining) request.mutate()
    }

    return (
        <AuthShell
            title={
                sent
                    ? 'Sprawdź swoją pocztę'
                    : confirmation
                      ? 'Potwierdź adres e-mail'
                      : 'Odzyskaj hasło'
            }
            subtitle={
                sent
                    ? 'Jeszcze jeden krok. Otwórz wiadomość i skorzystaj z linku, który znajdziesz w środku.'
                    : confirmation
                      ? 'Aktywuj konto, aby rozpocząć pracę w Atimi CRM.'
                      : 'Podaj adres e-mail przypisany do Twojego konta. Wyślemy Ci link do zmiany hasła.'
            }
            icon={sent ? <MailCheck /> : undefined}
        >
            <form
                className={c.form}
                onSubmit={submit}
                aria-label={
                    confirmation
                        ? 'Potwierdzenie adresu e-mail'
                        : 'Odzyskiwanie hasła'
                }
                aria-busy={request.isPending}
            >
                {sent ? (
                    <p className={c.notice} role="status">
                        Jeśli konto <strong>{email}</strong> istnieje i{' '}
                        {confirmation
                            ? 'oczekuje na aktywację'
                            : 'jest aktywne'}
                        , wysłaliśmy wiadomość. Sprawdź również folder spam.
                        Link jest ważny przez{' '}
                        {confirmation ? '24 godziny' : '30 minut'}.
                    </p>
                ) : (
                    <FormInput
                        label="Adres e-mail"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="twoj@email.pl"
                        disabled={request.isPending}
                    />
                )}
                {request.error && (
                    <p role="alert" className={c.error}>
                        {authErrorMessage(request.error)}
                    </p>
                )}
                <Button
                    type="submit"
                    pending={request.isPending}
                    disabled={remaining > 0}
                >
                    {request.isPending
                        ? 'Wysyłanie…'
                        : remaining
                          ? `Wyślij ponownie za ${remaining} s`
                          : sent
                            ? 'Wyślij ponownie'
                            : 'Wyślij link'}
                </Button>
                {sent && (
                    <Button
                        type="button"
                        onClick={() => {
                            setSent(false)

                            setRemaining(0)

                            request.reset()
                        }}
                    >
                        Użyj innego adresu
                    </Button>
                )}
            </form>
            <div className={c.links}>
                <Link href={routes.auth}>
                    <ArrowLeft size={12} /> Wróć do logowania
                </Link>
            </div>
        </AuthShell>
    )
}
