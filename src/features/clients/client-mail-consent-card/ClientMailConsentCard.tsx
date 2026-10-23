'use client'

import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button/Button'
import { SettingsRow } from '@/components/ui/settings-row/SettingsRow'
import { Switch } from '@/components/ui/switch/Switch'
import {
    useLegalization,
    useSaveLegalization,
} from '@/shared/hooks/useLegalization'
import { useClientSubmit } from '../useClientSubmit'
import c from './ClientMailConsentCard.module.scss'

export function ClientMailConsentCard({
    clientId,
    readonly,
}: {
    clientId: number
    readonly: boolean
}) {
    const profile = useLegalization(clientId)

    const update = useSaveLegalization(clientId)

    const submit = useClientSubmit()

    const enabled = profile.data
        ? (profile.data.emailMarketingConsent ?? true)
        : false

    function changeConsent(checked: boolean) {
        if (readonly || !profile.isSuccess) return

        void submit.run(async (signal) => {
            await update.mutateAsync({
                dto: { emailMarketingConsent: checked },
                signal,
            })
        })
    }

    return (
        <section className={c.card} aria-label="Udział klienta w rozsyłkach">
            <h2>Rozsyłki e-mail</h2>
            <SettingsRow
                title="Udział w rozsyłkach"
                description={
                    profile.isPending
                        ? 'Wczytywanie…'
                        : profile.isError
                          ? 'Stan niedostępny'
                          : enabled
                            ? 'Włączony'
                            : 'Wyłączony'
                }
                icon={<MailCheck size={18} />}
            >
                <Switch
                    aria-label="Udział w rozsyłkach"
                    checked={enabled}
                    onChange={changeConsent}
                    disabled={readonly || submit.pending || !profile.isSuccess}
                    aria-busy={submit.pending}
                />
            </SettingsRow>
            {profile.isSuccess && (
                <p className={c.hint}>
                    {enabled
                        ? 'Klient może otrzymywać wiadomości z rozsyłek.'
                        : 'Klient jest pomijany także w zaplanowanych rozsyłkach.'}
                </p>
            )}
            {readonly && <p className={c.hint}>Ustawienie tylko do odczytu.</p>}
            {submit.pending && (
                <p className={c.state} role="status">
                    Zapisywanie ustawienia…
                </p>
            )}
            {update.isSuccess && !submit.pending && !submit.error && (
                <p className={c.state} role="status">
                    Ustawienie zapisane.
                </p>
            )}
            {submit.error && (
                <p className={c.error} role="alert">
                    {submit.error}
                </p>
            )}
            {profile.isError && (
                <div className={c.error} role="alert">
                    <p>Nie udało się wczytać ustawienia rozsyłek.</p>
                    <Button
                        type="button"
                        onClick={() => void profile.refetch()}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
        </section>
    )
}
