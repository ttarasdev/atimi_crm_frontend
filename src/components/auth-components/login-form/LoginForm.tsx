'use client'

import Link from 'next/link'
import {
    useEffect,
    useState,
    useSyncExternalStore,
    type FormEvent,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLogin } from '@/shared/hooks/useLogin'
import { getSafeReturnPath, routes } from '@/shared/config/routes'
import { useAuth } from '@/shared/hooks/useAuth'
import { authErrorMessage } from '@/shared/auth/auth-errors'
import { AuthShell } from '../auth-shell/AuthShell'
import { FormInput } from '@/components/form-components/form-input/FormInput'
import { Button } from '@/components/ui/button/Button'
import c from '../auth-shell/AuthShell.module.scss'

const subscribe = () => () => {}

export function LoginForm() {
    const ready = useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    )

    const params = useSearchParams()

    const router = useRouter()

    const { status } = useAuth()

    const destination = getSafeReturnPath(params.get('next'))

    useEffect(() => {
        if (status === 'authenticated') router.replace(destination)
    }, [status, router, destination])

    const login = useLogin(params.get('next'))

    const [email, setEmail] = useState('')

    const [password, setPassword] = useState('')

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (ready && !login.isPending)
            login.mutate({ email: email.trim().toLowerCase(), password })
    }

    return (
        <AuthShell
            title="Zaloguj się"
            subtitle="Witaj ponownie. Zaloguj się do panelu i wróć do pracy ze swoim zespołem."
        >
            {(params.get('updated') === 'email' ||
                params.get('updated') === 'password') && (
                <p className={c.notice} role="status">
                    {params.get('updated') === 'email'
                        ? 'Adres e-mail został zmieniony. Zaloguj się nowym adresem.'
                        : 'Hasło zostało zmienione. Zaloguj się nowym hasłem.'}
                </p>
            )}
            <form
                className={c.form}
                method="post"
                onSubmit={submit}
                aria-label="Logowanie"
                aria-busy={login.isPending}
            >
                <FormInput
                    label="Adres e-mail"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="twoj@email.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                    disabled={!ready || login.isPending}
                />
                <FormInput
                    label="Hasło"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Wpisz swoje hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    maxLength={128}
                    disabled={!ready || login.isPending}
                />
                <Link className={c.forgot} href={routes.forgotPassword}>
                    Nie pamiętasz hasła?
                </Link>
                {login.error && (
                    <p role="alert" className={c.error}>
                        {authErrorMessage(login.error, 'login')}
                    </p>
                )}
                <Button
                    type="submit"
                    pending={login.isPending}
                    disabled={!ready}
                >
                    {login.isPending ? 'Logowanie…' : 'Zaloguj się'}
                </Button>
            </form>
            <div className={c.links}>
                <Link href={routes.confirmEmail}>Potwierdź adres e-mail</Link>
                <span>Nie masz dostępu? Skontaktuj się z administratorem.</span>
            </div>
        </AuthShell>
    )
}
