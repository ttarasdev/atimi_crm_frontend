'use client'

import { useDeferredValue, useId, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronDown, Clock3 } from 'lucide-react'
import { mailApi } from '@/api/mail/mail.api'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { Button } from '@/components/ui/button/Button'
import { ClientQueryState } from '@/features/clients/ClientQueryState'
import c from '@/features/legalization/Legalization.module.scss'
import styles from './MailHistory.module.scss'

const statuses = { pending: 'W toku', sent: 'Wysłano', failed: 'Niepowodzenie' }

export function MailHistory({
    clientId,
    initiallyExpanded = false,
}: {
    clientId?: number
    initiallyExpanded?: boolean
}) {
    const [expanded, setExpanded] = useState(initiallyExpanded)

    const contentId = useId()

    const [search, setSearch] = useState('')

    const [status, setStatus] = useState<'pending' | 'sent' | 'failed' | null>(
        null,
    )

    const deferredSearch = useDeferredValue(search.trim())

    const query = useInfiniteQuery({
        queryKey: [
            'mail-history',
            clientId ?? 'global',
            deferredSearch,
            status,
        ],
        enabled: expanded,
        refetchOnWindowFocus: false,
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) =>
            mailApi.history(
                {
                    page: pageParam,
                    limit: 20,
                    ...(deferredSearch ? { search: deferredSearch } : {}),
                    ...(status ? { status } : {}),
                },
                { signal },
                clientId,
            ),
        getNextPageParam: (last) =>
            last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <section className={c.stack} aria-label="Historia poczty">
            <header className={c.header}>
                <div className={styles.title}>
                    <Clock3 size={18} aria-hidden />
                    <h2>Historia wysyłania</h2>
                </div>
                <Button
                    type="button"
                    className={styles.toggle}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded ? 'Ukryj historię' : 'Pokaż historię'}
                    <ChevronDown
                        size={15}
                        aria-hidden
                        className={expanded ? styles.rotated : undefined}
                    />
                </Button>
            </header>
            {!expanded && (
                <p className={c.hint}>
                    Wiadomości wczytamy po otwarciu historii. Starsze listy
                    możesz pobierać po 20.
                </p>
            )}
            {expanded && (
                <div id={contentId} className={c.stack}>
                    <div className={c.grid}>
                        <TextInput
                            inputTitle="Szukaj w historii"
                            type="search"
                            value={search}
                            onChange={setSearch}
                            maxLength={100}
                        />
                        <FormSelect
                            selectTitle="Wynik wysyłania"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { title: 'Wszystkie', value: null },
                                ...Object.entries(statuses).map(
                                    ([value, title]) => ({
                                        title,
                                        value: value as
                                            | 'pending'
                                            | 'sent'
                                            | 'failed',
                                    }),
                                ),
                            ]}
                        />
                    </div>
                    <ClientQueryState
                        pending={query.isPending}
                        error={query.isError}
                        empty={!rows.length}
                        onRetry={() => void query.refetch()}
                        emptyTitle="Brak wiadomości w historii."
                    />
                    {rows.map((mail) => (
                        <details className={c.section} key={mail.id}>
                            <summary>
                                <strong>{mail.subject}</strong> ·{' '}
                                {statuses[mail.status]}
                            </summary>
                            <dl className={c.data}>
                                <div>
                                    <dt>Do</dt>
                                    <dd>{mail.to}</dd>
                                </div>
                                <div>
                                    <dt>Od</dt>
                                    <dd>{mail.fromEmail}</dd>
                                </div>
                                <div>
                                    <dt>Data</dt>
                                    <dd>
                                        {new Date(
                                            mail.sentAt ?? mail.createdAt,
                                        ).toLocaleString('pl-PL', {
                                            timeZone: 'Europe/Warsaw',
                                        })}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Wysyłający</dt>
                                    <dd>Pracownik #{mail.managerId}</dd>
                                </div>
                            </dl>
                            <p className={c.hint}>{mail.text}</p>
                            {mail.attachments.length > 0 && (
                                <p className={c.hint}>
                                    Załączniki:{' '}
                                    {mail.attachments
                                        .map((item) => item.filename)
                                        .join(', ')}
                                </p>
                            )}
                        </details>
                    ))}
                    {query.hasNextPage && (
                        <Button
                            type="button"
                            pending={query.isFetchingNextPage}
                            onClick={() => void query.fetchNextPage()}
                        >
                            Pokaż starsze wiadomości
                        </Button>
                    )}
                </div>
            )}
        </section>
    )
}
