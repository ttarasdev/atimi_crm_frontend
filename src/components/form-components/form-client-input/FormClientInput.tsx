'use client'

import { useEffect, useState } from 'react'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { useAuth } from '@/shared/hooks/useAuth'
import { useRoles } from '@/shared/hooks/useRoles'
import { useClient, useInfiniteClients } from '@/shared/hooks/useClients'
import c from './FormClientInput.module.scss'

export function FormClientInput({
    value,
    onChange,
    required = false,
    disabled = false,
    inputTitle = 'Klient',
    writableOnly = false,
    excludeClientId,
    managerId,
}: {
    value: number | null
    onChange: (value: number | null) => void
    required?: boolean
    disabled?: boolean
    inputTitle?: string
    writableOnly?: boolean
    excludeClientId?: number
    managerId?: number
}) {
    const { manager } = useAuth()

    const { hasRole } = useRoles()

    const [search, setSearch] = useState('')

    const [searchQuery, setSearchQuery] = useState('')

    const query = useInfiniteClients({
        archived: false,
        ...(managerId
            ? { managerId }
            : writableOnly && !hasRole('admin')
              ? { managerId: manager?.id }
              : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
    })

    const selected = useClient(value)

    const rows = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? []).map(
                (client) => [client.id, client],
            ),
        ).values(),
    )

    const clients =
        selected.data && !rows.some((client) => client.id === selected.data.id)
            ? [selected.data, ...rows]
            : rows

    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(search.trim()), 300)

        return () => clearTimeout(timer)
    }, [search])

    return (
        <div className={c.field}>
            <TextInput
                inputTitle="Szukaj klienta"
                type="search"
                value={search}
                onChange={setSearch}
                disabled={disabled}
                maxLength={100}
            />
            <FormSelect
                selectTitle={inputTitle}
                value={value}
                required={required}
                disabled={disabled || query.isPending}
                onChange={onChange}
                options={[
                    {
                        title: query.isPending
                            ? 'Wczytywanie…'
                            : required
                              ? 'Wybierz klienta'
                              : 'Bez klienta',
                        value: null,
                    },
                    ...clients
                        .filter(
                            (client) =>
                                client.id !== excludeClientId &&
                                (!managerId ||
                                    client.managerId === managerId) &&
                                (!writableOnly ||
                                    hasRole('admin') ||
                                    client.managerId === manager?.id),
                        )
                        .map((client) => ({
                            title: `${client.name} ${client.surname ?? ''}`.trim(),
                            value: client.id,
                        })),
                ]}
            />
            {query.isSuccess && !clients.length && (
                <p>Nie znaleziono aktywnych klientów.</p>
            )}
            {(query.isError || selected.isError) && (
                <div role="alert">
                    <p>Nie udało się wczytać klientów.</p>
                    <Button
                        type="button"
                        disabled={disabled}
                        pending={query.isFetching || selected.isFetching}
                        onClick={() => {
                            void query.refetch()

                            if (value) void selected.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {query.hasNextPage && (
                <Button
                    type="button"
                    disabled={disabled || query.isFetching}
                    pending={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                >
                    Pokaż więcej klientów
                </Button>
            )}
        </div>
    )
}
