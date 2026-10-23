'use client'

import { useDeferredValue, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import type {
    Client,
    ClientStatus,
    ClientPriority,
    ClientPaymentStatus,
} from '@/api/clients/clients.types'
import { useInfiniteClients, useClientSources } from '@/shared/hooks/useClients'
import { useInfiniteManagers } from '@/shared/hooks/useManagers'
import { useInfiniteStageTemplates } from '@/shared/hooks/useStageTemplates'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { useRoles } from '@/shared/hooks/useRoles'
import { useAuth } from '@/shared/hooks/useAuth'
import { ClientForm } from '../client-form/ClientForm'
import {
    clientStatuses,
    clientPriorities,
    clientPaymentStatuses,
    paymentAmountLabel,
} from '../client-labels'
import c from './ClientsList.module.scss'

type ClientView = 'all' | 'mine' | 'vip' | 'archived'

const createdDate = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
})

export function ClientsPage({
    initialManagerId = null,
    createOnLoad = false,
}: {
    initialManagerId?: number | null
    createOnLoad?: boolean
}) {
    const router = useRouter()

    const searchParams = useSearchParams()

    const { hasRole } = useRoles()

    const { manager } = useAuth()

    const admin = hasRole('admin')

    const [managerId, setManagerId] = useState<number | null>(initialManagerId)

    const [search, setSearch] = useState('')

    const deferred = useDeferredValue(search.trim())

    const [status, setStatus] = useState<ClientStatus | null>(null)

    const [priority, setPriority] = useState<ClientPriority | null>(null)

    const [paymentStatus, setPaymentStatus] =
        useState<ClientPaymentStatus | null>(null)

    const [sourceId, setSourceId] = useState<number | null>(null)

    const [stageTemplateId, setStageTemplateId] = useState<number | null>(null)

    const [view, setView] = useState<ClientView>('all')

    const [showFilters, setShowFilters] = useState(true)

    const [create, setCreate] = useState(false)

    const [pending, setPending] = useState(false)

    const clients = useInfiniteClients({
        archived: view === 'archived',
        ...(deferred ? { search: deferred } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(priority ? { priority } : {}),
        ...(sourceId ? { sourceId } : {}),
        ...(stageTemplateId ? { stageTemplateId } : {}),
        ...(managerId ? { managerId } : {}),
    })

    const sources = useClientSources()

    const managers = useInfiniteManagers({}, admin)

    const stageTemplates = useInfiniteStageTemplates()

    const sourceRows = sources.data?.pages.flatMap((page) => page.rows) ?? []

    const managerRows = managers.data?.pages.flatMap((page) => page.rows) ?? []

    const templateRows =
        stageTemplates.data?.pages.flatMap((page) => page.rows) ?? []

    const rows = clients.data?.pages.flatMap((page) => page.rows) ?? []

    const total = clients.data?.pages[0]?.total ?? 0

    const hasFilters = Boolean(
        search ||
            status ||
            paymentStatus ||
            priority ||
            sourceId ||
            stageTemplateId ||
            managerId,
    )

    const selectView = (next: ClientView) => {
        setView(next)

        setManagerId(next === 'mine' ? (manager?.id ?? null) : null)

        setPriority(next === 'vip' ? 'vip' : null)
    }

    const closeCreate = () => {
        setCreate(false)

        if (createOnLoad) {
            const query = new URLSearchParams(searchParams.toString())

            query.delete('create')

            router.replace(
                `/main/clients${query.size ? `?${query.toString()}` : ''}`,
                { scroll: false },
            )
        }
    }

    const ownerName = (client: Client) => {
        const owner =
            client.manager ??
            managerRows.find((item) => item.id === client.managerId) ??
            (manager?.id === client.managerId ? manager : undefined)

        return owner ? `${owner.name} ${owner.surname}`.trim() : '—'
    }

    return (
        <section className={c.page} aria-label="Klienci">
            <header className={c.header}>
                <div>
                    <div className={c.title}>
                        <h1>Klienci</h1>
                        {clients.isSuccess && <span>{total}</span>}
                    </div>
                    <p>Kontakty, priorytety i sprawy w jednym miejscu.</p>
                </div>
                <Button onClick={() => setCreate(true)}>
                    <Plus size={15} aria-hidden="true" />
                    Dodaj klienta
                </Button>
            </header>
            <nav className={c.views} aria-label="Widok klientów">
                <button
                    type="button"
                    aria-pressed={view === 'all'}
                    onClick={() => selectView('all')}
                >
                    Wszyscy
                </button>
                {
                    <button
                        type="button"
                        aria-pressed={view === 'mine'}
                        onClick={() => selectView('mine')}
                    >
                        Moi klienci
                    </button>
                }
                <button
                    type="button"
                    aria-pressed={view === 'vip'}
                    onClick={() => selectView('vip')}
                >
                    VIP
                </button>
                <button
                    type="button"
                    aria-pressed={view === 'archived'}
                    onClick={() => selectView('archived')}
                >
                    Archiwum
                </button>
            </nav>
            <div className={c.toolbar}>
                <div className={c.search}>
                    <Search size={16} aria-hidden="true" />
                    <TextInput
                        inputTitle="Szukaj klienta"
                        value={search}
                        onChange={setSearch}
                        placeholder="Szukaj po imieniu, nazwisku, e-mailu lub telefonie"
                        maxLength={100}
                        type="search"
                    />
                </div>
                <button
                    className={c.filterButton}
                    type="button"
                    aria-expanded={showFilters}
                    aria-controls="client-list-filters"
                    onClick={() => setShowFilters((value) => !value)}
                >
                    <SlidersHorizontal size={14} aria-hidden="true" />
                    Filtry
                </button>
                {hasFilters && (
                    <button
                        className={c.clearButton}
                        type="button"
                        onClick={() => {
                            setSearch('')

                            setStatus(null)

                            setPriority(null)

                            setPaymentStatus(null)

                            setSourceId(null)

                            setStageTemplateId(null)

                            setManagerId(null)

                            if (view !== 'archived') setView('all')
                        }}
                    >
                        Wyczyść filtry
                    </button>
                )}
            </div>
            {showFilters && (
                <div className={c.filters} id="client-list-filters">
                    <FormSelect<ClientStatus | null>
                        selectTitle="Status"
                        value={status}
                        onChange={setStatus}
                        options={[
                            { title: 'Status: Wszystkie', value: null },
                            ...Object.entries(clientStatuses).map(
                                ([value, data]) => ({
                                    title: data.title,
                                    value: value as ClientStatus,
                                }),
                            ),
                        ]}
                    />
                    <FormSelect<ClientPaymentStatus | null>
                        selectTitle="Płatność"
                        value={paymentStatus}
                        onChange={setPaymentStatus}
                        options={[
                            { title: 'Płatność: Wszystkie', value: null },
                            ...Object.entries(clientPaymentStatuses).map(
                                ([value, item]) => ({
                                    title: item.title,
                                    value: value as ClientPaymentStatus,
                                }),
                            ),
                        ]}
                    />
                    <FormSelect<ClientPriority | null>
                        selectTitle="Priorytet"
                        value={priority}
                        onChange={(value) => {
                            setPriority(value)

                            if (view === 'vip' && value !== 'vip')
                                setView('all')
                        }}
                        options={[
                            { title: 'Priorytet: Wszystkie', value: null },
                            ...Object.entries(clientPriorities).map(
                                ([value, title]) => ({
                                    title,
                                    value: value as ClientPriority,
                                }),
                            ),
                        ]}
                    />
                    <FormSelect<number | null>
                        selectTitle="Aktualny etap"
                        value={stageTemplateId}
                        onChange={setStageTemplateId}
                        disabled={stageTemplates.isPending}
                        options={[
                            { title: 'Aktualny etap: Wszystkie', value: null },
                            ...templateRows.map((template) => ({
                                title: `${template.title}${template.isActive ? '' : ' (archiwalny)'}`,
                                value: template.id,
                            })),
                        ]}
                    />
                    <FormSelect<number | null>
                        selectTitle="Źródło"
                        value={sourceId}
                        onChange={setSourceId}
                        options={[
                            { title: 'Źródło: Wszystkie', value: null },
                            ...sourceRows.map((source) => ({
                                title: source.name,
                                value: source.id,
                            })),
                        ]}
                    />
                    {admin && (
                        <FormSelect<number | null>
                            selectTitle="Opiekun klienta"
                            value={managerId}
                            onChange={(value) => {
                                setManagerId(value)

                                if (view === 'mine' && value !== manager?.id)
                                    setView('all')
                            }}
                            disabled={managers.isPending}
                            options={[
                                { title: 'Opiekun: Wszyscy', value: null },
                                ...managerRows.map((item) => ({
                                    title: `${item.name} ${item.surname}`,
                                    value: item.id,
                                })),
                            ]}
                        />
                    )}
                    <span className={c.filteredCount}>
                        {clients.isSuccess
                            ? `${total} klientów`
                            : 'Wczytywanie…'}
                    </span>
                    {admin && managers.hasNextPage && (
                        <button
                            className={c.clearButton}
                            type="button"
                            disabled={managers.isFetchingNextPage}
                            onClick={() => void managers.fetchNextPage()}
                        >
                            Pokaż więcej opiekunów
                        </button>
                    )}
                    {sources.hasNextPage && (
                        <button
                            className={c.clearButton}
                            type="button"
                            disabled={sources.isFetchingNextPage}
                            onClick={() => void sources.fetchNextPage()}
                        >
                            Pokaż więcej źródeł
                        </button>
                    )}
                    {stageTemplates.hasNextPage && (
                        <button
                            className={c.clearButton}
                            type="button"
                            disabled={stageTemplates.isFetchingNextPage}
                            onClick={() => void stageTemplates.fetchNextPage()}
                        >
                            Pokaż więcej szablonów etapów
                        </button>
                    )}
                    {stageTemplates.isError && (
                        <p className={c.filterError} role="alert">
                            Nie udało się wczytać etapów.
                            <button
                                className={c.clearButton}
                                type="button"
                                onClick={() => void stageTemplates.refetch()}
                            >
                                Spróbuj ponownie
                            </button>
                        </p>
                    )}
                </div>
            )}
            {clients.isPending && (
                <p className={c.state}>Wczytywanie klientów…</p>
            )}
            {clients.isError && (
                <div className={c.state} role="alert">
                    <p>Nie udało się wczytać klientów.</p>
                    <Button
                        className={c.secondary}
                        onClick={() => void clients.refetch()}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {clients.isSuccess && !rows.length && (
                <p className={c.state}>
                    {hasFilters
                        ? 'Brak klientów pasujących do filtrów.'
                        : 'Brak klientów w tym widoku.'}
                </p>
            )}
            {!!rows.length && (
                <div className={c.tableContainer}>
                    <table className={c.table}>
                        <caption className={c.visuallyHidden}>
                            Lista klientów
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Klient</th>
                                <th scope="col" className={c.address}>
                                    Adres
                                </th>
                                <th scope="col">Status</th>
                                <th scope="col">Priorytet</th>
                                <th scope="col">Opiekun</th>
                                <th scope="col">Dodano</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((client) => (
                                <tr key={client.id}>
                                    <td className={c.nameCell}>
                                        <Link
                                            className={c.clientName}
                                            href={`/main/clients/${client.id}`}
                                            aria-label={`Otwórz klienta ${client.name} ${client.surname ?? ''}`.trim()}
                                        >
                                            <strong>
                                                {client.name} {client.surname}
                                            </strong>
                                            <span>
                                                {client.source?.name ??
                                                    sourceRows.find(
                                                        (item) =>
                                                            item.id ===
                                                            client.sourceId,
                                                    )?.name ??
                                                    'Źródło niepodane'}
                                                {' · '}
                                                {client.isPrivate
                                                    ? 'Prywatny'
                                                    : 'Zespół'}
                                            </span>
                                            <span
                                                className={c.paymentBadge}
                                                style={{
                                                    color: clientPaymentStatuses[
                                                        client.paymentStatus ??
                                                            'unpaid'
                                                    ].color,
                                                }}
                                            >
                                                Płatność:{' '}
                                                {
                                                    clientPaymentStatuses[
                                                        client.paymentStatus ??
                                                            'unpaid'
                                                    ].title
                                                }
                                                {client.paymentAmount != null
                                                    ? ` · ${paymentAmountLabel(client.paymentAmount, client.paymentCurrency ?? 'PLN')}`
                                                    : ''}
                                            </span>
                                            {client.activeStage && (
                                                <span
                                                    className={c.stageBadge}
                                                    style={{
                                                        color: client
                                                            .activeStage.color,
                                                    }}
                                                >
                                                    Aktualny etap:{' '}
                                                    {client.activeStage.title}
                                                </span>
                                            )}
                                        </Link>
                                    </td>
                                    <td className={c.address}>
                                        {client.address || '—'}
                                    </td>
                                    <td className={c.statusCell}>
                                        <span
                                            className={c.statusBadge}
                                            style={{
                                                color: clientStatuses[
                                                    client.status
                                                ].color,
                                            }}
                                        >
                                            {
                                                clientStatuses[client.status]
                                                    .title
                                            }
                                        </span>
                                    </td>
                                    <td className={c.priorityCell}>
                                        <span
                                            className={`${c.priority} ${c[client.priority]}`}
                                        >
                                            {clientPriorities[client.priority]}
                                        </span>
                                    </td>
                                    <td className={c.ownerCell}>
                                        {ownerName(client)}
                                    </td>
                                    <td className={c.dateCell}>
                                        <time dateTime={client.createdAt}>
                                            {createdDate.format(
                                                new Date(client.createdAt),
                                            )}
                                        </time>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <footer className={c.tableFooter}>
                        <span>
                            1–{rows.length} z {total} klientów
                        </span>
                        {clients.hasNextPage && (
                            <Button
                                className={c.secondary}
                                pending={clients.isFetchingNextPage}
                                onClick={() => void clients.fetchNextPage()}
                            >
                                Pokaż więcej klientów
                            </Button>
                        )}
                    </footer>
                </div>
            )}
            <p className={c.hint}>
                Kliknij klienta, aby otworzyć jego profil i sprawy.
            </p>
            {(create || createOnLoad) && (
                <Popup
                    title="Nowy klient"
                    closeDisabled={pending}
                    onClose={closeCreate}
                >
                    <ClientForm
                        onCancel={closeCreate}
                        onPendingChange={setPending}
                        onSaved={(client) => {
                            setCreate(false)

                            router.push(`/main/clients/${client.id}`)
                        }}
                    />
                </Popup>
            )}
        </section>
    )
}
