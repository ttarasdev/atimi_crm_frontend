'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients/clients.api'
import { Button } from '@/components/ui/button/Button'
import type {
    DuplicateClientsQuery,
    DuplicateClientsResponse,
} from '@/api/clients/clients.types'
import c from './Clients.module.scss'

export function DuplicateClientWarning({
    kind,
    value = '',
    clientId,
    email,
    phone,
    managerId,
    onSelect,
}: {
    kind?: 'email' | 'phone' | 'pesel' | 'passportNumber'
    value?: string
    clientId?: number
    email?: string | null
    phone?: string | null
    managerId?: number | null
    onSelect?: (client: DuplicateClientsResponse['rows'][number]) => void
}) {
    const emailValue = (kind === 'email' ? value : (email ?? ''))
        .trim()
        .toLowerCase()

    const phoneValue = (kind === 'phone' ? value : (phone ?? ''))
        .trim()
        .replace(/[\s().-]/g, '')
        .replace(/^00/, '+')
        .replace(/^\+/, '')

    const query: DuplicateClientsQuery = {
        ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) &&
        emailValue.length <= 254
            ? { email: emailValue }
            : {}),
        ...(/^[1-9]\d{6,14}$/.test(phoneValue) ? { phone: phoneValue } : {}),
        ...(kind === 'pesel' && /^\d{11}$/.test(value.trim())
            ? { pesel: value.trim() }
            : {}),
        ...(kind === 'passportNumber' &&
        value.trim().length >= 4 &&
        value.trim().length <= 100
            ? { passportNumber: value.trim() }
            : {}),
        ...(clientId ? { excludeClientId: clientId } : {}),
        page: 1,
        limit: 20,
    }

    const hasValue = Boolean(
        query.email || query.phone || query.pesel || query.passportNumber,
    )

    const signature = JSON.stringify(query)

    const [checkedSignature, setCheckedSignature] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setCheckedSignature(signature), 400)

        return () => clearTimeout(timer)
    }, [signature])

    const ready = hasValue && checkedSignature === signature

    const duplicates = useQuery({
        queryKey: ['clients', 'duplicates', query],
        enabled: ready,
        queryFn: ({ signal }) => clientsApi.duplicates(query, { signal }),
        retry: false,
        refetchOnWindowFocus: false,
    })

    if (!hasValue) return null

    if (
        !ready ||
        duplicates.isPending ||
        (duplicates.isFetching && duplicates.isError)
    )
        return (
            <p className={c.hint} role="status">
                Sprawdzanie podobnych klientów…
            </p>
        )

    if (duplicates.isError)
        return (
            <div className={c.warning} role="alert">
                Nie udało się sprawdzić dostępnych kart klientów. Możesz
                kontynuować zapis.{' '}
                <Button
                    type="button"
                    className={c.secondary}
                    onClick={() => void duplicates.refetch()}
                >
                    Ponów sprawdzanie duplikatów
                </Button>
            </div>
        )

    if (!duplicates.data?.rows.length) return null

    return (
        <div className={c.warning} role="status">
            <strong>Możliwy duplikat klienta</strong>
            <p>
                Te dane występują również w dostępnych kartach. Rodzina może
                korzystać ze wspólnego kontaktu. Możesz kontynuować zapis.
            </p>
            <ul className={c.duplicateMatches}>
                {duplicates.data.rows.map((client) => (
                    <li key={client.id}>
                        <Link
                            href={`/main/clients/${client.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {client.name} {client.surname}
                        </Link>
                        <span>
                            {client.matchedFields
                                .map(
                                    (field) =>
                                        ({
                                            email: 'E-mail',
                                            phone: 'Telefon',
                                            pesel: 'PESEL',
                                            passportNumber: 'Paszport',
                                        })[field],
                                )
                                .join(' / ')}
                        </span>
                        {client.archivedAt ? (
                            <span>Archiwalny</span>
                        ) : client.canEdit === false ? (
                            <span>Tylko podgląd</span>
                        ) : null}
                        {onSelect &&
                            managerId === client.managerId &&
                            client.canEdit &&
                            !client.archivedAt && (
                                <Button
                                    type="button"
                                    className={c.secondary}
                                    onClick={() => onSelect(client)}
                                >
                                    Połącz z tym klientem
                                </Button>
                            )}
                    </li>
                ))}
            </ul>
            {duplicates.data.total > duplicates.data.rows.length && (
                <p>
                    Pokazano pierwsze {duplicates.data.rows.length} z{' '}
                    {duplicates.data.total} dopasowań.
                </p>
            )}
        </div>
    )
}
