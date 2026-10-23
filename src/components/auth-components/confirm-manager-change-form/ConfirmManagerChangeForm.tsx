'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CircleCheck, KeyRound, MailCheck } from 'lucide-react'
import { clearAccessToken } from '@/api/auth-token'
import { Button } from '@/components/ui/button/Button'
import { isValidAuthToken, authErrorMessage } from '@/shared/auth/auth-errors'
import { getSessionSnapshot } from '@/shared/auth/session-store'
import { routes } from '@/shared/config/routes'
import { useConfirmManagerChange } from '@/shared/hooks/useManagerSecurity'
import { AuthShell } from '../auth-shell/AuthShell'
import c from '../auth-shell/AuthShell.module.scss'

export function ConfirmManagerChangeForm({
    operation,
}: {
    operation: 'email' | 'password'
}) {
    const params = useSearchParams()

    const router = useRouter()

    const token = params.get('token')

    const confirm = useConfirmManagerChange(operation)

    const controller = useRef<AbortController | null>(null)

    useEffect(() => () => controller.current?.abort(), [])

    const waiting =
        confirm.isSuccess &&
        'completed' in confirm.data &&
        !confirm.data.completed

    const title =
        operation === 'email'
            ? 'Potwierdź zmianę e-maila'
            : 'Potwierdź zmianę hasła'

    const path =
        operation === 'email'
            ? routes.confirmEmailChange
            : routes.confirmPasswordChange

    async function submit() {
        if (!isValidAuthToken(token) || controller.current) return

        controller.current = new AbortController()

        const revision = getSessionSnapshot().revision

        try {
            const result = await confirm.mutateAsync({
                token,
                signal: AbortSignal.any([
                    controller.current.signal,
                    AbortSignal.timeout(15000),
                ]),
            })

            window.history.replaceState(null, '', path)

            if (
                operation === 'email' &&
                'completed' in result &&
                !result.completed
            )
                return

            if (getSessionSnapshot().revision === revision) clearAccessToken()

            router.replace(`${routes.auth}?updated=${operation}`)
        } catch {
            // The mutation error is shown below; the link remains available for retry.
        } finally {
            controller.current = null
        }
    }

    return (
        <AuthShell
            title={waiting ? 'Adres potwierdzony' : title}
            subtitle={
                waiting
                    ? 'Potwierdź także drugi adres, aby zakończyć zmianę e-maila.'
                    : operation === 'email'
                      ? 'Adres zmieni się po potwierdzeniu linków z obu skrzynek. Po zakończeniu zalogujesz się ponownie.'
                      : 'Potwierdzenie włączy nowe hasło i zakończy wszystkie sesje. Następnie zalogujesz się ponownie.'
            }
            icon={
                waiting ? (
                    <CircleCheck />
                ) : operation === 'email' ? (
                    <MailCheck />
                ) : (
                    <KeyRound />
                )
            }
        >
            {waiting ? (
                <>
                    <p className={c.notice} role="status">
                        Ten adres jest już potwierdzony. Otwórz drugi link z
                        wiadomości wysłanej na pozostały adres. Obecny e-mail
                        działa do zakończenia obu potwierdzeń.
                    </p>
                    <div className={c.links}>
                        <Link href={routes.profile}>Wróć do profilu</Link>
                    </div>
                </>
            ) : !isValidAuthToken(token) ? (
                <>
                    <p className={c.error} role="alert">
                        Brakuje poprawnego linku do potwierdzenia zmiany. Otwórz
                        wiadomość lub poproś o nowy link w profilu.
                    </p>
                    <div className={c.links}>
                        <Link href={routes.profile}>Wróć do profilu</Link>
                        <Link href={routes.auth}>Wróć do logowania</Link>
                    </div>
                </>
            ) : (
                <form
                    className={c.form}
                    aria-label={title}
                    aria-busy={confirm.isPending}
                    onSubmit={(event) => {
                        event.preventDefault()

                        void submit()
                    }}
                >
                    <p className={c.notice}>
                        Potwierdź tylko zmianę, którą samodzielnie zleciłeś w
                        swoim profilu. Link jest jednorazowy i ważny przez 30
                        minut.
                    </p>
                    {confirm.error && (
                        <p className={c.error} role="alert">
                            {authErrorMessage(confirm.error, 'token')}
                        </p>
                    )}
                    <Button type="submit" pending={confirm.isPending}>
                        {confirm.isPending ? 'Potwierdzanie…' : title}
                    </Button>
                    <div className={c.links}>
                        <Link href={routes.profile}>
                            Poproś o nowy link w profilu
                        </Link>
                        <Link href={routes.auth}>Wróć do logowania</Link>
                    </div>
                </form>
            )}
        </AuthShell>
    )
}
