'use client'

import { useId, useState } from 'react'
import { CheckCircle2, Circle, CircleDot, Pencil } from 'lucide-react'
import type { Client, ClientPaymentStatus } from '@/api/clients/clients.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import { useUpdateClient } from '@/shared/hooks/useClients'
import { clientPaymentStatuses, paymentAmountLabel } from '../client-labels'
import { useClientSubmit } from '../useClientSubmit'
import c from './ClientPaymentCard.module.scss'

const statusOrder: ClientPaymentStatus[] = ['unpaid', 'partial', 'paid']

const paymentStatuses = {
    unpaid: { ...clientPaymentStatuses.unpaid, icon: Circle },
    partial: { ...clientPaymentStatuses.partial, icon: CircleDot },
    paid: { ...clientPaymentStatuses.paid, icon: CheckCircle2 },
}

export function ClientPaymentCard({
    client,
    readonly,
}: {
    client: Client
    readonly: boolean
}) {
    const [editing, setEditing] = useState(false)

    const [pending, setPending] = useState(false)

    const status = client.paymentStatus ?? 'unpaid'

    const current = paymentStatuses[status]

    return (
        <section
            className={`${c.card} ${c[status]}`}
            aria-label="Płatność klienta"
            data-payment-status={status}
        >
            <header>
                <h2>Płatność</h2>
                {!readonly && (
                    <Button
                        type="button"
                        className={c.edit}
                        aria-label="Edytuj płatność"
                        onClick={() => setEditing(true)}
                    >
                        <Pencil size={14} aria-hidden /> Edytuj
                    </Button>
                )}
            </header>
            <div className={c.status}>
                <current.icon size={20} aria-hidden />
                <strong>{current.title}</strong>
            </div>
            <div className={c.amount}>
                <small>Kwota usługi</small>
                <strong>
                    {client.paymentAmount != null
                        ? paymentAmountLabel(
                              client.paymentAmount,
                              client.paymentCurrency ?? 'PLN',
                          )
                        : 'Nie podano kwoty'}
                </strong>
            </div>
            {client.paymentComment ? (
                <p className={c.comment}>{client.paymentComment}</p>
            ) : (
                <p className={c.empty}>Brak komentarza.</p>
            )}
            {editing && !readonly && (
                <Popup
                    title="Edytuj płatność"
                    closeDisabled={pending}
                    onClose={() => setEditing(false)}
                >
                    <ClientPaymentForm
                        client={client}
                        onDone={() => setEditing(false)}
                        onPendingChange={setPending}
                    />
                </Popup>
            )}
        </section>
    )
}

function ClientPaymentForm({
    client,
    onDone,
    onPendingChange,
}: {
    client: Client
    onDone: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [status, setStatus] = useState<ClientPaymentStatus>(
        client.paymentStatus ?? 'unpaid',
    )

    const [comment, setComment] = useState(client.paymentComment ?? '')

    const [amount, setAmount] = useState(client.paymentAmount ?? '')

    const [currency, setCurrency] = useState(client.paymentCurrency ?? 'PLN')

    const currencyListId = useId()

    const update = useUpdateClient()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Płatność klienta"
            isPending={submit.pending}
            error={submit.error}
            onCancel={onDone}
            onSubmit={() =>
                void submit.run(async (signal) => {
                    const paymentComment = comment.trim()

                    const paymentAmount = amount.trim().replace(',', '.')

                    const paymentCurrency = currency.trim().toUpperCase()

                    if (
                        !(status in paymentStatuses) ||
                        (paymentAmount !== '' &&
                            !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(
                                paymentAmount,
                            )) ||
                        !/^[A-Z]{3}$/.test(paymentCurrency) ||
                        paymentComment.length > 2000 ||
                        /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(paymentComment)
                    ) {
                        submit.setError(
                            'Sprawdź status, kwotę (0–9999999999,99), kod waluty i komentarz do 2000 znaków.',
                        )

                        return
                    }

                    await update.mutateAsync({
                        id: client.id,
                        dto: {
                            paymentStatus: status,
                            paymentAmount: paymentAmount || null,
                            paymentCurrency,
                            paymentComment: paymentComment || null,
                        },
                        signal,
                    })

                    if (!signal.aborted) onDone()
                })
            }
        >
            <FormSelect
                selectTitle="Status płatności"
                value={status}
                onChange={setStatus}
                options={statusOrder.map((value) => ({
                    value,
                    title: paymentStatuses[value].title,
                }))}
                required
            />
            <TextInput
                inputTitle="Kwota usługi"
                inputMode="decimal"
                value={amount}
                onChange={setAmount}
                maxLength={13}
                placeholder="np. 5000,00"
                hint="Pełna wartość usługi. Częściową wpłatę możesz opisać w komentarzu."
            />
            <TextInput
                inputTitle="Waluta"
                value={currency}
                onChange={(value) => setCurrency(value.toUpperCase())}
                list={currencyListId}
                maxLength={3}
                pattern="[A-Z]{3}"
                required
                hint="Kod ISO, np. PLN, EUR, USD, GBP lub UAH. Możesz wpisać inną walutę."
            />
            <datalist id={currencyListId}>
                {['PLN', 'EUR', 'USD', 'GBP', 'UAH'].map((value) => (
                    <option key={value} value={value} />
                ))}
            </datalist>
            <FormTextarea
                inputTitle="Komentarz do płatności"
                value={comment}
                onChange={setComment}
                maxLength={2000}
                rows={4}
                hint="Opcjonalny komentarz do statusu płatności · do 2000 znaków."
            />
        </FormContainer>
    )
}
