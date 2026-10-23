'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRoundPlus, Mail, Phone, Globe } from 'lucide-react'
import type { Lead, LeadStatus } from '@/api/leads/leads.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormManagerInput } from '@/components/form-components/form-manager-input/FormManagerInput'
import { Button } from '@/components/ui/button/Button'
import { useLead, useUpdateLead } from '@/shared/hooks/useLeads'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { leadSources, leadStatuses } from '../lead-labels'
import c from '@/features/clients/Clients.module.scss'
import l from '../Leads.module.scss'

const dateFormat = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
})

export function LeadDetails({
    id,
    onClose,
    onConvert,
    onPendingChange,
}: {
    id: number
    onClose: () => void
    onConvert: (lead: Lead) => void
    onPendingChange: (pending: boolean) => void
}) {
    const query = useLead(id)

    if (query.isPending)
        return <p className={c.state}>Wczytywanie zgłoszenia…</p>

    if (query.isError)
        return (
            <div className={c.state} role="alert">
                <p>Nie udało się wczytać zgłoszenia.</p>
                <Button onClick={() => void query.refetch()}>
                    Spróbuj ponownie
                </Button>
            </div>
        )

    return (
        <LeadDetailsContent
            key={query.data.id}
            lead={query.data}
            onClose={onClose}
            onConvert={onConvert}
            onPendingChange={onPendingChange}
        />
    )
}

function LeadDetailsContent({
    lead,
    onClose,
    onConvert,
    onPendingChange,
}: {
    lead: Lead
    onClose: () => void
    onConvert: (lead: Lead) => void
    onPendingChange: (pending: boolean) => void
}) {
    const { hasRole } = useRoles()

    const [status, setStatus] = useState<Exclude<LeadStatus, 'converted'>>(
        lead.status === 'converted' ? 'qualified' : lead.status,
    )

    const [note, setNote] = useState(lead.internalNote ?? '')

    const [assigned, setAssigned] = useState(Boolean(lead.managerId))

    const [managerId, setManagerId] = useState<number | null>(lead.managerId)

    const update = useUpdateLead()

    const submit = useClientSubmit(onPendingChange)

    return (
        <div className={c.stack}>
            <div className={l.detailHeader}>
                <strong>{lead.name}</strong>
                <span
                    className={c.badge}
                    style={{ color: leadStatuses[lead.status].color }}
                >
                    {leadStatuses[lead.status].title}
                </span>
            </div>
            <div className={c.meta}>
                <Globe size={14} aria-hidden="true" />
                {leadSources[lead.source]} · {lead.language.toUpperCase()} ·{' '}
                <time dateTime={lead.createdAt}>
                    {dateFormat.format(new Date(lead.createdAt))}
                </time>
            </div>
            <div className={l.contactLinks}>
                {lead.email && (
                    <a href={`mailto:${lead.email}`}>
                        <Mail size={15} aria-hidden="true" />
                        {lead.email}
                    </a>
                )}
                {lead.phone && (
                    <a href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`}>
                        <Phone size={15} aria-hidden="true" />
                        {lead.phone}
                    </a>
                )}
            </div>
            <div className={l.message}>
                <span>Wiadomość</span>
                <p>{lead.message}</p>
            </div>
            {lead.consentedAt && (
                <p className={c.hint}>
                    Zgoda na przetwarzanie danych z formularza:{' '}
                    {dateFormat.format(new Date(lead.consentedAt))}
                </p>
            )}
            {lead.status === 'converted' ? (
                <>
                    {lead.internalNote && (
                        <p className={l.message}>{lead.internalNote}</p>
                    )}
                    <Link
                        className={c.link}
                        href={`/main/clients/${lead.clientId}`}
                    >
                        Otwórz kartę klienta →
                    </Link>
                </>
            ) : (
                <>
                    <FormContainer
                        aria-label="Obsługa zgłoszenia"
                        isPending={submit.pending}
                        error={submit.error}
                        onCancel={onClose}
                        submitTitle="Zapisz zgłoszenie"
                        onSubmit={() =>
                            void submit.run(async (signal) => {
                                if (
                                    hasRole('admin') &&
                                    assigned &&
                                    !managerId
                                ) {
                                    submit.setError('Wybierz opiekuna.')

                                    return
                                }

                                await update.mutateAsync({
                                    id: lead.id,
                                    dto: {
                                        status,
                                        internalNote: note.trim() || null,
                                        ...(hasRole('admin')
                                            ? {
                                                  managerId: assigned
                                                      ? managerId
                                                      : null,
                                              }
                                            : {}),
                                    },
                                    signal,
                                })

                                if (!signal.aborted) onClose()
                            })
                        }
                    >
                        <FormSelect<Exclude<LeadStatus, 'converted'>>
                            selectTitle="Status zgłoszenia"
                            value={status}
                            onChange={setStatus}
                            options={(
                                [
                                    'new',
                                    'contacted',
                                    'qualified',
                                    'lost',
                                ] as const
                            ).map((value) => ({
                                title: leadStatuses[value].title,
                                value,
                            }))}
                        />
                        {hasRole('admin') && (
                            <>
                                <FormSelect
                                    selectTitle="Przydzielenie"
                                    value={assigned ? 'assigned' : 'unassigned'}
                                    onChange={(value) =>
                                        setAssigned(value === 'assigned')
                                    }
                                    options={[
                                        {
                                            title: 'Bez opiekuna',
                                            value: 'unassigned',
                                        },
                                        {
                                            title: 'Przypisany do pracownika',
                                            value: 'assigned',
                                        },
                                    ]}
                                />
                                {assigned && (
                                    <FormManagerInput
                                        value={managerId}
                                        onChange={setManagerId}
                                        inputTitle="Opiekun zgłoszenia"
                                        disabled={submit.pending}
                                    />
                                )}
                            </>
                        )}
                        <FormTextarea
                            inputTitle="Notatka wewnętrzna"
                            value={note}
                            onChange={setNote}
                            maxLength={4000}
                            rows={3}
                        />
                    </FormContainer>
                    <Button
                        className={c.secondary}
                        disabled={submit.pending || lead.status === 'lost'}
                        onClick={() => onConvert(lead)}
                    >
                        <UserRoundPlus size={15} aria-hidden="true" />
                        Przenieś do klientów
                    </Button>
                    {lead.status === 'lost' && (
                        <p className={c.hint}>
                            Zmień status i zapisz zgłoszenie, aby przenieść je
                            do klientów.
                        </p>
                    )}
                </>
            )}
        </div>
    )
}
