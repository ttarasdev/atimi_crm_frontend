'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
    CampaignFilters,
    CampaignStatus,
    MailCampaign,
    RecipientStatus,
} from '@/api/mail-campaigns/mail-campaigns.types'
import type {
    ClientPaymentStatus,
    ClientPriority,
    ClientStatus,
} from '@/api/clients/clients.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormDateTimeInput } from '@/components/form-components/form-date-time-input/FormDateTimeInput'
import { useRoles } from '@/shared/hooks/useRoles'
import {
    useCampaignAudience,
    useCampaigns,
    useCampaignRecipients,
    useCampaign,
    useCancelCampaign,
    useCampaignFilterOptions,
} from '@/shared/hooks/useMailCampaigns'
import {
    localDateTimeToIso,
    calendarDateTimeLabel,
} from '@/features/calendar/calendar-date'
import {
    clientStatuses,
    clientPriorities,
    clientPaymentStatuses,
} from '@/features/clients/client-labels'
import { MailMessageComposer } from '../mail-composer/MailComposer'
import c from './MailCampaigns.module.scss'

const campaignStatuses: Record<CampaignStatus, string> = {
    queued: 'W kolejce',
    running: 'W trakcie',
    completed: 'Zakończona',
    cancelled: 'Anulowana',
}

const recipientStatuses: Record<RecipientStatus, string> = {
    pending: 'Oczekuje',
    sending: 'Wysyłanie',
    sent: 'Wysłano',
    failed: 'Błąd',
    skipped: 'Pominięto',
    cancelled: 'Anulowano',
    uncertain: 'Wynik niepotwierdzony',
}

const recipientReasons: Record<string, string> = {
    'Campaign cancelled': 'Rozsyłka anulowana.',
    'Sender no longer has access': 'Nadawca nie ma już uprawnień do wysyłania.',
    'Client archived or unavailable':
        'Klient został zarchiwizowany lub jest niedostępny.',
    'Client responsibility changed': 'Zmienił się opiekun klienta.',
    'Marketing email consent withdrawn':
        'Klient wycofał zgodę na marketing e-mail.',
    'Client email changed or unavailable':
        'Adres e-mail klienta zmienił się lub jest niedostępny.',
    'Message could not be prepared or sent':
        'Nie udało się przygotować lub wysłać wiadomości.',
    'SMTP outcome uncertain; verify before sending another message':
        'Sprawdź historię wysyłania przed ponownym wysłaniem.',
    'Delivery interrupted; verify before sending another message':
        'Wysyłanie przerwane. Sprawdź historię przed ponownym wysłaniem.',
}

export function MailCampaignsPage() {
    const { hasRole } = useRoles()

    const [creating, setCreating] = useState(false)

    const [selected, setSelected] = useState<MailCampaign | null>(null)

    const [status, setStatus] = useState<CampaignStatus | null>(null)

    const [search, setSearch] = useState('')

    const [page, setPage] = useState(1)

    const [saved, setSaved] = useState(false)

    const query = useCampaigns({
        page,
        limit: 20,
        ...(status ? { status } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
    })

    if (!hasRole('admin') && !hasRole('sender')) return null

    return (
        <section className={c.page} aria-label="Rozsyłki e-mail">
            <header className={c.header}>
                <div>
                    <h1>Rozsyłki e-mail</h1>
                    <p>
                        Wybierz klientów, sprawdź odbiorców i zaplanuj wysyłkę.
                    </p>
                </div>
                <div className={c.actions}>
                    <Link href="/main/mail">Pojedyncza wiadomość</Link>
                    <Button
                        onClick={() => {
                            setCreating(true)

                            setSaved(false)
                        }}
                    >
                        Nowa rozsyłka
                    </Button>
                </div>
            </header>
            {saved && (
                <p role="status" className={c.success}>
                    Rozsyłka została zapisana. Postęp wysyłania znajdziesz na
                    liście.
                </p>
            )}
            {creating && (
                <div className={c.panel}>
                    <CampaignForm
                        onCreated={() => {
                            setCreating(false)

                            setSaved(true)
                        }}
                        onCancel={() => setCreating(false)}
                    />
                </div>
            )}
            <div className={c.filters}>
                <TextInput
                    inputTitle="Szukaj rozsyłki"
                    type="search"
                    value={search}
                    maxLength={100}
                    onChange={(value) => {
                        setSearch(value)

                        setPage(1)
                    }}
                />
                <FormSelect
                    selectTitle="Status rozsyłki"
                    value={status}
                    onChange={(value) => {
                        setStatus(value)

                        setPage(1)
                    }}
                    options={[
                        { value: null, title: 'Wszystkie' },
                        ...Object.entries(campaignStatuses).map(
                            ([value, title]) => ({
                                value: value as CampaignStatus,
                                title,
                            }),
                        ),
                    ]}
                />
            </div>
            {query.isPending && <p role="status">Wczytywanie rozsyłek…</p>}
            {query.isError && (
                <div role="alert">
                    <p>Nie udało się wczytać rozsyłek.</p>
                    <Button onClick={() => void query.refetch()}>
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {query.data?.rows.map((campaign) => (
                <article className={c.panel} key={campaign.id}>
                    <div className={c.header}>
                        <div>
                            <h2>{campaign.name}</h2>
                            <p>{campaign.subject}</p>
                        </div>
                        <span className={c.badge}>
                            {campaignStatuses[campaign.status]}
                        </span>
                    </div>
                    <p className={c.hint}>
                        {campaign.isScheduled && campaign.scheduledAt
                            ? calendarDateTimeLabel(
                                  campaign.scheduledAt,
                                  'Europe/Warsaw',
                              )
                            : 'Wysyłka od razu'}{' '}
                        · Europe/Warsaw
                    </p>
                    <p>
                        Odbiorcy: {campaign.counts.total} · Wysłano:{' '}
                        {campaign.counts.sent} · Błędy: {campaign.counts.failed}{' '}
                        · Pominięto: {campaign.counts.skipped}
                    </p>
                    <Button
                        className={c.secondary}
                        onClick={() => setSelected(campaign)}
                    >
                        Szczegóły rozsyłki
                    </Button>
                </article>
            ))}
            {query.isSuccess && !query.data.rows.length && (
                <p className={c.hint}>Brak rozsyłek dla wybranych filtrów.</p>
            )}
            <div className={c.actions}>
                <Button
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                >
                    Poprzednia strona
                </Button>
                <span>Strona {page}</span>
                <Button
                    disabled={
                        !query.data ||
                        query.data.offset + query.data.rows.length >=
                            query.data.total
                    }
                    onClick={() => setPage((value) => value + 1)}
                >
                    Następna strona
                </Button>
            </div>
            {selected && (
                <CampaignDetails
                    campaign={
                        query.data?.rows.find(
                            (item) => item.id === selected.id,
                        ) ?? selected
                    }
                    onClose={() => setSelected(null)}
                />
            )}
        </section>
    )
}

function CampaignForm({
    onCreated,
    onCancel,
}: {
    onCreated: () => void
    onCancel: () => void
}) {
    const { hasRole } = useRoles()

    const [name, setName] = useState('')

    const [filters, setFilters] = useState<CampaignFilters>({})

    const [scheduled, setScheduled] = useState(false)

    const [date, setDate] = useState('')

    const [time, setTime] = useState('09:00')

    const [pending, setPending] = useState(false)

    const [openedAt] = useState(() => Date.now())

    const audience = useCampaignAudience()

    const sources = useCampaignFilterOptions('source')

    const managers = useCampaignFilterOptions('manager', hasRole('admin'))

    const stages = useCampaignFilterOptions('stage')

    const scheduledAt = scheduled
        ? localDateTimeToIso(date, time, 'Europe/Warsaw')
        : undefined

    const validTime =
        !scheduled || Boolean(scheduledAt && Date.parse(scheduledAt) > openedAt)

    const previewCurrent = Boolean(
        audience.data &&
            !audience.isPending &&
            JSON.stringify(audience.variables?.filters) ===
                JSON.stringify(filters),
    )

    function changeFilters<K extends keyof CampaignFilters>(
        key: K,
        value: CampaignFilters[K] | null,
    ) {
        setFilters((current) => {
            const next = { ...current }

            if (value === null || value === '') delete next[key]
            else next[key] = value

            return next
        })
    }

    return (
        <div className={c.page}>
            <div className={c.header}>
                <h2>Nowa rozsyłka</h2>
                <Button type="button" disabled={pending} onClick={onCancel}>
                    Zamknij formularz
                </Button>
            </div>
            <MailMessageComposer
                onPendingChange={setPending}
                campaign={{
                    name,
                    filters,
                    scheduledAt: scheduledAt ?? undefined,
                    ready:
                        previewCurrent &&
                        Boolean(audience.data?.eligibleRecipients) &&
                        validTime &&
                        Boolean(name.trim()),
                    onCreated,
                    controls: (
                        <>
                            <TextInput
                                inputTitle="Nazwa rozsyłki"
                                value={name}
                                onChange={setName}
                                maxLength={150}
                                required
                            />
                            <fieldset className={c.audience}>
                                <legend>Filtry klientów</legend>
                                <div className={c.filters}>
                                    <TextInput
                                        inputTitle="Szukaj klienta"
                                        type="search"
                                        value={filters.search ?? ''}
                                        onChange={(value) =>
                                            changeFilters('search', value)
                                        }
                                        maxLength={100}
                                    />
                                    <FormSelect<ClientStatus | null>
                                        selectTitle="Status klienta"
                                        value={filters.status ?? null}
                                        onChange={(value) =>
                                            changeFilters('status', value)
                                        }
                                        options={[
                                            {
                                                value: null,
                                                title: 'Wszystkie statusy',
                                            },
                                            ...Object.entries(
                                                clientStatuses,
                                            ).map(([value, item]) => ({
                                                value: value as ClientStatus,
                                                title: item.title,
                                            })),
                                        ]}
                                    />
                                    <FormSelect<ClientPriority | null>
                                        selectTitle="Priorytet"
                                        value={filters.priority ?? null}
                                        onChange={(value) =>
                                            changeFilters('priority', value)
                                        }
                                        options={[
                                            {
                                                value: null,
                                                title: 'Wszystkie priorytety',
                                            },
                                            ...Object.entries(
                                                clientPriorities,
                                            ).map(([value, title]) => ({
                                                value: value as ClientPriority,
                                                title,
                                            })),
                                        ]}
                                    />
                                    <FormSelect
                                        selectTitle="Źródło klienta"
                                        value={filters.sourceId ?? null}
                                        onChange={(value) =>
                                            changeFilters('sourceId', value)
                                        }
                                        options={[
                                            {
                                                value: null,
                                                title: 'Wszystkie źródła',
                                            },
                                            ...(
                                                sources.data?.pages.flatMap(
                                                    (item) => item.rows,
                                                ) ?? []
                                            ).map((item) => ({
                                                value: item.id,
                                                title: item.label,
                                            })),
                                        ]}
                                    />
                                    <FormSelect<ClientPaymentStatus | null>
                                        selectTitle="Status płatności"
                                        value={filters.paymentStatus ?? null}
                                        onChange={(value) =>
                                            changeFilters(
                                                'paymentStatus',
                                                value,
                                            )
                                        }
                                        options={[
                                            {
                                                value: null,
                                                title: 'Wszystkie płatności',
                                            },
                                            ...Object.entries(
                                                clientPaymentStatuses,
                                            ).map(([value, item]) => ({
                                                value: value as ClientPaymentStatus,
                                                title: item.title,
                                            })),
                                        ]}
                                    />
                                    <FormSelect
                                        selectTitle="Aktywny etap"
                                        value={filters.stageTemplateId ?? null}
                                        onChange={(value) =>
                                            changeFilters(
                                                'stageTemplateId',
                                                value,
                                            )
                                        }
                                        options={[
                                            {
                                                value: null,
                                                title: 'Wszystkie etapy',
                                            },
                                            ...(
                                                stages.data?.pages.flatMap(
                                                    (item) => item.rows,
                                                ) ?? []
                                            ).map((item) => ({
                                                value: item.id,
                                                title: item.label,
                                            })),
                                        ]}
                                    />
                                    {hasRole('admin') && (
                                        <FormSelect
                                            selectTitle="Opiekun"
                                            value={filters.managerId ?? null}
                                            onChange={(value) =>
                                                changeFilters(
                                                    'managerId',
                                                    value,
                                                )
                                            }
                                            options={[
                                                {
                                                    value: null,
                                                    title: 'Wszyscy opiekunowie',
                                                },
                                                ...(
                                                    managers.data?.pages.flatMap(
                                                        (item) => item.rows,
                                                    ) ?? []
                                                ).map((item) => ({
                                                    value: item.id,
                                                    title: item.label,
                                                })),
                                            ]}
                                        />
                                    )}
                                </div>
                                <div className={c.actions}>
                                    {sources.hasNextPage && (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                void sources.fetchNextPage()
                                            }
                                        >
                                            Więcej źródeł
                                        </Button>
                                    )}
                                    {stages.hasNextPage && (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                void stages.fetchNextPage()
                                            }
                                        >
                                            Więcej etapów
                                        </Button>
                                    )}
                                    {managers.hasNextPage &&
                                        hasRole('admin') && (
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    void managers.fetchNextPage()
                                                }
                                            >
                                                Więcej opiekunów
                                            </Button>
                                        )}
                                </div>
                                {(sources.isError ||
                                    stages.isError ||
                                    (hasRole('admin') && managers.isError)) && (
                                    <p role="alert">
                                        Nie udało się wczytać części filtrów.{' '}
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                void sources.refetch()

                                                void stages.refetch()

                                                if (hasRole('admin'))
                                                    void managers.refetch()
                                            }}
                                        >
                                            Wczytaj filtry ponownie
                                        </Button>
                                    </p>
                                )}
                                <p className={c.hint}>
                                    Rozsyłka obejmuje aktywnych klientów ze
                                    zgodą na marketing e-mail. Każdy adres
                                    otrzyma osobną wiadomość. Lista odbiorców
                                    zostanie zapisana przy utworzeniu rozsyłki.
                                </p>
                                <Button
                                    type="button"
                                    pending={audience.isPending}
                                    onClick={() => audience.mutate({ filters })}
                                >
                                    Sprawdź odbiorców
                                </Button>
                                {audience.isError && (
                                    <p role="alert">
                                        Nie udało się sprawdzić odbiorców.
                                        Spróbuj ponownie.
                                    </p>
                                )}
                                {audience.data &&
                                    !previewCurrent &&
                                    !audience.isPending && (
                                        <p className={c.hint}>
                                            Filtry zostały zmienione. Sprawdź
                                            odbiorców ponownie.
                                        </p>
                                    )}
                                {previewCurrent && audience.data && (
                                    <div
                                        className={c.preview}
                                        aria-label="Odbiorcy rozsyłki"
                                    >
                                        <strong>
                                            Odbiorcy:{' '}
                                            {audience.data.eligibleRecipients}
                                        </strong>
                                        <p>
                                            Dopasowani klienci:{' '}
                                            {audience.data.matchedClients}
                                        </p>
                                        <p className={c.hint}>
                                            Brak zgody:{' '}
                                            {
                                                audience.data.excluded
                                                    .missingConsent
                                            }{' '}
                                            · Brak adresu:{' '}
                                            {
                                                audience.data.excluded
                                                    .missingEmail
                                            }{' '}
                                            · Nieprawidłowy adres:{' '}
                                            {
                                                audience.data.excluded
                                                    .invalidEmail
                                            }{' '}
                                            · Powtórzony adres:{' '}
                                            {
                                                audience.data.excluded
                                                    .duplicateEmail
                                            }
                                        </p>
                                        <ul>
                                            {audience.data.sample.map(
                                                (item) => (
                                                    <li key={item.clientId}>
                                                        {item.name}{' '}
                                                        {item.surname} ·{' '}
                                                        {item.email}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                        {audience.data.eligibleRecipients >
                                            audience.data.sample.length && (
                                            <p className={c.hint}>
                                                Pokazano pierwszych{' '}
                                                {audience.data.sample.length}{' '}
                                                odbiorców.
                                            </p>
                                        )}
                                        {!audience.data.eligibleRecipients && (
                                            <p role="status">
                                                Brak odbiorców spełniających
                                                warunki rozsyłki.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </fieldset>
                            <FormSelect
                                selectTitle="Termin wysyłki"
                                value={scheduled ? 'scheduled' : 'now'}
                                onChange={(value) =>
                                    setScheduled(value === 'scheduled')
                                }
                                options={[
                                    { value: 'now', title: 'Od razu' },
                                    {
                                        value: 'scheduled',
                                        title: 'Zaplanuj datę i godzinę',
                                    },
                                ]}
                            />
                            {scheduled && (
                                <>
                                    <FormDateTimeInput
                                        date={date}
                                        time={time}
                                        onDateChange={setDate}
                                        onTimeChange={setTime}
                                        dateTitle="Data wysyłki"
                                        timeTitle="Godzina wysyłki"
                                    />
                                    <p className={c.hint}>
                                        Strefa czasowa: Europe/Warsaw.
                                        {!validTime &&
                                            ' Wybierz prawidłowy termin w przyszłości.'}
                                    </p>
                                </>
                            )}
                        </>
                    ),
                }}
            />
        </div>
    )
}

function CampaignDetails({
    campaign: selected,
    onClose,
}: {
    campaign: MailCampaign
    onClose: () => void
}) {
    const [page, setPage] = useState(1)

    const detail = useCampaign(selected.id)

    const campaign = detail.data ?? selected

    const recipients = useCampaignRecipients(campaign.id, page)

    const cancel = useCancelCampaign()

    return (
        <Popup
            title={campaign.name}
            onClose={onClose}
            closeDisabled={cancel.isPending}
        >
            <div className={c.page}>
                <p>
                    {campaignStatuses[campaign.status]} · {campaign.subject}
                </p>
                <div className={c.counts}>
                    {Object.entries(recipientStatuses).map(([key, title]) => (
                        <span key={key}>
                            {title}: {campaign.counts[key as RecipientStatus]}
                        </span>
                    ))}
                </div>
                {campaign.counts.uncertain > 0 && (
                    <p className={c.hint}>
                        Dla niepotwierdzonych wyników sprawdź historię przed
                        ponownym wysłaniem.
                    </p>
                )}
                {(campaign.status === 'queued' ||
                    campaign.status === 'running') && (
                    <Button
                        pending={cancel.isPending}
                        onClick={() => cancel.mutate(campaign.id)}
                    >
                        Anuluj pozostałą wysyłkę
                    </Button>
                )}
                <p className={c.hint}>
                    Anulowanie zatrzymuje oczekujące wiadomości. Wysłanych
                    wiadomości nie można wycofać.
                </p>
                {cancel.isError && (
                    <p role="alert">
                        Nie udało się anulować rozsyłki. Spróbuj ponownie.
                    </p>
                )}
                {recipients.isPending && (
                    <p role="status">Wczytywanie odbiorców…</p>
                )}
                {recipients.isError && (
                    <div role="alert">
                        <p>Nie udało się wczytać odbiorców.</p>
                        <Button onClick={() => void recipients.refetch()}>
                            Spróbuj ponownie
                        </Button>
                    </div>
                )}
                <ul className={c.recipients}>
                    {recipients.data?.rows.map((item) => (
                        <li key={item.id}>
                            <strong>
                                {item.email ?? 'Odbiorca niedostępny'}
                            </strong>
                            <span>{recipientStatuses[item.status]}</span>
                            {item.reason && (
                                <small>
                                    {recipientReasons[item.reason] ??
                                        'Sprawdź aktualny adres, zgodę i dostępność klienta oraz załączników.'}
                                </small>
                            )}
                        </li>
                    ))}
                </ul>
                <div className={c.actions}>
                    <Button
                        disabled={page === 1}
                        onClick={() => setPage((value) => value - 1)}
                    >
                        Poprzedni odbiorcy
                    </Button>
                    <span>Strona {page}</span>
                    <Button
                        disabled={
                            !recipients.data ||
                            recipients.data.offset +
                                recipients.data.rows.length >=
                                recipients.data.total
                        }
                        onClick={() => setPage((value) => value + 1)}
                    >
                        Następni odbiorcy
                    </Button>
                </div>
            </div>
        </Popup>
    )
}
