'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { CircleCheck, MailCheck } from 'lucide-react'
import { managerAuthApi } from '@/api/manager-auth/manager-auth.api'
import { isValidAuthToken, authErrorMessage } from '@/shared/auth/auth-errors'
import { routes } from '@/shared/config/routes'
import { Button } from '@/components/ui/button/Button'
import { AuthShell } from '../auth-shell/AuthShell'
import { EmailRequestForm } from '../email-request-form/EmailRequestForm'
import c from '../auth-shell/AuthShell.module.scss'

export function ConfirmEmailForm() {
    const params = useSearchParams()

    const token = params.get('token')

    const confirm = useMutation({
        meta: { skipAuthHandling: true },
        mutationFn: (value: string) =>
            managerAuthApi.confirmEmail(
                { token: value },
                { signal: AbortSignal.timeout(15000) },
            ),
    })

    if (!token) return <EmailRequestForm confirmation />

    return (
        <AuthShell
            title={
                confirm.isSuccess
                    ? 'E-mail potwierdzony'
                    : 'Potwierdź adres e-mail'
            }
            subtitle={
                confirm.isSuccess
                    ? 'Twoje konto jest już aktywne. Zaloguj się i zacznij pracę ze swoim zespołem.'
                    : 'Potwierdź swój adres, aby aktywować konto w Atimi CRM.'
            }
            icon={confirm.isSuccess ? <CircleCheck /> : <MailCheck />}
        >
            {confirm.isSuccess ? (
                <div className={c.links}>
                    <Link href={routes.auth}>Przejdź do logowania →</Link>
                </div>
            ) : (
                <form
                    className={c.form}
                    aria-busy={confirm.isPending}
                    onSubmit={(event) => {
                        event.preventDefault()

                        if (isValidAuthToken(token) && !confirm.isPending)
                            confirm.mutate(token)
                    }}
                >
                    {!isValidAuthToken(token) && (
                        <p role="alert" className={c.error}>
                            Link potwierdzający jest nieprawidłowy.
                        </p>
                    )}
                    {confirm.error && (
                        <p role="alert" className={c.error}>
                            {authErrorMessage(confirm.error, 'token')}
                        </p>
                    )}
                    <Button
                        type="submit"
                        disabled={!isValidAuthToken(token)}
                        pending={confirm.isPending}
                    >
                        {confirm.isPending
                            ? 'Potwierdzanie…'
                            : 'Potwierdź adres e-mail'}
                    </Button>
                    <div className={c.links}>
                        <Link href={routes.confirmEmail}>
                            Poproś o nowy link
                        </Link>
                        <Link href={routes.auth}>Wróć do logowania</Link>
                    </div>
                </form>
            )}
        </AuthShell>
    )
}
