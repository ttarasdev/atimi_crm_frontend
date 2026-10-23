'use client'

import { useState } from 'react'
import type { DocumentCardType } from '@/api/legalization/legalization.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import {
    useDocumentCardTypes,
    useUpdateDocumentCardType,
} from '@/shared/hooks/useLegalization'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import { ClientQueryState } from '@/features/clients/ClientQueryState'
import { ReminderMonthsInput } from './ReminderMonthsInput'
import { DigitalDocumentCard } from './DigitalDocumentCard'
import c from './Legalization.module.scss'

function TypeForm({
    type,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    type: DocumentCardType
    onSaved: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [months, setMonths] = useState(type.reminderMonths)

    const [customMonth, setCustomMonth] = useState('')

    const [time, setTime] = useState(type.reminderTime)

    const [email, setEmail] = useState(type.notificationEmail ?? '')

    const mutation = useUpdateDocumentCardType()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Ustawienia karty dokumentu"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            submitTitle="Zapisz ustawienia"
            onSubmit={() =>
                void submit.run(async (signal) => {
                    await mutation.mutateAsync({
                        id: type.id,
                        dto: {
                            reminderMonths: months,
                            reminderTime: time,
                            notificationEmail: email.trim(),
                        },
                        signal,
                    })

                    if (!signal.aborted) onSaved()
                })
            }
        >
            <p className={c.hint}>
                {type.title}. Ustawienia są domyślne dla nowych kart. Istniejące
                karty zachowują wybrane terminy.
            </p>
            <ReminderMonthsInput value={months} onChange={setMonths} />
            <div className={c.grid}>
                <TextInput
                    inputTitle="Inny termin (miesiące)"
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    value={customMonth}
                    onChange={setCustomMonth}
                />
                <Button
                    type="button"
                    disabled={
                        !Number.isInteger(Number(customMonth)) ||
                        Number(customMonth) < 1 ||
                        Number(customMonth) > 24
                    }
                    onClick={() => {
                        setMonths(
                            [...new Set([...months, Number(customMonth)])].sort(
                                (a, b) => b - a,
                            ),
                        )

                        setCustomMonth('')
                    }}
                >
                    Dodaj termin
                </Button>
            </div>
            <TextInput
                inputTitle="Godzina przypomnienia (Europe/Warsaw)"
                value={time}
                onChange={setTime}
                type="time"
                required
            />
            <TextInput
                inputTitle="Dodatkowy adres e-mail"
                value={email}
                onChange={setEmail}
                type="email"
                maxLength={254}
                placeholder="Puste — tylko opiekun klienta"
            />
            <p className={c.hint}>
                Wpisuj wyłącznie adres osoby uprawnionej do danych klientów.
                Przypomnienie pozostaje również w kalendarzu opiekuna.
            </p>
        </FormContainer>
    )
}

export function DocumentCardTypesPage() {
    const query = useDocumentCardTypes()

    const { hasRole } = useRoles()

    const [editing, setEditing] = useState<DocumentCardType | null>(null)

    const [pending, setPending] = useState(false)

    return (
        <section className={c.stack} aria-label="Rodzaje kart dokumentów">
            <header className={c.header}>
                <h2>Karty dokumentów i statusów</h2>
            </header>
            <p className={c.hint}>
                Systemowy katalog kart. Administrator ustawia domyślne
                przypomnienia. Rodzaje i ich wygląd są zarządzane w aplikacji.
            </p>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={false}
                onRetry={() => void query.refetch()}
            />
            <div className={c.documentWallet}>
                {query.data?.rows.map((type) => (
                    <DigitalDocumentCard
                        key={type.id}
                        card={{
                            id: 0,
                            clientId: 0,
                            typeId: type.id,
                            type,
                            status: 'active',
                            isStayBasis: false,
                            reminderMonths: type.reminderMonths,
                            createdAt: '',
                            updatedAt: '',
                        }}
                        client={{ name: '' }}
                    >
                        <p className={c.hint}>
                            {type.requiresExpiry
                                ? 'Wymaga daty ważności'
                                : 'Może być bezterminowy'}
                        </p>
                        <p className={c.hint}>
                            Przypomnienia:{' '}
                            {type.reminderMonths.length
                                ? `${type.reminderMonths.join(', ')} mies. przed terminem`
                                : 'Wyłączone'}{' '}
                            · {type.reminderTime}
                        </p>
                        <p className={c.hint}>
                            {type.notificationEmail ||
                                'E-mail opiekuna klienta'}
                        </p>
                        {hasRole('admin') && (
                            <Button
                                type="button"
                                onClick={() => setEditing(type)}
                            >
                                Ustaw przypomnienia
                            </Button>
                        )}
                    </DigitalDocumentCard>
                ))}
            </div>
            {editing && (
                <Popup
                    title={editing.title}
                    closeDisabled={pending}
                    onClose={() => setEditing(null)}
                >
                    <TypeForm
                        type={editing}
                        onSaved={() => setEditing(null)}
                        onCancel={() => setEditing(null)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}
