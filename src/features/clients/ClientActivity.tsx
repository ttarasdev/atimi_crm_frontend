'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients/clients.api'
import { Button } from '@/components/ui/button/Button'
import { ClientQueryState } from './ClientQueryState'
import c from '@/features/legalization/Legalization.module.scss'

function actionLabel(action: string) {
    const resource = action.includes('/legalization')
        ? 'dane legalizacji'
        : action.includes('/document-cards')
          ? 'kartę dokumentu'
          : action.includes('/relations')
            ? 'powiązanie rodzinne'
            : action.includes('/processes')
              ? 'sprawę / etap'
              : action.includes('/contacts')
                ? 'kontakt'
                : action.includes('/notes')
                  ? 'notatkę'
                  : action.includes('/documents')
                    ? 'dokument'
                    : action.includes('/mail')
                      ? 'wiadomość e-mail'
                      : 'dane klienta'

    if (action.includes('/archive')) return 'Archiwizacja klienta'

    if (action.includes('/restore')) return 'Przywrócenie klienta'

    return `${action.startsWith('DELETE') ? 'Usunięto' : action.startsWith('POST') ? 'Dodano / wykonano' : 'Zmieniono'} ${resource}`
}

const fieldLabels: Record<string, string> = {
    isPrivate: 'prywatność',
    managerId: 'opiekun',
    name: 'imię',
    surname: 'nazwisko',
    status: 'status',
    priority: 'priorytet',
    title: 'nazwa',
    expiresAt: 'ważny do',
    issuedAt: 'data wydania',
    reminderMonths: 'przypomnienia',
    pesel: 'PESEL',
    emailMarketingConsent: 'zgoda marketingowa',
    emailAutomationConsent: 'powiadomienia automatyczne',
    caseData: 'dane sprawy',
}

export function ClientActivity({ clientId }: { clientId: number }) {
    const query = useInfiniteQuery({
        queryKey: ['client-activity', clientId],
        initialPageParam: 1,
        staleTime: 0,
        queryFn: ({ signal, pageParam }) =>
            clientsApi.activity(clientId, pageParam, { signal }),
        getNextPageParam: (last) =>
            last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })

    const rows = query.data?.pages.flatMap((page) => page.rows) ?? []

    return (
        <section className={c.stack} aria-label="Historia zmian klienta">
            <header className={c.header}>
                <h2>Historia zmian</h2>
            </header>
            <ClientQueryState
                pending={query.isPending}
                error={query.isError}
                empty={!rows.length}
                onRetry={() => void query.refetch()}
                emptyTitle="Brak zapisanych zmian."
            />
            {rows.map((item) => (
                <article className={c.section} key={item.id}>
                    <h3>{actionLabel(item.action)}</h3>
                    <p className={c.hint}>
                        {item.manager
                            ? `${item.manager.name} ${item.manager.surname}`
                            : `Pracownik #${item.managerId}`}{' '}
                        ·{' '}
                        {new Date(item.createdAt).toLocaleString('pl-PL', {
                            timeZone: 'Europe/Warsaw',
                        })}
                    </p>
                    {item.fields.length > 0 && (
                        <p className={c.hint}>
                            Pola:{' '}
                            {item.fields
                                .map((field) => fieldLabels[field] ?? field)
                                .join(', ')}
                        </p>
                    )}
                </article>
            ))}
            {query.hasNextPage && (
                <Button
                    type="button"
                    pending={query.isFetchingNextPage}
                    onClick={() => void query.fetchNextPage()}
                >
                    Pokaż starsze zmiany
                </Button>
            )}
        </section>
    )
}
