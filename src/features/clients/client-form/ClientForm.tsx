'use client'

import { useState } from 'react'
import type {
    Client,
    ClientStatus,
    ClientPriority,
    UpdateClientDto,
} from '@/api/clients/clients.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormManagerInput } from '@/components/form-components/form-manager-input/FormManagerInput'
import {
    useCreateClient,
    useUpdateClient,
    useClientSources,
} from '@/shared/hooks/useClients'
import { useAuth } from '@/shared/hooks/useAuth'
import { useRoles } from '@/shared/hooks/useRoles'
import { clientStatuses, clientPriorities } from '../client-labels'
import { useClientSubmit } from '../useClientSubmit'
import { DuplicateClientWarning } from '../DuplicateClientWarning'
import c from '../Clients.module.scss'

export function ClientForm({
    client,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    client?: Client
    onSaved: (client: Client) => void
    onCancel: () => void
    onPendingChange?: (pending: boolean) => void
}) {
    const { manager } = useAuth()

    const { hasRole } = useRoles()

    const [isPrivate, setIsPrivate] = useState(client?.isPrivate ?? true)

    const [name, setName] = useState(client?.name ?? '')

    const [surname, setSurname] = useState(client?.surname ?? '')

    const [email, setEmail] = useState('')

    const [phone, setPhone] = useState('')

    const [language, setLanguage] = useState(
        client?.language === 'uk' ? 'ua' : (client?.language ?? 'pl'),
    )

    const [address, setAddress] = useState(client?.address ?? '')

    const [contactTime, setContactTime] = useState(
        client?.preferredContactTime ?? '',
    )

    const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'new')

    const [priority, setPriority] = useState<ClientPriority>(
        client?.priority ?? 'normal',
    )

    const [sourceId, setSourceId] = useState<number | null>(
        client?.sourceId ?? null,
    )

    const [managerId, setManagerId] = useState<number | null>(
        client?.managerId ?? manager?.id ?? null,
    )

    const sources = useClientSources()

    const create = useCreateClient()

    const update = useUpdateClient()

    const submit = useClientSubmit(onPendingChange)

    const sourceRows = sources.data?.pages.flatMap((page) => page.rows) ?? []

    const save = () =>
        submit.run(async (signal) => {
            if (!name.trim() || !managerId) {
                submit.setError('Wpisz imię i wybierz opiekuna.')

                return
            }

            if (
                !client &&
                phone.trim() &&
                !/^[1-9]\d{6,14}$/.test(
                    phone
                        .trim()
                        .replace(/[\s().-]/g, '')
                        .replace(/^00/, '+')
                        .replace(/^\+/, ''),
                )
            ) {
                submit.setError(
                    'Wpisz numer telefonu zawierający od 7 do 15 cyfr, opcjonalnie z prefiksem + lub 00.',
                )

                return
            }

            const dto: UpdateClientDto = {
                isPrivate,
                name: name.trim(),
                status,
                priority,
                surname: surname.trim() || null,
                language: language.trim() || null,
                address: address.trim() || null,
                preferredContactTime: contactTime.trim() || null,
                sourceId,
            }

            if (hasRole('admin') && (!client || client.managerId !== managerId))
                dto.managerId = managerId

            if (client) {
                for (const field of [
                    'isPrivate',
                    'name',
                    'surname',
                    'language',
                    'address',
                    'preferredContactTime',
                    'status',
                    'priority',
                    'sourceId',
                ] as const) {
                    if (dto[field] === client[field]) delete dto[field]
                }

                if (!Object.keys(dto).length) {
                    onSaved(client)

                    return
                }
            }

            const saved = client
                ? await update.mutateAsync({ id: client.id, dto, signal })
                : await create.mutateAsync({
                      dto: {
                          ...dto,
                          name: name.trim(),
                          ...(email.trim()
                              ? { email: email.trim().toLowerCase() }
                              : {}),
                          ...(phone.trim() ? { phone: phone.trim() } : {}),
                      },
                      signal,
                  })

            if (!signal.aborted) onSaved(saved)
        })

    return (
        <FormContainer
            aria-label={client ? 'Edycja klienta' : 'Tworzenie klienta'}
            isPending={submit.pending}
            error={submit.error}
            onCancel={onCancel}
            onSubmit={() => void save()}
            submitTitle={client ? 'Zapisz zmiany' : 'Dodaj klienta'}
        >
            <div className={c.grid}>
                <TextInput
                    inputTitle="Imię / nazwa"
                    value={name}
                    onChange={setName}
                    required
                    maxLength={100}
                    autoComplete="given-name"
                />
                <TextInput
                    inputTitle="Nazwisko"
                    value={surname}
                    onChange={setSurname}
                    maxLength={100}
                    autoComplete="family-name"
                />
                <FormSelect<ClientStatus>
                    selectTitle="Status klienta"
                    value={status}
                    onChange={setStatus}
                    options={Object.entries(clientStatuses).map(
                        ([value, data]) => ({
                            title: data.title,
                            value: value as ClientStatus,
                        }),
                    )}
                />
                <FormSelect<ClientPriority>
                    selectTitle="Priorytet"
                    value={priority}
                    onChange={setPriority}
                    options={Object.entries(clientPriorities).map(
                        ([value, title]) => ({
                            title,
                            value: value as ClientPriority,
                        }),
                    )}
                />
                <FormSelect
                    selectTitle="Język"
                    value={language}
                    onChange={setLanguage}
                    options={[
                        { title: 'Polski', value: 'pl' },
                        { title: 'Українська', value: 'ua' },
                        { title: 'English', value: 'en' },
                        { title: 'Русский', value: 'ru' },
                        { title: 'Nie wybrano', value: '' },
                        ...(!['pl', 'ua', 'en', 'ru', ''].includes(language)
                            ? [
                                  {
                                      title: language.toUpperCase(),
                                      value: language,
                                  },
                              ]
                            : []),
                    ]}
                />
                <FormSelect<number | null>
                    selectTitle="Źródło kontaktu"
                    value={sourceId}
                    onChange={setSourceId}
                    options={[
                        { title: 'Nie wybrano', value: null },
                        ...sourceRows.map((source) => ({
                            title: source.name,
                            value: source.id,
                        })),
                        ...(client?.sourceId &&
                        !sourceRows.some(
                            (source) => source.id === client.sourceId,
                        )
                            ? [
                                  {
                                      title: `Źródło #${client.sourceId} (archiwalne)`,
                                      value: client.sourceId,
                                  },
                              ]
                            : []),
                    ]}
                />
            </div>
            {!client && (
                <>
                    <div className={c.grid}>
                        <TextInput
                            inputTitle="E-mail (opcjonalnie)"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={setEmail}
                            maxLength={254}
                        />
                        <TextInput
                            inputTitle="Telefon (opcjonalnie)"
                            type="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={setPhone}
                            maxLength={255}
                        />
                    </div>
                    <DuplicateClientWarning email={email} phone={phone} />
                </>
            )}
            {sources.hasNextPage && (
                <button
                    type="button"
                    className={c.link}
                    disabled={sources.isFetchingNextPage}
                    onClick={() => void sources.fetchNextPage()}
                >
                    Więcej źródeł
                </button>
            )}
            {hasRole('admin') && (
                <FormManagerInput
                    value={managerId}
                    onChange={setManagerId}
                    disabled={submit.pending}
                />
            )}
            <TextInput
                inputTitle="Adres"
                value={address}
                onChange={setAddress}
                maxLength={255}
                autoComplete="street-address"
            />
            <TextInput
                inputTitle="Preferowane godziny kontaktu"
                value={contactTime}
                onChange={setContactTime}
                maxLength={100}
                placeholder="np. dni robocze po 17:00"
            />
            <label className={c.pair}>
                <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(event) => setIsPrivate(event.target.checked)}
                />
                Klient prywatny — widoczny tylko dla opiekuna i administratorów
            </label>
            {!isPrivate && (
                <p className={c.warning}>
                    Pozostali managerowie zobaczą dane klienta, jego sprawy i
                    dokumenty. Edycja pozostanie dostępna dla opiekuna i
                    administratorów.
                </p>
            )}
            <p className={c.hint}>
                Dane legalizacji i pozostałe kontakty dodasz w karcie klienta.
                Każdy klient może mieć kilka osobnych spraw.
            </p>
        </FormContainer>
    )
}
