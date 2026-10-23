'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    ChevronRight,
    Pencil,
    Archive,
    RotateCcw,
    Phone,
    Mail,
    FileText,
    StickyNote,
    UserRound,
    ShieldCheck,
    UsersRound,
    CreditCard,
    History,
} from 'lucide-react'
import {
    useClient,
    useClientContacts,
    useClientSources,
    useClientManagerCalendar,
    useArchiveClient,
} from '@/shared/hooks/useClients'
import { useAuth } from '@/shared/hooks/useAuth'
import { useRoles } from '@/shared/hooks/useRoles'
import { useManager } from '@/shared/hooks/useManagers'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { ClientPaymentCard } from '../client-payment-card/ClientPaymentCard'
import { ClientMailConsentCard } from '../client-mail-consent-card/ClientMailConsentCard'
import { ClientForm } from '../client-form/ClientForm'
import { ClientProcesses } from '../client-processes/ClientProcesses'
import {
    ClientContacts,
    ClientNotes,
    ClientDocuments,
} from '../client-records/ClientRecords'
import { ClientConfirmForm } from '../ClientConfirmForm'
import { ClientMailPopup } from '@/features/mail/client-mail-popup/ClientMailPopup'
import { ClientActivity } from '../ClientActivity'
import { ClientLegalization } from '@/features/legalization/ClientLegalization'
import { ClientDocumentCards } from '@/features/legalization/ClientDocumentCards'
import { MailHistory } from '@/features/mail/MailHistory'
import { ClientFamily } from '@/features/legalization/ClientFamily'
import { clientStatuses, clientPriorities } from '../client-labels'
import c from './ClientPage.module.scss'

const tabs = [
    { key: 'details', title: 'Dane i kontakt', icon: UserRound },
    { key: 'legalization', title: 'Legalizacja', icon: ShieldCheck },
    { key: 'cards', title: 'Karty dokumentów', icon: CreditCard },
    { key: 'family', title: 'Rodzina', icon: UsersRound },
    { key: 'mail', title: 'Historia poczty', icon: Mail },
    { key: 'notes', title: 'Notatki', icon: StickyNote },
    { key: 'documents', title: 'Dokumenty', icon: FileText },
    { key: 'history', title: 'Historia zmian', icon: History },
] as const

interface ClientPageProps {
    clientId: number
    initialTab?: 'details' | 'documents' | 'notes'
    processId?: number
    stageId?: number
    noteId?: number
    stageNoteId?: number
}

function ClientWorkspace({
    clientId,
    initialTab = 'details',
    processId,
    stageId,
    noteId,
    stageNoteId,
}: ClientPageProps) {
    const query = useClient(clientId)

    const contacts = useClientContacts(clientId)

    const { manager } = useAuth()

    const { hasRole } = useRoles()

    const client = query.data

    const ownerQuery = useManager(
        client &&
            hasRole('admin') &&
            !client.manager &&
            client.managerId !== manager?.id
            ? client.managerId
            : null,
    )

    const sources = useClientSources()

    const canEdit =
        !!client && (hasRole('admin') || client.managerId === manager?.id)

    const calendar = useClientManagerCalendar(
        canEdit ? (client?.managerId ?? null) : null,
    )

    const archive = useArchiveClient()

    const [tab, setTab] = useState<(typeof tabs)[number]['key']>(initialTab)

    const [editing, setEditing] = useState(false)

    const [archiving, setArchiving] = useState(false)

    const [pending, setPending] = useState(false)

    const [writing, setWriting] = useState(false)

    const contactRows = contacts.data?.pages.flatMap((page) => page.rows) ?? []

    const phone =
        contactRows.find(
            (contact) => contact.type === 'phone' && contact.isPrimary,
        ) ?? contactRows.find((contact) => contact.type === 'phone')

    const mail =
        contactRows.find(
            (contact) => contact.type === 'email' && contact.isPrimary,
        ) ?? contactRows.find((contact) => contact.type === 'email')

    if (query.isPending)
        return <p className={c.state}>Wczytywanie karty klienta…</p>

    if (query.isError || !client)
        return (
            <div className={c.state} role="alert">
                <p>
                    Nie można otworzyć tego klienta. Sprawdź dostęp lub spróbuj
                    ponownie.
                </p>
                <Button
                    className={c.action}
                    onClick={() => void query.refetch()}
                >
                    Spróbuj ponownie
                </Button>
                <Link href="/main/clients" className={c.link}>
                    Wróć do klientów
                </Link>
            </div>
        )

    const archived = !!client.archivedAt

    const readonly = archived || !canEdit

    const owner =
        client.manager ??
        (manager?.id === client.managerId ? manager : ownerQuery.data)

    const ownerName = owner
        ? `${owner.name} ${owner.surname ?? ''}`.trim()
        : ownerQuery.isFetching
          ? 'Wczytywanie…'
          : `#${client.managerId}`

    const source = sources.data?.pages
        .flatMap((page) => page.rows)
        .find((row) => row.id === client.sourceId)

    const sourceName =
        client.source?.name ??
        source?.name ??
        (client.sourceId
            ? sources.isFetching
                ? 'Wczytywanie…'
                : `#${client.sourceId}`
            : '—')

    return (
        <section
            className={c.page}
            aria-label={`Karta klienta ${client.name} ${client.surname ?? ''}`.trim()}
        >
            <header className={c.profileHeader}>
                <nav className={c.breadcrumb} aria-label="Ścieżka klienta">
                    <Link href="/main/clients" aria-label="Wszyscy klienci">
                        Klienci
                    </Link>
                    <ChevronRight size={12} aria-hidden />
                    <span>Profil klienta</span>
                </nav>
                <div className={c.profileRow}>
                    <div className={c.identity}>
                        <div className={c.nameRow}>
                            <h1>
                                {client.name} {client.surname}
                            </h1>
                            <span
                                className={c.badge}
                                style={{
                                    color: clientStatuses[client.status].color,
                                }}
                            >
                                {clientStatuses[client.status].title}
                            </span>
                            <span
                                className={c.badge}
                                style={{
                                    color:
                                        client.priority === 'vip'
                                            ? '#B18B4E'
                                            : '#64748B',
                                }}
                            >
                                {clientPriorities[client.priority]}
                            </span>
                        </div>
                        <div className={c.contactRow}>
                            {phone && (
                                <a href={`tel:${phone.value}`}>
                                    <Phone size={13} aria-hidden />
                                    <span>{phone.value}</span>
                                </a>
                            )}
                            {mail && (
                                <a href={`mailto:${mail.value}`}>
                                    <Mail size={13} aria-hidden />
                                    <span>{mail.value}</span>
                                </a>
                            )}
                            {!phone && !mail && (
                                <span className={c.muted}>
                                    Dane kontaktowe możesz dodać poniżej.
                                </span>
                            )}
                        </div>
                        <p className={c.ownerRow}>
                            <span>Opiekun: {ownerName}</span>
                            <span aria-hidden>·</span>
                            <span>
                                {client.isPrivate
                                    ? 'Prywatny'
                                    : 'Widoczny dla zespołu'}
                            </span>
                            <span aria-hidden>·</span>
                            <span>Źródło: {sourceName}</span>
                        </p>
                    </div>
                    <div className={c.actions}>
                        {phone ? (
                            <a
                                className={`${c.action} ${c.primary}`}
                                href={`tel:${phone.value}`}
                            >
                                <Phone size={13} aria-hidden />
                                Zadzwoń
                            </a>
                        ) : (
                            <Button
                                className={`${c.action} ${c.primary}`}
                                disabled
                            >
                                <Phone size={13} aria-hidden />
                                Zadzwoń
                            </Button>
                        )}
                        <Button
                            className={c.action}
                            disabled={readonly}
                            onClick={() => setWriting(true)}
                        >
                            <Mail size={13} aria-hidden />
                            Napisz
                        </Button>
                        {!readonly && (
                            <Button
                                className={c.action}
                                aria-label="Edytuj klienta"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil size={13} />
                                Edytuj
                            </Button>
                        )}
                        {canEdit && (
                            <Button
                                className={c.archiveAction}
                                onClick={() => setArchiving(true)}
                            >
                                {archived ? (
                                    <RotateCcw size={13} />
                                ) : (
                                    <Archive size={13} />
                                )}
                                {archived ? 'Przywróć klienta' : 'Archiwizuj'}
                            </Button>
                        )}
                    </div>
                </div>
                {archived && (
                    <p className={c.warning}>
                        Klient jest w archiwum. Przywróć go, aby zmieniać dane i
                        pracować nad sprawami.
                    </p>
                )}
                {!canEdit && (
                    <p className={c.warning}>
                        Podgląd klienta zespołu. Dane może zmieniać jego opiekun
                        lub administrator.
                    </p>
                )}
            </header>
            <div className={c.workspace}>
                <aside className={c.sidebar} aria-label="Podsumowanie klienta">
                    <ClientPaymentCard client={client} readonly={readonly} />
                    <ClientMailConsentCard
                        key={clientId}
                        clientId={clientId}
                        readonly={readonly}
                    />
                </aside>
                <div className={c.mainContent}>
                    <ClientProcesses
                        selectedProcessId={processId}
                        selectedStageId={stageId}
                        selectedNoteId={stageNoteId}
                        clientId={clientId}
                        readonly={readonly}
                        calendar={calendar.data}
                    />
                    {calendar.isError && (
                        <div className={c.calendarError} role="alert">
                            <span>
                                Nie udało się wczytać kalendarza opiekuna.
                            </span>
                            <button
                                type="button"
                                onClick={() => void calendar.refetch()}
                            >
                                Spróbuj ponownie
                            </button>
                        </div>
                    )}
                    <section
                        className={c.information}
                        aria-label="Informacje klienta"
                    >
                        <nav
                            className={c.tabs}
                            aria-label="Sekcje karty klienta"
                        >
                            {tabs.map((item) => (
                                <button
                                    type="button"
                                    key={item.key}
                                    className={
                                        tab === item.key ? c.selected : ''
                                    }
                                    aria-pressed={tab === item.key}
                                    onClick={() => setTab(item.key)}
                                >
                                    <item.icon size={14} aria-hidden />
                                    {item.title}
                                </button>
                            ))}
                        </nav>
                        <div className={c.tabContent}>
                            {tab === 'details' && (
                                <>
                                    <header className={c.informationHeader}>
                                        <h2>Informacje o kliencie</h2>
                                        {!readonly && (
                                            <Button
                                                className={c.action}
                                                onClick={() => setEditing(true)}
                                            >
                                                <Pencil size={13} />
                                                Edytuj dane
                                            </Button>
                                        )}
                                    </header>
                                    <div className={c.detailsGrid}>
                                        <section
                                            className={c.dataCard}
                                            aria-label="Dane podstawowe klienta"
                                        >
                                            <h3>Dane podstawowe</h3>
                                            <dl className={c.data}>
                                                <div>
                                                    <dt>Imię / nazwa</dt>
                                                    <dd>{client.name}</dd>
                                                </div>
                                                <div>
                                                    <dt>Nazwisko</dt>
                                                    <dd>
                                                        {client.surname || '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Adres</dt>
                                                    <dd>
                                                        {client.address || '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Język kontaktu</dt>
                                                    <dd>
                                                        {client.language?.toUpperCase() ||
                                                            '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Źródło kontaktu</dt>
                                                    <dd>{sourceName}</dd>
                                                </div>
                                                <div>
                                                    <dt>Klient od</dt>
                                                    <dd>
                                                        {new Date(
                                                            client.createdAt,
                                                        ).toLocaleDateString(
                                                            'pl-PL',
                                                            {
                                                                timeZone:
                                                                    calendar
                                                                        .data
                                                                        ?.timeZone ??
                                                                    'Europe/Warsaw',
                                                            },
                                                        )}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Godziny kontaktu</dt>
                                                    <dd>
                                                        {client.preferredContactTime ||
                                                            '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Opiekun</dt>
                                                    <dd>{ownerName}</dd>
                                                </div>
                                            </dl>
                                        </section>
                                        <div className={c.contactsCard}>
                                            <ClientContacts
                                                clientId={clientId}
                                                readonly={readonly}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                            {tab === 'legalization' && (
                                <ClientLegalization
                                    clientId={clientId}
                                    readonly={readonly}
                                />
                            )}
                            {tab === 'cards' && (
                                <ClientDocumentCards
                                    clientId={clientId}
                                    client={client}
                                    readonly={readonly}
                                />
                            )}
                            {tab === 'family' && (
                                <ClientFamily
                                    clientId={clientId}
                                    readonly={readonly}
                                />
                            )}
                            {tab === 'mail' && (
                                <MailHistory
                                    clientId={clientId}
                                    initiallyExpanded
                                />
                            )}
                            {tab === 'history' && (
                                <ClientActivity clientId={clientId} />
                            )}
                            {tab === 'notes' && (
                                <ClientNotes
                                    selectedNoteId={noteId}
                                    clientId={clientId}
                                    readonly={readonly}
                                />
                            )}
                            {tab === 'documents' && (
                                <ClientDocuments
                                    clientId={clientId}
                                    readonly={readonly}
                                />
                            )}
                        </div>
                    </section>
                </div>
            </div>
            {writing && (
                <ClientMailPopup
                    clientId={clientId}
                    clientName={`${client.name} ${client.surname ?? ''}`.trim()}
                    onClose={() => setWriting(false)}
                />
            )}
            {editing && (
                <Popup
                    title="Edytuj klienta"
                    closeDisabled={pending}
                    onClose={() => setEditing(false)}
                >
                    <ClientForm
                        client={client}
                        onSaved={() => setEditing(false)}
                        onCancel={() => setEditing(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
            {archiving && (
                <Popup
                    title={archived ? 'Przywróć klienta' : 'Archiwizuj klienta'}
                    closeDisabled={pending}
                    onClose={() => setArchiving(false)}
                >
                    <ClientConfirmForm
                        message={
                            archived
                                ? 'Klient i jego otwarte sprawy ponownie będą dostępne do edycji.'
                                : 'Klient zostanie zachowany w archiwum. Jego dane i sprawy pozostaną dostępne do przeglądania.'
                        }
                        submitTitle={archived ? 'Przywróć' : 'Archiwizuj'}
                        onConfirm={(signal) =>
                            archive.mutateAsync({
                                id: client.id,
                                archived: !archived,
                                signal,
                            })
                        }
                        onSaved={() => setArchiving(false)}
                        onCancel={() => setArchiving(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}

export function ClientPage({
    clientId,
    initialTab = 'details',
    processId,
    stageId,
    noteId,
    stageNoteId,
}: ClientPageProps) {
    if (
        !Number.isSafeInteger(clientId) ||
        clientId < 1 ||
        clientId > 2147483647
    )
        return (
            <div className={c.state}>
                <p>Niepoprawny adres klienta.</p>
                <Link className={c.link} href="/main/clients">
                    Wróć do klientów
                </Link>
            </div>
        )

    return (
        <ClientWorkspace
            key={`${clientId}:${initialTab}:${processId}:${stageId}:${noteId}:${stageNoteId}`}
            clientId={clientId}
            initialTab={initialTab}
            processId={processId}
            stageId={stageId}
            noteId={noteId}
            stageNoteId={stageNoteId}
        />
    )
}
