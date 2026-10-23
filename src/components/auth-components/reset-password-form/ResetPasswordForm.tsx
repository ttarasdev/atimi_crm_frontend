'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { CircleCheck, KeyRound } from 'lucide-react'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import { isValidAuthToken, authErrorMessage } from '@/shared/auth/auth-errors'
import { routes } from '@/shared/config/routes'
import { FormInput } from '@/components/form-components/form-input/FormInput'
import { Button } from '@/components/ui/button/Button'
import { AuthShell } from '../auth-shell/AuthShell'
import c from '../auth-shell/AuthShell.module.scss'

export function ResetPasswordForm() {
    const params = useSearchParams()

    const token = params.get('token')

    const [password, setPassword] = useState('')

    const [repeat, setRepeat] = useState('')

    const [mismatch, setMismatch] = useState(false)

    const reset = useMutation({
        meta: { skipAuthHandling: true },
        mutationFn: (value: { token: string; password: string }) =>
            managerAuthApi.resetPassword(value, {
                signal: AbortSignal.timeout(15000),
            }),
        onSuccess: () => {
            setPassword('')

            setRepeat('')

            window.history.replaceState(null, '', routes.resetPassword)
        },
    })

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        setMismatch(password !== repeat)

        if (password === repeat && isValidAuthToken(token) && !reset.isPending)
            reset.mutate({ token, password })
    }

    const valid = isValidAuthToken(token)

    return (
        <AuthShell
            title={
                reset.isSuccess ? 'Hasło zostało zmienione' : 'Ustaw nowe hasło'
            }
            subtitle={
                reset.isSuccess
                    ? 'Gotowe. Możesz już zalogować się do CRM, używając nowego hasła.'
                    : 'Wybierz bezpieczne hasło, którego nie używasz w innych serwisach.'
            }
            icon={reset.isSuccess ? <CircleCheck /> : <KeyRound />}
        >
            {reset.isSuccess ? (
                <div className={c.links}>
                    <Link href={routes.auth}>Przejdź do logowania →</Link>
                </div>
            ) : !valid ? (
                <>
                    <p role="alert" className={c.error}>
                        Brakuje poprawnego linku do zmiany hasła. Otwórz link z
                        wiadomości lub poproś o nowy.
                    </p>
                    <div className={c.links}>
                        <Link href={routes.forgotPassword}>
                            Wyślij nowy link
                        </Link>
                    </div>
                </>
            ) : (
                <form
                    className={c.form}
                    onSubmit={submit}
                    aria-label="Nowe hasło"
                    aria-busy={reset.isPending}
                >
                    <FormInput
                        label="Nowe hasło"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                        hint="Co najmniej 12 znaków."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={reset.isPending}
                    />
                    <FormInput
                        label="Powtórz nowe hasło"
                        name="repeatPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                        value={repeat}
                        onChange={(e) => {
                            setRepeat(e.target.value)

                            setMismatch(false)
                        }}
                        disabled={reset.isPending}
                    />
                    {mismatch && (
                        <p className={c.error} role="alert">
                            Hasła muszą być takie same.
                        </p>
                    )}
                    {reset.error && (
                        <p className={c.error} role="alert">
                            {authErrorMessage(reset.error, 'token')}{' '}
                            <Link href={routes.forgotPassword}>
                                Wyślij nowy link
                            </Link>
                        </p>
                    )}
                    <Button pending={reset.isPending} type="submit">
                        {reset.isPending ? 'Zapisywanie…' : 'Zapisz nowe hasło'}
                    </Button>
                </form>
            )}
            {!reset.isSuccess && (
                <div className={c.links}>
                    <Link href={routes.auth}>Wróć do logowania</Link>
                </div>
            )}
        </AuthShell>
    )
}
