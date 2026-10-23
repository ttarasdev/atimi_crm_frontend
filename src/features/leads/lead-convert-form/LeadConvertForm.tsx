'use client'

import { useDeferredValue, useState } from 'react'
import type { DuplicateClientsResponse } from '@/api/clients/clients.types'
import type { Lead } from '@/api/leads/leads.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { FormManagerInput } from '@/components/form-components/form-manager-input/FormManagerInput'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useConvertLead } from '@/shared/hooks/useLeads'
import { useClient, useInfiniteClients } from '@/shared/hooks/useClients'
import { DuplicateClientWarning } from '@/features/clients/DuplicateClientWarning'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClientSubmit } from '@/features/clients/useClientSubmit'
import c from '@/features/clients/Clients.module.scss'

export function LeadConvertForm({
    lead,
    onSaved,
    onCancel,
    onPendingChange,
}: {
    lead: Lead
    onSaved: (clientId: number) => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const { hasRole } = useRoles()

    const [mode, setMode] = useState<'new' | 'existing'>('new')

    const [managerId, setManagerId] = useState<number | null>(lead.managerId)

    const [name, setName] = useState(lead.name.split(/\s+/)[0] ?? '')

    const [surname, setSurname] = useState(
        lead.name.split(/\s+/).slice(1).join(' '),
    )

    const [search, setSearch] = useState('')

    const deferred = useDeferredValue(search.trim())

    const [clientId, setClientId] = useState<number | null>(null)

    const [candidate, setCandidate] = useState<
        DuplicateClientsResponse['rows'][number] | null
    >(null)

    const selected = useClient(mode === 'existing' ? clientId : null)

    const clients = useInfiniteClients(
        {
            ...(managerId ? { managerId } : {}),
            ...(deferred ? { search: deferred } : {}),
            archived: false,
        },
        mode === 'existing' && managerId !== null,
    )

    const rows =
        clients.data?.pages
            .flatMap((page) => page.rows)
            .filter(
                (client) =>
                    client.managerId === managerId && !client.archivedAt,
            ) ?? []

    const selectedClient = selected.data ?? candidate

    const options =
        selectedClient &&
        selectedClient.managerId === managerId &&
        !selectedClient.archivedAt &&
        !rows.some((client) => client.id === selectedClient.id)
            ? [selectedClient, ...rows]
            : rows

    const convert = useConvertLead()

    const submit = useClientSubmit(onPendingChange)

    return (
        <FormContainer
            aria-label="Przeniesienie zgłoszenia do klientów"
            isPending={submit.pending}
            error={submit.error}
            submitDisabled={
                mode === 'existing' &&
                (!clientId || selected.isPending || selected.isError)
            }
            onCancel={onCancel}
            submitTitle={
                mode === 'new' ? 'Utwórz klienta' : 'Połącz z klientem'
            }
            onSubmit={() =>
                void submit.run(async (signal) => {
                    if (!managerId) {
                        submit.setError('Wybierz opiekuna zgłoszenia.')

                        return
                    }

                    if (
                        mode === 'existing' &&
                        (!clientId ||
                            !selected.data ||
                            selected.data.managerId !== managerId ||
                            selected.data.archivedAt)
                    ) {
                        submit.setError('Wybierz klienta tego samego opiekuna.')

                        return
                    }

                    const saved = await convert.mutateAsync({
                        id: lead.id,
                        dto: {
                            ...(!lead.managerId && hasRole('admin')
                                ? { managerId }
                                : {}),
                            ...(mode === 'existing' && clientId
                                ? { clientId }
                                : {
                                      name: name.trim(),
                                      ...(surname.trim()
                                          ? { surname: surname.trim() }
                                          : {}),
                                  }),
                        },
                        signal,
                    })

                    if (!signal.aborted) onSaved(saved.clientId)
                })
            }
        >
            <p className={c.hint}>
                Kontakty i wiadomość trafią do karty klienta. Zgłoszenie
                pozostanie na liście ze statusem „Klient”. Żadna wiadomość nie
                zostanie wysłana automatycznie.
            </p>
            {hasRole('admin') && !lead.managerId && (
                <FormManagerInput
                    value={managerId}
                    onChange={(id) => {
                        setManagerId(id)

                        setClientId(null)

                        setCandidate(null)
                    }}
                    inputTitle="Opiekun zgłoszenia i klienta"
                    disabled={submit.pending}
                />
            )}
            <DuplicateClientWarning
                email={lead.email}
                phone={lead.phone}
                managerId={managerId}
                onSelect={(client) => {
                    setCandidate(client)

                    setClientId(client.id)

                    setMode('existing')
                }}
            />
            <FormSelect<'new' | 'existing'>
                selectTitle="Klient"
                value={mode}
                onChange={setMode}
                options={[
                    { title: 'Utwórz nowego klienta', value: 'new' },
                    {
                        title: 'Połącz z istniejącym klientem',
                        value: 'existing',
                    },
                ]}
            />
            {mode === 'new' ? (
                <div className={c.grid}>
                    <TextInput
                        inputTitle="Imię / nazwa klienta"
                        value={name}
                        onChange={setName}
                        required
                        maxLength={100}
                        autoComplete="given-name"
                    />
                    <TextInput
                        inputTitle="Nazwisko klienta"
                        value={surname}
                        onChange={setSurname}
                        maxLength={100}
                        autoComplete="family-name"
                    />
                </div>
            ) : (
                <>
                    <TextInput
                        inputTitle="Szukaj klienta"
                        value={search}
                        onChange={setSearch}
                        maxLength={100}
                        type="search"
                    />
                    <FormSelect<number | null>
                        selectTitle="Istniejący klient"
                        value={clientId}
                        onChange={(id) => {
                            setClientId(id)

                            setCandidate(null)
                        }}
                        disabled={
                            !managerId || (clients.isPending && !selectedClient)
                        }
                        required
                        options={[
                            { title: 'Wybierz klienta', value: null },
                            ...options.map((client) => ({
                                title: `${client.name} ${client.surname ?? ''}`.trim(),
                                value: client.id,
                            })),
                        ]}
                    />
                    {clientId && selected.isPending && (
                        <p className={c.hint} role="status">
                            Wczytywanie wybranego klienta…
                        </p>
                    )}
                    {clientId && selected.isError && (
                        <p className={c.error} role="alert">
                            Nie udało się wczytać wybranego klienta.{' '}
                            <button
                                type="button"
                                onClick={() => void selected.refetch()}
                            >
                                Ponów wczytywanie klienta
                            </button>
                        </p>
                    )}
                    {selected.data &&
                        (selected.data.managerId !== managerId ||
                            selected.data.archivedAt) && (
                            <p className={c.error} role="alert">
                                Wybierz niearchiwalnego klienta tego samego
                                opiekuna.
                            </p>
                        )}
                    {clients.hasNextPage && (
                        <Button
                            type="button"
                            className={c.secondary}
                            pending={clients.isFetchingNextPage}
                            onClick={() => void clients.fetchNextPage()}
                        >
                            Więcej klientów
                        </Button>
                    )}
                    {clients.isError && (
                        <p className={c.error} role="alert">
                            Nie udało się wczytać klientów.{' '}
                            <button
                                type="button"
                                onClick={() => void clients.refetch()}
                            >
                                Spróbuj ponownie
                            </button>
                        </p>
                    )}
                </>
            )}
        </FormContainer>
    )
}
