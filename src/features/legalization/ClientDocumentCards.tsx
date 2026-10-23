'use client'

import { useState } from 'react'
import { CalendarDays, Plus, ShieldCheck, Pencil } from 'lucide-react'
import type {
    DocumentCard,
    DocumentCardType,
    LegalizationProfile,
} from '@/api/legalization/legalization.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import {
    useDocumentCards,
    useDocumentCardTypes,
    useSaveDocumentCard,
    useLegalization,
} from '@/shared/hooks/useLegalization'
import { DuplicateClientWarning } from '@/features/clients/DuplicateClientWarning'
import { ClientQueryState } from '@/features/clients/ClientQueryState'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { ReminderMonthsInput } from './ReminderMonthsInput'
import { DigitalDocumentCard } from './DigitalDocumentCard'
import c from './Legalization.module.scss'

const stayDocumentCodes = new Set([
    'temporary_residence',
    'permanent_residence',
    'eu_resident',
    'visa',
    'blue_card',
    'permanent_status',
    'eu_resident_status',
])

interface CardClient {
    name: string
    surname?: string | null
}

const statusLabels = {
    active: 'Aktualny',
    replaced: 'Zastąpiony',
    archived: 'Archiwalny',
}

function CardForm({
    clientId,
    card,
    types,
    onSaved,
    onCancel,
    onPendingChange,
    client,
    profile,
}: {
    clientId: number
    card?: DocumentCard
    types: DocumentCardType[]
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
    client: CardClient
    profile?: LegalizationProfile
}) {
    const [typeId, setTypeId] = useState<number | null>(
        card?.typeId ?? types[0]?.id ?? null,
    )

    const selectedType = types.find((type) => type.id === typeId) ?? card?.type

    const [number, setNumber] = useState(card?.number ?? '')

    const [issuingCountry, setIssuingCountry] = useState(
        card?.issuingCountry ?? '',
    )

    const [issuingAuthority, setIssuingAuthority] = useState(
        card?.issuingAuthority ?? '',
    )

    const [issuedAt, setIssuedAt] = useState(card?.issuedAt ?? '')

    const [expiresAt, setExpiresAt] = useState(card?.expiresAt ?? '')

    const [status, setStatus] = useState<DocumentCard['status']>(
        card?.status ?? 'active',
    )

    const [isStayBasis, setIsStayBasis] = useState(card?.isStayBasis ?? false)

    const [months, setMonths] = useState(
        card?.reminderMonths ?? selectedType?.reminderMonths ?? [3, 2, 1],
    )

    const [notes, setNotes] = useState(card?.notes ?? '')

    const mutation = useSaveDocumentCard(clientId)

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Karta dokumentu"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle={card ? 'Zapisz kartę' : 'Dodaj kartę'}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (
                        !selectedType ||
                        (selectedType.requiresExpiry && !expiresAt)
                    ) {
                        submit.setError(
                            'Wybierz rodzaj i datę ważności dokumentu.',
                        )

                        return
                    }

                    if (issuedAt && expiresAt && issuedAt > expiresAt) {
                        submit.setError(
                            'Data wydania nie może być późniejsza od daty ważności.',
                        )

                        return
                    }

                    await mutation.mutateAsync({
                        id: card?.id,
                        dto: {
                            typeId: selectedType.id,
                            number: number.trim(),
                            issuingCountry: issuingCountry.trim(),
                            issuingAuthority: issuingAuthority.trim(),
                            issuedAt,
                            expiresAt,
                            status,
                            isStayBasis:
                                status === 'active' &&
                                stayDocumentCodes.has(selectedType.code) &&
                                isStayBasis,
                            reminderMonths: expiresAt ? months : [],
                            notes: notes.trim(),
                        },
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <FormSelect
                selectTitle="Rodzaj dokumentu / statusu"
                value={typeId}
                onChange={(id) => {
                    setTypeId(id)

                    if (
                        !stayDocumentCodes.has(
                            types.find((type) => type.id === id)?.code ?? '',
                        )
                    )
                        setIsStayBasis(false)

                    setMonths(
                        types.find((type) => type.id === id)?.reminderMonths ??
                            [],
                    )
                }}
                disabled={!!card}
                options={types.map((type) => ({
                    title: type.title,
                    value: type.id,
                }))}
            />
            {selectedType && (
                <div className={c.documentPreview}>
                    <DigitalDocumentCard
                        card={{
                            id: card?.id ?? 0,
                            clientId,
                            typeId: selectedType.id,
                            type: selectedType,
                            number,
                            issuingCountry,
                            issuingAuthority,
                            issuedAt,
                            expiresAt,
                            status,
                            isStayBasis,
                            reminderMonths: months,
                            createdAt: card?.createdAt ?? '',
                            updatedAt: card?.updatedAt ?? '',
                        }}
                        client={client}
                        profile={profile}
                        isCurrent={
                            isStayBasis &&
                            status === 'active' &&
                            stayDocumentCodes.has(selectedType.code)
                        }
                    />
                </div>
            )}
            {selectedType &&
                stayDocumentCodes.has(selectedType.code) &&
                status === 'active' && (
                    <label className={c.basisToggle}>
                        <input
                            type="checkbox"
                            checked={isStayBasis}
                            onChange={(event) =>
                                setIsStayBasis(event.target.checked)
                            }
                        />
                        <span>
                            <strong>Podstawa pobytu w Polsce</strong>
                            <small>
                                Wskaż dokument używany obecnie przez klienta.
                                Zastąpi poprzednio wybraną kartę.
                            </small>
                        </span>
                    </label>
                )}
            <TextInput
                inputTitle="Ważny do"
                type="date"
                value={expiresAt}
                onChange={setExpiresAt}
                required={selectedType?.requiresExpiry}
                min="1900-01-01"
                max="9999-12-31"
            />
            {!selectedType?.requiresExpiry && (
                <p className={c.hint}>
                    Dla bezterminowego statusu pozostaw datę pustą.
                </p>
            )}
            {expiresAt && (
                <ReminderMonthsInput value={months} onChange={setMonths} />
            )}
            <p className={c.hint}>
                Powstaną wydarzenia w kalendarzu opiekuna klienta. Zmiana
                terminu aktualizuje przyszłe przypomnienia. Dane osoby są
                pobierane z jej profilu.
            </p>
            {selectedType?.code.includes('passport') && (
                <DuplicateClientWarning
                    kind="passportNumber"
                    value={number}
                    clientId={clientId}
                />
            )}
            <details>
                <summary>Dodatkowe dane dokumentu</summary>
                <div className={c.stack}>
                    <TextInput
                        inputTitle="Numer dokumentu"
                        value={number}
                        onChange={setNumber}
                        maxLength={100}
                    />
                    <TextInput
                        inputTitle="Kraj wydania"
                        value={issuingCountry}
                        onChange={setIssuingCountry}
                        maxLength={100}
                    />
                    <TextInput
                        inputTitle="Organ wydający"
                        value={issuingAuthority}
                        onChange={setIssuingAuthority}
                        maxLength={255}
                    />
                    <TextInput
                        inputTitle="Data wydania"
                        type="date"
                        value={issuedAt}
                        onChange={setIssuedAt}
                    />
                    <FormTextarea
                        inputTitle="Notatka"
                        value={notes}
                        onChange={setNotes}
                        maxLength={5000}
                        rows={3}
                    />
                </div>
            </details>
            {card && (
                <FormSelect
                    selectTitle="Stan karty"
                    value={status}
                    onChange={(value) => {
                        setStatus(value)

                        if (value !== 'active') setIsStayBasis(false)
                    }}
                    options={Object.entries(statusLabels).map(
                        ([value, title]) => ({
                            value: value as DocumentCard['status'],
                            title,
                        }),
                    )}
                    hint="Zastąpienie lub archiwizacja anuluje przyszłe przypomnienia tej karty."
                />
            )}
        </FormContainer>
    )
}

export function ClientDocumentCards({
    clientId,
    readonly,
    client,
}: {
    clientId: number
    readonly: boolean
    client: CardClient
}) {
    const query = useDocumentCards(clientId)

    const types = useDocumentCardTypes()

    const profile = useLegalization(clientId)

    const [editing, setEditing] = useState<DocumentCard | 'new' | null>(null)

    const [pending, setPending] = useState(false)

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    const current = rows.find(
        (card) => card.isStayBasis && card.status === 'active',
    )

    return (
        <section className={c.stack} aria-label="Karty dokumentów klienta">
            <header className={c.header}>
                <h2>Karty dokumentów i statusów</h2>
                {!readonly && (
                    <Button
                        type="button"
                        onClick={() => setEditing('new')}
                        disabled={!types.isSuccess}
                    >
                        <Plus size={15} />
                        Dodaj kartę
                    </Button>
                )}
            </header>
            <p className={c.hint}>
                Cyfrowy portfel klienta. Dane osoby uzupełniają się z profilu, a
                terminy dokumentów są powiązane z kalendarzem opiekuna.
            </p>
            {query.isSuccess && rows.length > 0 && (
                <div className={c.currentBasis} role="status">
                    <ShieldCheck size={21} aria-hidden />
                    <div>
                        <span>Podstawa pobytu w Polsce</span>
                        <strong>
                            {current?.type.title ??
                                'Nie wskazano dokumentu pobytowego'}
                        </strong>
                        <p>
                            {current
                                ? 'Dokument wskazany przez opiekuna klienta.'
                                : 'Wybierz aktualny dokument podczas dodawania lub edycji karty.'}
                        </p>
                    </div>
                </div>
            )}
            <ClientQueryState
                pending={
                    query.isPending || types.isPending || profile.isPending
                }
                error={query.isError || types.isError || profile.isError}
                empty={query.isSuccess && !rows.length}
                onRetry={() => {
                    void query.refetch()

                    void types.refetch()

                    void profile.refetch()
                }}
                emptyTitle="Klient nie ma jeszcze kart dokumentów."
            />
            <div className={c.documentWallet}>
                {rows.map((card) => (
                    <DigitalDocumentCard
                        key={card.id}
                        card={card}
                        client={client}
                        profile={profile.data}
                        isCurrent={card.isStayBasis && card.status === 'active'}
                    >
                        <div className={c.documentActions}>
                            <p>
                                <CalendarDays size={14} aria-hidden />
                                {card.status !== 'active'
                                    ? 'Przypomnienia nieaktywne'
                                    : card.reminderMonths.length
                                      ? `${card.reminderMonths.join(', ')} mies. przed terminem`
                                      : 'Bez przypomnień'}
                            </p>
                            {!readonly && (
                                <Button
                                    type="button"
                                    onClick={() => setEditing(card)}
                                    aria-label={`Edytuj kartę: ${card.type.title}`}
                                >
                                    <Pencil size={14} aria-hidden /> Edytuj
                                    kartę
                                </Button>
                            )}
                        </div>
                        {card.notes && (
                            <p className={c.documentNote}>{card.notes}</p>
                        )}
                    </DigitalDocumentCard>
                ))}
            </div>
            {query.hasNextPage && (
                <Button
                    type="button"
                    pending={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                >
                    Pokaż starsze karty
                </Button>
            )}
            {editing && types.data && (
                <Popup
                    title={
                        editing === 'new'
                            ? 'Nowa karta dokumentu'
                            : 'Edytuj kartę dokumentu'
                    }
                    closeDisabled={pending}
                    onClose={() => setEditing(null)}
                >
                    <CardForm
                        clientId={clientId}
                        card={editing === 'new' ? undefined : editing}
                        types={types.data.rows}
                        client={client}
                        profile={profile.data}
                        onSaved={() => setEditing(null)}
                        onCancel={() => setEditing(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}
