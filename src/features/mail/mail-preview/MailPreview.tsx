'use client'

import { useEffect, useState } from 'react'
import type { PreviewMailCampaignDto } from '@/api/mail/mail.types'
import { Button } from '@/components/ui/button/Button'
import { usePreviewMail } from '@/shared/hooks/useMail'
import { useCompanySettings } from '@/shared/hooks/useCompanySettings'
import { useAuth } from '@/shared/hooks/useAuth'
import c from './MailPreview.module.scss'

export function MailPreview({
    dto,
    clientId,
    campaigns = false,
}: {
    dto: PreviewMailCampaignDto
    clientId?: number
    campaigns?: boolean
}) {
    const [html, setHtml] = useState<string>()

    const [error, setError] = useState(false)

    const { mutateAsync } = usePreviewMail(clientId, campaigns)

    const company = useCompanySettings()

    const { manager } = useAuth()

    const [revision, setRevision] = useState(0)

    useEffect(() => {
        const controller = new AbortController()

        const timer = setTimeout(() => {
            void mutateAsync({
                dto: {
                    ...(campaigns && dto.account
                        ? { account: dto.account }
                        : {}),
                    subject: dto.subject.trim() || 'Temat wiadomości',
                    text:
                        dto.text.trim() || 'Treść wiadomości pojawi się tutaj…',
                    template: dto.template,
                },
                signal: controller.signal,
            })
                .then((result) => {
                    if (!controller.signal.aborted) {
                        setHtml(result.html)

                        setError(false)
                    }
                })
                .catch(() => {
                    if (!controller.signal.aborted) setError(true)
                })
        }, 350)

        return () => {
            clearTimeout(timer)

            controller.abort()
        }
    }, [
        dto.subject,
        dto.text,
        dto.template,
        dto.account,
        campaigns,
        mutateAsync,
        revision,
        company.data?.updatedAt,
        manager?.updatedAt,
        manager?.id,
        manager?.name,
        manager?.surname,
        manager?.email,
        manager?.phone,
        manager?.position,
        clientId,
    ])

    return (
        <div className={c.preview} aria-label="Podgląd wiadomości">
            <div className={c.bar}>
                <span>Podgląd wiadomości</span>
                <small>{company.data?.name}</small>
            </div>
            {error ? (
                <div className={c.state} role="alert">
                    <p>Podgląd jest chwilowo niedostępny.</p>
                    <Button
                        type="button"
                        onClick={() => setRevision((value) => value + 1)}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            ) : !html ? (
                <p className={c.state}>Przygotowywanie podglądu…</p>
            ) : (
                <iframe
                    title="Podgląd e-maila"
                    srcDoc={html}
                    sandbox=""
                    referrerPolicy="no-referrer"
                />
            )}
        </div>
    )
}
