'use client'

import { useDeferredValue, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Inbox,
    Globe,
    Camera,
    MessageCircle,
    PenLine,
    ArrowUpRight,
} from 'lucide-react'
import type { Lead, LeadSource, LeadStatus } from '@/api/leads/leads.types'
import { useInfiniteLeads } from '@/shared/hooks/useLeads'
import { useInfiniteManagers } from '@/shared/hooks/useManagers'
import { useRoles } from '@/shared/hooks/useRoles'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { LeadForm } from './lead-form/LeadForm'
import { LeadDetails } from './lead-details/LeadDetails'
import { LeadConvertForm } from './lead-convert-form/LeadConvertForm'
import { leadSources, leadStatuses } from './lead-labels'
import c from '@/features/clients/Clients.module.scss'
import l from './Leads.module.scss'

type PopupView =
    | { kind: 'create' }
    | { kind: 'detail'; id: number }
    | { kind: 'convert'; lead: Lead }

const sourcesIcons = {
    website: Globe,
    instagram: Camera,
    facebook: MessageCircle,
    manual: PenLine,
    other: Inbox,
}

const dateFormat = new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeZone: 'Europe/Warsaw',
})

export function LeadsPage({ initialLeadId }: { initialLeadId?: number }) {
    const { hasRole } = useRoles()

    const admin = hasRole('admin')

    const router = useRouter()

    const [search, setSearch] = useState('')

    const deferred = useDeferredValue(search.trim())

    const [status, setStatus] = useState<LeadStatus | null>(null)

    const [source, setSource] = useState<LeadSource | null>(null)

    const [owner, setOwner] = useState<number | 'all' | 'unassigned'>('all')

    const [view, setView] = useState<PopupView | null>(
        initialLeadId ? { kind: 'detail', id: initialLeadId } : null,
    )

    const [pending, setPending] = useState(false)

    const leads = useInfiniteLeads({
        ...(deferred ? { search: deferred } : {}),
        ...(status ? { status } : {}),
        ...(source ? { source } : {}),
        ...(admin && owner === 'unassigned'
            ? { unassigned: true }
            : admin && typeof owner === 'number'
              ? { managerId: owner }
              : {}),
    })

    const managers = useInfiniteManagers({}, admin)

    const rows = leads.data?.pages.flatMap((page) => page.rows) ?? []

    const managerRows = managers.data?.pages.flatMap((page) => page.rows) ?? []

    const total = leads.data?.pages[0]?.total ?? 0

    const close = () => {
        setView(null)

        if (initialLeadId) router.replace('/main/leads', { scroll: false })
    }

    return (
        <section className={c.page} aria-label="Leady">
            <header className={c.header}>
                <div className={c.heading}>
                    <Inbox size={21} aria-hidden="true" />
                    <h1>Leady</h1>
                    {leads.isSuccess && (
                        <span className={l.count}>{total}</span>
                    )}
                </div>
                <Button onClick={() => setView({ kind: 'create' })}>
                    <Plus size={15} aria-hidden="true" />
                    Dodaj zgłoszenie
                </Button>
            </header>
            <p className={c.muted}>
                {admin
                    ? 'Nowe zapytania, przydzielenie opiekuna i pierwszy kontakt.'
                    : 'Twoje zgłoszenia i kontakty przed rozpoczęciem współpracy.'}
            </p>
            <div className={c.panel}>
                <div className={l.filters}>
                    <TextInput
                        inputTitle="Szukaj zgłoszenia"
                        type="search"
                        value={search}
                        onChange={setSearch}
                        maxLength={100}
                        placeholder="Imię, e-mail, telefon lub wiadomość"
                    />
                    <FormSelect<LeadStatus | null>
                        selectTitle="Status"
                        value={status}
                        onChange={setStatus}
                        options={[
                            { title: 'Wszystkie statusy', value: null },
                            ...Object.entries(leadStatuses).map(
                                ([value, data]) => ({
                                    title: data.title,
                                    value: value as LeadStatus,
                                }),
                            ),
                        ]}
                    />
                    <FormSelect<LeadSource | null>
                        selectTitle="Źródło"
                        value={source}
                        onChange={setSource}
                        options={[
                            { title: 'Wszystkie źródła', value: null },
                            ...Object.entries(leadSources).map(
                                ([value, title]) => ({
                                    title,
                                    value: value as LeadSource,
                                }),
                            ),
                        ]}
                    />
                    {admin && (
                        <FormSelect<number | 'all' | 'unassigned'>
                            selectTitle="Opiekun zgłoszenia"
                            value={owner}
                            onChange={setOwner}
                            options={[
                                { title: 'Wszyscy opiekunowie', value: 'all' },
                                { title: 'Bez opiekuna', value: 'unassigned' },
                                ...managerRows.map((manager) => ({
                                    title: `${manager.name} ${manager.surname}`,
                                    value: manager.id,
                                })),
                            ]}
                        />
                    )}
                </div>
                {admin && managers.hasNextPage && (
                    <button
                        type="button"
                        className={c.link}
                        disabled={managers.isFetchingNextPage}
                        onClick={() => void managers.fetchNextPage()}
                    >
                        Więcej opiekunów
                    </button>
                )}
            </div>
            {leads.isPending && (
                <p className={c.state}>Wczytywanie zgłoszeń…</p>
            )}
            {leads.isError && (
                <div className={c.state} role="alert">
                    <p>Nie udało się wczytać zgłoszeń.</p>
                    <Button onClick={() => void leads.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {leads.isSuccess && !rows.length && (
                <div className={`${c.panel} ${c.state}`}>
                    <Inbox size={25} aria-hidden="true" />
                    <p>Brak zgłoszeń w tym widoku.</p>
                    <p className={c.hint}>
                        Zgłoszenia ze strony pojawiają się tutaj po podłączeniu
                        formularza. Pozostałe kontakty możesz dodać ręcznie.
                    </p>
                </div>
            )}
            {!!rows.length && (
                <ul className={l.list}>
                    {rows.map((lead) => {
                        const SourceIcon = sourcesIcons[lead.source]

                        return (
                            <li key={lead.id}>
                                <button
                                    type="button"
                                    className={l.card}
                                    onClick={() =>
                                        setView({ kind: 'detail', id: lead.id })
                                    }
                                    aria-label={`Otwórz zgłoszenie ${lead.name}`}
                                >
                                    <div className={l.cardTop}>
                                        <span className={l.sourceIcon}>
                                            <SourceIcon
                                                size={18}
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className={l.cardName}>
                                            <strong>{lead.name}</strong>
                                            <span>
                                                {leadSources[lead.source]} ·{' '}
                                                {lead.language.toUpperCase()}
                                            </span>
                                        </div>
                                        <ArrowUpRight
                                            size={15}
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <p className={l.excerpt}>{lead.message}</p>
                                    <div className={l.contacts}>
                                        <span>
                                            {lead.email || 'E-mail niepodany'}
                                        </span>
                                        <span>
                                            {lead.phone || 'Telefon niepodany'}
                                        </span>
                                    </div>
                                    <div className={l.cardBottom}>
                                        <span
                                            className={c.badge}
                                            style={{
                                                color: leadStatuses[lead.status]
                                                    .color,
                                            }}
                                        >
                                            {leadStatuses[lead.status].title}
                                        </span>
                                        <span>
                                            {lead.manager
                                                ? `${lead.manager.name} ${lead.manager.surname}`
                                                : lead.managerId
                                                  ? `Opiekun #${lead.managerId}`
                                                  : 'Bez opiekuna'}
                                        </span>
                                    </div>
                                    <time
                                        className={l.date}
                                        dateTime={lead.createdAt}
                                    >
                                        {dateFormat.format(
                                            new Date(lead.createdAt),
                                        )}
                                    </time>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
            {leads.hasNextPage && (
                <Button
                    className={c.secondary}
                    pending={leads.isFetchingNextPage}
                    onClick={() => void leads.fetchNextPage()}
                >
                    Więcej zgłoszeń
                </Button>
            )}
            {view && (
                <Popup
                    title={
                        view.kind === 'create'
                            ? 'Nowe zgłoszenie'
                            : view.kind === 'convert'
                              ? 'Zgłoszenie → klient'
                              : 'Zgłoszenie'
                    }
                    closeDisabled={pending}
                    onClose={close}
                >
                    {view.kind === 'create' && (
                        <LeadForm
                            onSaved={close}
                            onCancel={close}
                            onPendingChange={setPending}
                        />
                    )}
                    {view.kind === 'detail' && (
                        <LeadDetails
                            id={view.id}
                            onClose={close}
                            onConvert={(lead) =>
                                setView({ kind: 'convert', lead })
                            }
                            onPendingChange={setPending}
                        />
                    )}
                    {view.kind === 'convert' && (
                        <LeadConvertForm
                            lead={view.lead}
                            onSaved={(clientId) => {
                                close()

                                router.push(`/main/clients/${clientId}`)
                            }}
                            onCancel={() =>
                                setView({ kind: 'detail', id: view.lead.id })
                            }
                            onPendingChange={setPending}
                        />
                    )}
                </Popup>
            )}
        </section>
    )
}
