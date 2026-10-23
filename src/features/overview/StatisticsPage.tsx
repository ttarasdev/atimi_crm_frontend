'use client'

import { useState } from 'react'
import {
    ChartNoAxesCombined,
    CheckCheck,
    Users,
    BriefcaseBusiness,
    RefreshCw,
} from 'lucide-react'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { Button } from '@/components/ui/button/Button'
import { RoleGuard } from '@/shared/guards/RoleGuard'
import { useCrmStatistics } from '@/shared/hooks/useCrmOverview'
import { useInfiniteManagers } from '@/shared/hooks/useManagers'
import {
    GrowthChart,
    SourcesChart,
    StatusChart,
} from './statistics-charts/StatisticsCharts'
import type { CrmStatistics } from '@/api/crm-overview/crm-overview.types'
import {
    clientPaymentStatuses,
    paymentAmountLabel,
} from '@/features/clients/client-labels'
import { clientStatuses, processStatuses } from './overview-labels'
import c from './Overview.module.scss'

export function StatisticsPage() {
    return (
        <RoleGuard allowedRoles={['admin']}>
            <StatisticsContent />
        </RoleGuard>
    )
}

function StatisticsContent() {
    const [months, setMonths] = useState(6)

    const [managerId, setManagerId] = useState<number | null>(null)

    const query = useCrmStatistics({
        months,
        managerId: managerId ?? undefined,
    })

    const managers = useInfiniteManagers({})

    const data = query.data

    const clients = data?.clients.reduce((sum, row) => sum + row.total, 0) ?? 0

    const processes =
        data?.processes.reduce((sum, row) => sum + row.total, 0) ?? 0

    const completed =
        data?.processes.find((row) => row.key === 'completed')?.total ?? 0

    return (
        <section className={c.page} aria-label="Statystyki">
            <header className={c.heading}>
                <div>
                    <span className={c.eyebrow}>WYNIKI ZESPOŁU</span>
                    <h1>Statystyki</h1>
                    <p>Klienci, sprawy i postęp pracy w jednym miejscu.</p>
                </div>
                <Button
                    disabled={query.isFetching}
                    onClick={() => {
                        void query.refetch()
                    }}
                >
                    <RefreshCw size={15} />
                    Odśwież
                </Button>
            </header>
            <div className={c.filters}>
                <FormSelect
                    selectTitle="Okres wykresu"
                    value={months}
                    onChange={setMonths}
                    options={[
                        { title: 'Ostatnie 3 miesiące', value: 3 },
                        { title: 'Ostatnie 6 miesięcy', value: 6 },
                        { title: 'Ostatnie 12 miesięcy', value: 12 },
                    ]}
                />
                <FormSelect
                    selectTitle="Pracownik"
                    disabled={managers.isPending}
                    value={managerId}
                    onChange={setManagerId}
                    options={[
                        { title: 'Cały zespół', value: null },
                        ...(
                            managers.data?.pages.flatMap((page) => page.rows) ??
                            []
                        ).map((manager) => ({
                            title: `${manager.name} ${manager.surname}`,
                            value: manager.id,
                        })),
                    ]}
                />
                {managers.hasNextPage && (
                    <Button
                        onClick={() => {
                            void managers.fetchNextPage()
                        }}
                        pending={managers.isFetchingNextPage}
                    >
                        Więcej pracowników
                    </Button>
                )}
            </div>
            {managers.isError && (
                <div className={c.error} role="alert">
                    Nie udało się wczytać listy pracowników.{' '}
                    <Button
                        type="button"
                        onClick={() => void managers.refetch()}
                    >
                        Ponów listę pracowników
                    </Button>
                </div>
            )}
            {data && query.isFetching && (
                <p className={c.muted} role="status">
                    Odświeżanie statystyk…
                </p>
            )}
            {query.isPending && (
                <div className={c.empty} role="status">
                    Wczytywanie statystyk…
                </div>
            )}
            {query.isError && (
                <div className={c.error} role="alert">
                    Nie udało się wczytać statystyk.{' '}
                    <Button
                        onClick={() => {
                            void query.refetch()
                        }}
                    >
                        Spróbuj ponownie
                    </Button>
                </div>
            )}
            {data && (
                <>
                    <div
                        className={c.metrics}
                        role="group"
                        aria-label="Podsumowanie statystyk"
                    >
                        <div>
                            <Users size={20} />
                            <span>Klienci</span>
                            <strong>{clients}</strong>
                            <small>{data.archivedClients} w archiwum</small>
                        </div>
                        <div>
                            <BriefcaseBusiness size={20} />
                            <span>Wszystkie sprawy</span>
                            <strong>{processes}</strong>
                            <small>
                                {data.processes.find(
                                    (row) => row.key === 'active',
                                )?.total ?? 0}{' '}
                                w toku
                            </small>
                        </div>
                        <div>
                            <CheckCheck size={20} />
                            <span>Zakończone sprawy</span>
                            <strong>{completed}</strong>
                            <small>
                                {processes
                                    ? Math.round((completed / processes) * 100)
                                    : 0}
                                % wszystkich spraw
                            </small>
                        </div>
                        <div>
                            <ChartNoAxesCombined size={20} />
                            <span>Wykonane zadania</span>
                            <strong>{data.tasks.done}</strong>
                            <small>{data.tasks.open} do wykonania</small>
                        </div>
                    </div>
                    {data.paymentStats && (
                        <PaymentStatistics payments={data.paymentStats} />
                    )}
                    <div className={c.chartGrid}>
                        <article className={`${c.card} ${c.wide}`}>
                            <header>
                                <div>
                                    <h2>Klienci i zakończone sprawy</h2>
                                    <p>
                                        Nowe kontakty i zamknięte sprawy w
                                        wybranym okresie.
                                    </p>
                                </div>
                            </header>
                            <GrowthChart data={data.monthly} />
                        </article>
                        <article className={c.card}>
                            <header>
                                <h2>Statusy klientów</h2>
                            </header>
                            <StatusChart data={data.clients} />
                            <div className={c.statusNumbers}>
                                {data.clients.map((row) => (
                                    <span
                                        key={row.key}
                                        style={{
                                            color: clientStatuses[row.key]
                                                ?.color,
                                        }}
                                    >
                                        {clientStatuses[row.key]?.title ??
                                            row.key}
                                        <strong>{row.total}</strong>
                                    </span>
                                ))}
                            </div>
                        </article>
                        <article className={c.card}>
                            <header>
                                <h2>Skąd trafiają klienci?</h2>
                            </header>
                            <SourcesChart data={data.sources} />
                        </article>
                    </div>
                    <article className={c.card}>
                        <header>
                            <h2>Obciążenie zespołu</h2>
                            <span className={c.muted}>
                                Bieżąca liczba klientów
                            </span>
                        </header>
                        <div className={c.teamTable}>
                            <div className={c.tableHeading}>
                                <span>Pracownik</span>
                                <span>Klienci</span>
                                <span>Aktywni</span>
                                <span>Zakończeni</span>
                            </div>
                            {data.managers.map((manager) => (
                                <div key={manager.id}>
                                    <span>
                                        <strong>
                                            {manager.name} {manager.surname}
                                        </strong>
                                        <small>
                                            {manager.status === 'active'
                                                ? 'Aktywny'
                                                : manager.status === 'blocked'
                                                  ? 'Zablokowany'
                                                  : manager.status ===
                                                      'archived'
                                                    ? 'Archiwalny'
                                                    : 'Oczekuje na potwierdzenie'}
                                        </small>
                                    </span>
                                    <strong>{manager.total}</strong>
                                    <span>{manager.active}</span>
                                    <span>{manager.completed}</span>
                                </div>
                            ))}
                            {!data.managers.length && (
                                <p className={c.emptySmall}>
                                    Brak pracowników w tym zestawieniu.
                                </p>
                            )}
                        </div>
                    </article>
                    <p className={c.muted}>
                        Statusy i obciążenie pokazują stan bieżący. Wykres
                        miesięczny pokazuje daty utworzenia klientów i
                        zakończenia spraw.{' '}
                        {data.processes
                            .map(
                                (row) =>
                                    `${processStatuses[row.key] ?? row.key}: ${row.total}`,
                            )
                            .join(' · ')}
                    </p>
                </>
            )}
        </section>
    )
}

function PaymentStatistics({
    payments,
}: {
    payments: CrmStatistics['paymentStats']
}) {
    return (
        <section className={c.paymentSection} aria-label="Płatności klientów">
            <header>
                <h2>Aktualny stan płatności</h2>
                <p>
                    Stan bieżący niearchiwalnych klientów. Waluty liczone
                    osobno, bez przeliczania; okres wykresu nie zmienia tych
                    kwot.
                </p>
            </header>
            <div className={c.paymentCounts}>
                {payments.statuses.map((row) => (
                    <span
                        key={row.key}
                        style={{ color: clientPaymentStatuses[row.key].color }}
                    >
                        {clientPaymentStatuses[row.key].title}
                        <strong>{row.total}</strong>
                    </span>
                ))}
            </div>
            <p className={c.muted}>
                Bez podanej kwoty: {payments.unknownAmountCount} klientów.
            </p>
            <div className={c.paymentGrid}>
                {payments.currencies.map((row) => (
                    <article
                        className={c.card}
                        key={row.currency}
                        aria-label={`Płatności ${row.currency}`}
                    >
                        <header>
                            <h3>
                                {row.currency === 'PLN'
                                    ? 'PLN · zł'
                                    : row.currency}
                            </h3>
                            <span>{row.total} klientów</span>
                        </header>
                        <dl className={c.paymentAmounts}>
                            <div>
                                <dt>Łączna wartość usług</dt>
                                <dd>
                                    {paymentAmountLabel(
                                        row.totalAmount,
                                        row.currency,
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>Otrzymano z w pełni opłaconych</dt>
                                <dd className={c.paymentPaid}>
                                    {paymentAmountLabel(
                                        row.fullyPaidAmount,
                                        row.currency,
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>W całości nieopłacone</dt>
                                <dd className={c.paymentUnpaid}>
                                    {paymentAmountLabel(
                                        row.unpaidAmount,
                                        row.currency,
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>Wartość usług częściowo opłaconych</dt>
                                <dd className={c.paymentPartial}>
                                    {paymentAmountLabel(
                                        row.partialAmount,
                                        row.currency,
                                    )}
                                </dd>
                            </div>
                        </dl>
                        <p className={c.muted}>
                            Bez kwoty w tej walucie: {row.unknownAmountCount}.
                        </p>
                    </article>
                ))}
            </div>
            {!payments.currencies.length && (
                <p className={c.muted}>Brak danych o płatnościach.</p>
            )}
            <p className={c.muted}>
                Dla częściowo opłaconych usług nie zapisujemy podziału na
                wpłaconą i pozostałą kwotę. Nie są one wliczane do otrzymanych
                ani w całości nieopłaconych kwot. Komentarze nie są przeliczane
                na wpłaty.
            </p>
        </section>
    )
}
