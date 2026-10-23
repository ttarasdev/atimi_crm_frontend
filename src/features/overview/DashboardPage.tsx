'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
    ArrowUpRight,
    Bell,
    BriefcaseBusiness,
    CalendarDays,
    Flag,
    Files,
    ListChecks,
    Plus,
    StickyNote,
    Users,
    RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button/Button'
import { ThemedIcon } from '@/components/theme-components/themed-icon/ThemedIcon'
import { useAuth } from '@/shared/hooks/useAuth'
import { useRoles } from '@/shared/hooks/useRoles'
import { useCrmOverview, useCrmStatistics } from '@/shared/hooks/useCrmOverview'
import { GrowthChart } from './statistics-charts/StatisticsCharts'
import { clientStatuses, overviewDate } from './overview-labels'
import c from './Overview.module.scss'

export function DashboardPage() {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000)

        return () => window.clearInterval(timer)
    }, [])

    const { manager } = useAuth()

    const { hasRole } = useRoles()

    const isAdmin = hasRole('admin')

    const query = useCrmOverview()

    const statistics = useCrmStatistics({ months: 6 }, isAdmin)

    const data = query.data

    const time = (value: string) =>
        new Intl.DateTimeFormat('pl-PL', {
            timeZone: data?.timeZone ?? 'Europe/Warsaw',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value))

    return (
        <section className={c.page} aria-label="Pulpit">
            <header className={c.heading}>
                <div>
                    <span className={c.eyebrow}>TWÓJ DZIEŃ W CRM</span>
                    <h1>Dzień dobry, {manager?.name}</h1>
                    <p>
                        {new Intl.DateTimeFormat('pl-PL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            timeZone: data?.timeZone ?? 'Europe/Warsaw',
                        }).format(new Date())}
                    </p>
                </div>
                <div className={c.headingActions}>
                    <Button
                        type="button"
                        aria-label="Odśwież pulpit"
                        disabled={
                            query.isFetching ||
                            (isAdmin && statistics.isFetching)
                        }
                        onClick={() => {
                            void query.refetch()

                            if (isAdmin) void statistics.refetch()
                        }}
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                    </Button>
                    <Link
                        className={c.primaryLink}
                        href="/main/clients?create=1"
                    >
                        <Plus size={16} />
                        Dodaj klienta
                    </Link>
                </div>
            </header>
            {query.isPending && (
                <div className={c.empty} role="status">
                    Przygotowujemy Twój pulpit…
                </div>
            )}
            {query.isError && (
                <div className={c.error} role="alert">
                    Nie udało się wczytać pulpitu.{' '}
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
                        aria-label="Podsumowanie dnia"
                    >
                        <Link href="/main/clients">
                            <Users size={20} />
                            <span>Moi klienci</span>
                            <strong>{data.counts.clients}</strong>
                            <small>W aktywnej przestrzeni</small>
                        </Link>
                        <Link href="/main/clients">
                            <BriefcaseBusiness size={20} />
                            <span>Otwarte sprawy</span>
                            <strong>{data.counts.activeProcesses}</strong>
                            <small>Praca z klientami</small>
                        </Link>
                        <Link href="/main/clients">
                            <ListChecks size={20} />
                            <span>Zadania w etapach</span>
                            <strong>{data.counts.openTasks}</strong>
                            <small>Do wykonania</small>
                        </Link>
                        <Link href="/main/calendar">
                            <CalendarDays size={20} />
                            <span>Plan na dziś</span>
                            <strong>{data.counts.eventsToday}</strong>
                            <small>
                                Podgląd{' '}
                                {data.events.length >= 8
                                    ? '8 najbliższych pozycji'
                                    : 'wydarzeń i zadań'}
                            </small>
                        </Link>
                    </div>
                    <div className={c.dashboardGrid}>
                        <article className={c.card}>
                            <header>
                                <h2>
                                    <CalendarDays size={18} />
                                    Plan dnia
                                </h2>
                                <Link href="/main/calendar">
                                    Kalendarz
                                    <ArrowUpRight size={14} />
                                </Link>
                            </header>
                            <div className={c.rows}>
                                {data.events.map((event) => (
                                    <Link
                                        className={c.event}
                                        href="/main/calendar"
                                        key={event.id}
                                        style={
                                            {
                                                '--item-color': event.color,
                                            } as React.CSSProperties
                                        }
                                    >
                                        <span className={c.eventIcon}>
                                            <ThemedIcon
                                                iconId={event.iconId}
                                                size={23}
                                            />
                                        </span>
                                        <div>
                                            <strong
                                                className={
                                                    event.isDone
                                                        ? c.done
                                                        : undefined
                                                }
                                            >
                                                {event.title}
                                            </strong>
                                            <small>
                                                {event.startAt
                                                    ? `${time(event.startAt)}–${event.endAt ? time(event.endAt) : ''}`
                                                    : 'Bez godziny'}
                                                {event.isDone
                                                    ? ' · Wykonane'
                                                    : ''}
                                            </small>
                                        </div>
                                        <ArrowUpRight size={14} />
                                    </Link>
                                ))}
                                {!data.events.length && (
                                    <p className={c.emptySmall}>
                                        Masz dziś wolne miejsce w kalendarzu.
                                    </p>
                                )}
                            </div>
                        </article>
                        <article className={c.card}>
                            <header>
                                <h2>
                                    <ListChecks size={18} />
                                    Następne kroki
                                </h2>
                                <Link href="/main/clients">
                                    Sprawy
                                    <ArrowUpRight size={14} />
                                </Link>
                            </header>
                            <div className={c.rows}>
                                {data.tasks.map((task) => (
                                    <Link
                                        href={`/main/clients/${task.clientId}`}
                                        key={task.id}
                                        className={c.task}
                                    >
                                        <span
                                            className={c.taskDot}
                                            style={{ borderColor: task.color }}
                                        />
                                        <div>
                                            <strong>{task.title}</strong>
                                            <small>
                                                {task.clientName} ·{' '}
                                                {task.stageTitle}
                                            </small>
                                        </div>
                                        <ArrowUpRight size={14} />
                                    </Link>
                                ))}
                                {!data.tasks.length && (
                                    <p className={c.emptySmall}>
                                        Wszystkie bieżące zadania w etapach są
                                        wykonane.
                                    </p>
                                )}
                            </div>
                        </article>
                        <article className={c.card}>
                            <header>
                                <h2>
                                    <Flag size={18} />
                                    Ważne terminy
                                </h2>
                                <Link href="/main/calendar/deadlines">
                                    Wszystkie
                                    <ArrowUpRight size={14} />
                                </Link>
                            </header>
                            <div className={c.rows}>
                                {data.deadlines.map((deadline) => (
                                    <Link
                                        href={
                                            deadline.clientId
                                                ? `/main/clients/${deadline.clientId}`
                                                : '/main/calendar/deadlines'
                                        }
                                        key={deadline.id}
                                        className={c.deadline}
                                    >
                                        <div>
                                            <strong>{deadline.title}</strong>
                                            <small
                                                className={
                                                    new Date(
                                                        deadline.dueAt,
                                                    ).getTime() < now
                                                        ? c.overdue
                                                        : undefined
                                                }
                                            >
                                                {overviewDate(
                                                    deadline.dueAt,
                                                    data.timeZone,
                                                )}
                                                {new Date(
                                                    deadline.dueAt,
                                                ).getTime() < now
                                                    ? ' · Po terminie'
                                                    : ''}
                                            </small>
                                        </div>
                                        <ArrowUpRight size={14} />
                                    </Link>
                                ))}
                                {!data.deadlines.length && (
                                    <p className={c.emptySmall}>
                                        Brak otwartych terminów.
                                    </p>
                                )}
                            </div>
                        </article>
                        <article className={c.card}>
                            <header>
                                <h2>
                                    <Users size={18} />
                                    Ostatnio u klientów
                                </h2>
                                <Link href="/main/clients">
                                    Lista
                                    <ArrowUpRight size={14} />
                                </Link>
                            </header>
                            <div className={c.rows}>
                                {data.clients.map((client) => (
                                    <Link
                                        href={`/main/clients/${client.id}`}
                                        key={client.id}
                                        className={c.client}
                                    >
                                        <span className={c.initials}>
                                            {client.name[0]}
                                            {client.surname?.[0]}
                                        </span>
                                        <div>
                                            <strong>
                                                {client.name} {client.surname}
                                            </strong>
                                            <small>
                                                {client.priority === 'vip'
                                                    ? 'VIP · '
                                                    : client.priority === 'high'
                                                      ? 'Wysoki priorytet · '
                                                      : ''}
                                                {overviewDate(
                                                    client.updatedAt,
                                                    data.timeZone,
                                                    false,
                                                )}
                                            </small>
                                        </div>
                                        <span
                                            className={c.status}
                                            style={{
                                                color: clientStatuses[
                                                    client.status
                                                ]?.color,
                                            }}
                                        >
                                            {clientStatuses[client.status]
                                                ?.title ?? client.status}
                                        </span>
                                    </Link>
                                ))}
                                {!data.clients.length && (
                                    <p className={c.emptySmall}>
                                        Dodaj pierwszego klienta, aby rozpocząć.
                                    </p>
                                )}
                            </div>
                        </article>
                        {data.reminders.length > 0 && (
                            <article className={c.card}>
                                <header>
                                    <h2>
                                        <Bell size={18} />
                                        Przypomnienia na dziś
                                    </h2>
                                    <Link href="/main/calendar/reminders">
                                        Wszystkie
                                        <ArrowUpRight size={14} />
                                    </Link>
                                </header>
                                <div className={c.rows}>
                                    {data.reminders.map((reminder) => (
                                        <Link
                                            className={c.task}
                                            href="/main/calendar/reminders"
                                            key={reminder.id}
                                        >
                                            <Bell size={16} />
                                            <div>
                                                <strong>
                                                    {reminder.title}
                                                </strong>
                                                <small>
                                                    {time(reminder.remindAt)}
                                                </small>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </article>
                        )}
                        <article className={c.card}>
                            <header>
                                <h2>Moja biblioteka</h2>
                            </header>
                            <div className={c.library}>
                                <Link href="/main/notes">
                                    <StickyNote size={21} />
                                    <div>
                                        <strong>Notatki</strong>
                                        <small>
                                            {data.counts.notes} osobistych
                                            notatek
                                        </small>
                                    </div>
                                    <ArrowUpRight size={14} />
                                </Link>
                                <Link href="/main/documents">
                                    <Files size={21} />
                                    <div>
                                        <strong>Dokumenty</strong>
                                        <small>
                                            {data.counts.documents} plików w
                                            Twojej bibliotece
                                        </small>
                                    </div>
                                    <ArrowUpRight size={14} />
                                </Link>
                            </div>
                        </article>
                    </div>
                </>
            )}
            {data && query.isFetching && (
                <p role="status" className={c.muted}>
                    Odświeżanie pulpitu…
                </p>
            )}
            {isAdmin && statistics.data && (
                <article className={c.card}>
                    <header>
                        <div>
                            <span className={c.eyebrow}>
                                TYLKO DLA ADMINISTRATORA
                            </span>
                            <h2>Wyniki zespołu</h2>
                        </div>
                        <Link href="/main/reports">
                            Pełne statystyki
                            <ArrowUpRight size={14} />
                        </Link>
                    </header>
                    <GrowthChart data={statistics.data.monthly} compact />
                </article>
            )}
            {isAdmin && statistics.isError && (
                <p className={c.error} role="alert">
                    Nie udało się wczytać wyników zespołu.{' '}
                    <Button
                        onClick={() => {
                            void statistics.refetch()
                        }}
                    >
                        Odśwież wyniki
                    </Button>
                </p>
            )}
        </section>
    )
}
