'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
    Bell,
    CalendarDays,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Flag,
    List,
    LoaderCircle,
    MailX,
    Plus,
    X,
} from 'lucide-react'
import type {
    CalendarEntry,
    CalendarEntryKind,
    CalendarEventWarning,
} from '@/api/calendars/calendars.types'
import { Button } from '@/components/ui/button/Button'
import { Popup } from '@/components/ui/popup/Popup'
import {
    useInfiniteCalendarEntries,
    useCalendar,
} from '@/shared/hooks/useCalendar'
import { useAuth } from '@/shared/hooks/useAuth'
import { useManager } from '@/shared/hooks/useManagers'
import { CalendarEntriesList } from '../calendar-entries-list/CalendarEntriesList'
import { CalendarEntryDetails } from '../calendar-entry-details/CalendarEntryDetails'
import { CalendarEntryForm } from '../calendar-entry-form/CalendarEntryForm'
import { CalendarDeleteForm } from '../calendar-delete-form/CalendarDeleteForm'
import { CalendarMonthPicker } from '../calendar-month-picker/CalendarMonthPicker'
import { CalendarTimeline } from '../calendar-timeline/CalendarTimeline'
import { calendarDateLabel, calendarDateParts } from '../calendar-date'
import {
    addCalendarDays,
    calendarDayLabel,
    calendarEntryDate,
    calendarEntryColor,
    calendarEntryOverdue,
    calendarMonthLabel,
    calendarWeekStart,
    isCalendarDateInRange,
} from '../calendar-view'
import c from './CalendarPage.module.scss'

type CalendarTab = 'events' | 'reminders' | 'deadlines'

type CalendarView = 'week' | 'day' | 'list'

type CalendarPopup =
    | { mode: 'choose' }
    | { mode: 'date' }
    | { mode: 'entries'; entries: CalendarEntry[] }
    | { mode: 'create'; kind: CalendarEntryKind; date: string }
    | { mode: 'details' | 'edit' | 'delete'; entry: CalendarEntry }

const tabs = [
    {
        key: 'events',
        title: 'Kalendarz',
        href: '/main/calendar',
        icon: CalendarDays,
    },
    {
        key: 'reminders',
        title: 'Przypomnienia',
        href: '/main/calendar/reminders',
        icon: Bell,
    },
    {
        key: 'deadlines',
        title: 'Terminy',
        href: '/main/calendar/deadlines',
        icon: Flag,
    },
] as const

const kinds = [
    {
        kind: 'event',
        title: 'Wydarzenie',
        description: 'Godziny lub zadanie bez godziny',
        icon: CalendarDays,
    },
    {
        kind: 'reminder',
        title: 'Przypomnienie',
        description: 'E-mail w wybranym dniu i godzinie',
        icon: Bell,
    },
    {
        kind: 'deadline',
        title: 'Termin',
        description: 'Dokładny termin i wcześniejsze przypomnienia',
        icon: Flag,
    },
] as const

function subscribeMobile(callback: () => void) {
    const query = window.matchMedia('(max-width: 800px)')

    query.addEventListener('change', callback)

    return () => query.removeEventListener('change', callback)
}

function popupTitle(popup: CalendarPopup) {
    if (popup.mode === 'choose') return 'Nowy wpis'

    if (popup.mode === 'date') return 'Wybierz datę'

    if (popup.mode === 'entries') return 'Wpisy w kalendarzu'

    const kind = popup.mode === 'create' ? popup.kind : popup.entry.kind

    if (popup.mode === 'delete') return 'Usunąć wpis?'

    if (popup.mode === 'details')
        return kind === 'event'
            ? 'Wydarzenie'
            : kind === 'reminder'
              ? 'Przypomnienie'
              : 'Termin'

    if (popup.mode === 'edit')
        return kind === 'event'
            ? 'Edytuj wydarzenie'
            : kind === 'reminder'
              ? 'Edytuj przypomnienie'
              : 'Edytuj termin'

    return kind === 'event'
        ? 'Nowe wydarzenie'
        : kind === 'reminder'
          ? 'Nowe przypomnienie'
          : 'Nowy termin'
}

export function CalendarPage({
    initialTab = 'events',
    managerId,
}: {
    initialTab?: CalendarTab
    managerId?: number
}) {
    const auth = useAuth()

    const worker = useManager(managerId ?? null)

    const manager = managerId === undefined ? auth.manager : worker.data

    const basePath =
        managerId === undefined
            ? '/main/calendar'
            : `/main/managers/${managerId}/calendar`

    const searchParams = useSearchParams()

    const routeDate = searchParams.get('date')

    const mine = useCalendar(managerId)

    const calendar = mine.data

    const timeZone = calendar?.timeZone ?? 'Europe/Warsaw'

    const [now, setNow] = useState(() => Date.now())

    const [selectedDate, setSelectedDate] = useState<string | null>(null)

    const [selectedView, setSelectedView] = useState<CalendarView | null>(null)

    const [overdue, setOverdue] = useState(false)

    const [popup, setPopup] = useState<CalendarPopup | null>(null)

    const [pending, setPending] = useState(false)

    const [warnings, setWarnings] = useState<CalendarEventWarning[]>([])

    const section = useRef<HTMLElement>(null)

    const mobile = useSyncExternalStore(
        subscribeMobile,
        () => window.matchMedia('(max-width: 800px)').matches,
        () => false,
    )

    const view =
        selectedView === 'week' && mobile
            ? 'day'
            : (selectedView ?? (mobile ? 'day' : 'week'))

    const today = calendarDateParts(now, timeZone).date

    const date =
        selectedDate ??
        (routeDate && isCalendarDateInRange(routeDate) ? routeDate : today)

    const weekStart = calendarWeekStart(date)

    const dates = Array.from({ length: 7 }, (_, index) =>
        addCalendarDays(weekStart, index),
    )

    const overdueMode = initialTab === 'deadlines' && overdue

    const query = useInfiniteCalendarEntries(calendar?.id ?? null, {
        from: overdueMode
            ? addCalendarDays(today, 1)
            : isCalendarDateInRange(weekStart)
              ? weekStart
              : '1000-01-01',
        to: overdueMode
            ? addCalendarDays(today, 1)
            : isCalendarDateInRange(dates[6])
              ? dates[6]
              : '9999-12-31',
        kind:
            initialTab === 'reminders'
                ? 'reminder'
                : initialTab === 'deadlines'
                  ? 'deadline'
                  : undefined,
        overdue: overdueMode,
    })

    const { hasNextPage, isFetching, isError, fetchNextPage } = query

    useEffect(() => {
        if (hasNextPage && !isFetching && !isError) void fetchNextPage()
    }, [
        hasNextPage,
        isFetching,
        isError,
        fetchNextPage,
        query.data?.pages.length,
    ])

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60000)

        return () => window.clearInterval(timer)
    }, [])

    const entries = Array.from(
        new Map(
            (query.data?.pages.flatMap((page) => page.rows) ?? [])
                .filter(
                    (entry) =>
                        !overdueMode ||
                        calendarEntryOverdue(entry, now, timeZone),
                )
                .map((entry) => [`${entry.kind}-${entry.id}`, entry]),
        ).values(),
    ).sort((first, second) => first.at - second.at || first.id - second.id)

    const visibleEntries =
        initialTab === 'events' && view === 'day'
            ? entries.filter(
                  (entry) =>
                      calendarEntryDate(entry, timeZone) === date ||
                      (entry.kind === 'event' && entry.weekStart === weekStart),
              )
            : entries

    const weeklyEntries = visibleEntries.filter(
        (entry) => entry.kind === 'event' && entry.weekStart,
    )

    const dailyEntries = visibleEntries.filter(
        (entry) => entry.kind !== 'event' || !entry.weekStart,
    )

    function closePopup() {
        if (!pending) setPopup(null)
    }

    function create(date: string) {
        setWarnings([])

        setPopup({
            mode: 'create',
            kind:
                initialTab === 'reminders'
                    ? 'reminder'
                    : initialTab === 'deadlines'
                      ? 'deadline'
                      : 'event',
            date,
        })
    }

    function saved(newWarnings?: CalendarEventWarning[]) {
        setWarnings(newWarnings ?? [])

        setPending(false)

        setPopup(null)
    }

    const ready = !!calendar && !!query.data

    return (
        <section
            ref={section}
            className={c.page}
            aria-label={
                managerId === undefined
                    ? 'Mój kalendarz'
                    : 'Kalendarz pracownika'
            }
            tabIndex={-1}
        >
            <header className={c.header}>
                <div>
                    <h1>
                        {initialTab === 'events'
                            ? 'Kalendarz'
                            : initialTab === 'reminders'
                              ? 'Przypomnienia'
                              : 'Terminy'}
                    </h1>
                    <p>
                        {initialTab === 'events'
                            ? managerId === undefined
                                ? 'Twój plan dnia i tygodnia'
                                : `Plan dnia i tygodnia · ${manager ? `${manager.name} ${manager.surname}` : 'pracownik'}`
                            : initialTab === 'reminders'
                              ? 'E-maile przypominające o ważnych sprawach'
                              : 'Ważne daty i sprawy do dopilnowania'}
                    </p>
                </div>
                <Button
                    type="button"
                    className={c.create}
                    disabled={!calendar}
                    onClick={() =>
                        initialTab === 'events'
                            ? setPopup({ mode: 'choose' })
                            : create(date)
                    }
                >
                    <Plus size={17} aria-hidden="true" />
                    {initialTab === 'events'
                        ? 'Dodaj wpis'
                        : initialTab === 'reminders'
                          ? 'Dodaj przypomnienie'
                          : 'Dodaj termin'}
                </Button>
            </header>
            <div className={c.block}>
                <nav className={c.tabs} aria-label="Widoki kalendarza">
                    {tabs.map(({ key, title, href, icon: Icon }) => (
                        <Link
                            key={key}
                            href={`${managerId === undefined ? href : key === 'events' ? basePath : `${basePath}/${key}`}?date=${date}`}
                            className={key === initialTab ? c.selectedTab : ''}
                            aria-current={
                                key === initialTab ? 'page' : undefined
                            }
                        >
                            <Icon size={15} aria-hidden="true" />
                            <span>{title}</span>
                        </Link>
                    ))}
                </nav>
                <div className={c.toolbar}>
                    <Button
                        type="button"
                        className={c.month}
                        onClick={() => setPopup({ mode: 'date' })}
                        aria-label="Wybierz datę"
                    >
                        <CalendarDays size={16} aria-hidden="true" />
                        <span>{calendarMonthLabel(date)}</span>
                        <ChevronDown size={14} aria-hidden="true" />
                    </Button>
                    <div className={c.dateNavigation}>
                        <Button
                            type="button"
                            className={c.arrow}
                            aria-label="Poprzedni okres"
                            disabled={
                                !isCalendarDateInRange(
                                    addCalendarDays(
                                        date,
                                        initialTab === 'events' &&
                                            view === 'day'
                                            ? -1
                                            : -7,
                                    ),
                                )
                            }
                            onClick={() =>
                                setSelectedDate(
                                    addCalendarDays(
                                        date,
                                        initialTab === 'events' &&
                                            view === 'day'
                                            ? -1
                                            : -7,
                                    ),
                                )
                            }
                        >
                            <ChevronLeft size={17} aria-hidden="true" />
                        </Button>
                        <Button
                            type="button"
                            className={c.current}
                            onClick={() => setSelectedDate(today)}
                        >
                            Dzisiaj
                        </Button>
                        <Button
                            type="button"
                            className={c.arrow}
                            aria-label="Następny okres"
                            disabled={
                                !isCalendarDateInRange(
                                    addCalendarDays(
                                        date,
                                        initialTab === 'events' &&
                                            view === 'day'
                                            ? 1
                                            : 7,
                                    ),
                                )
                            }
                            onClick={() =>
                                setSelectedDate(
                                    addCalendarDays(
                                        date,
                                        initialTab === 'events' &&
                                            view === 'day'
                                            ? 1
                                            : 7,
                                    ),
                                )
                            }
                        >
                            <ChevronRight size={17} aria-hidden="true" />
                        </Button>
                    </div>
                    {initialTab === 'events' && (
                        <div
                            className={c.views}
                            aria-label="Sposób wyświetlania"
                        >
                            {(['week', 'day', 'list'] as const)
                                .filter((item) => !mobile || item !== 'week')
                                .map((item) => (
                                    <Button
                                        type="button"
                                        key={item}
                                        className={
                                            view === item ? c.activeView : ''
                                        }
                                        aria-pressed={view === item}
                                        onClick={() => setSelectedView(item)}
                                    >
                                        {item === 'week' ? (
                                            'Tydzień'
                                        ) : item === 'day' ? (
                                            'Dzień'
                                        ) : (
                                            <>
                                                <List
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                                Lista
                                            </>
                                        )}
                                    </Button>
                                ))}
                        </div>
                    )}
                </div>
                <div className={c.caption}>
                    <strong>
                        {overdueMode
                            ? 'Otwarte terminy, które minęły'
                            : initialTab === 'events' && view === 'day'
                              ? calendarDayLabel(date)
                              : `${calendarDayLabel(weekStart, true)} – ${calendarDayLabel(dates[6], true)}`}
                    </strong>
                    <div className={c.captionMeta}>
                        <span>
                            {calendar
                                ? calendar.timeZone.replaceAll('_', ' ')
                                : 'Wczytywanie…'}
                        </span>
                        {manager?.remindersEnabled === false && (
                            <Link
                                href={
                                    managerId === undefined
                                        ? '/main/profile'
                                        : '/main/managers'
                                }
                                className={c.emailOff}
                                title="Wszystkie powiadomienia e-mail z kalendarza są wyłączone w profilu"
                            >
                                <MailX size={12} aria-hidden="true" />
                                E-mail wyłączony
                            </Link>
                        )}
                    </div>
                </div>
                {initialTab === 'deadlines' && (
                    <div className={c.filters}>
                        <Button
                            type="button"
                            aria-pressed={!overdue}
                            className={!overdue ? c.activeView : ''}
                            onClick={() => setOverdue(false)}
                        >
                            Wybrany tydzień
                        </Button>
                        <Button
                            type="button"
                            aria-pressed={overdue}
                            className={overdue ? c.activeView : ''}
                            onClick={() => setOverdue(true)}
                        >
                            Po terminie
                        </Button>
                    </div>
                )}
                {initialTab === 'events' && view === 'day' && (
                    <div className={c.weekStrip} aria-label="Dni tygodnia">
                        {dates.map((value) => (
                            <button
                                type="button"
                                key={value}
                                aria-label={`Wybierz dzień: ${calendarDateLabel(value)}`}
                                aria-pressed={date === value}
                                disabled={!isCalendarDateInRange(value)}
                                className={date === value ? c.selectedDay : ''}
                                onClick={() => setSelectedDate(value)}
                            >
                                <span>
                                    {new Intl.DateTimeFormat('pl-PL', {
                                        timeZone: 'UTC',
                                        weekday: 'short',
                                    }).format(new Date(`${value}T12:00:00Z`))}
                                </span>
                                <strong>{Number(value.slice(-2))}</strong>
                                <span className={c.dots} aria-hidden="true">
                                    {Array.from(
                                        new Set(
                                            entries
                                                .filter(
                                                    (entry) =>
                                                        (entry.kind !==
                                                            'event' ||
                                                            !entry.weekStart) &&
                                                        calendarEntryDate(
                                                            entry,
                                                            timeZone,
                                                        ) === value,
                                                )
                                                .map((entry) => entry.kind),
                                        ),
                                    ).map((kind) => (
                                        <i
                                            key={kind}
                                            className={
                                                kind === 'deadline'
                                                    ? c.deadlineDot
                                                    : ''
                                            }
                                        />
                                    ))}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                {warnings.length > 0 && (
                    <div className={c.warning} role="status">
                        <p>
                            Wpis zapisany. Czas nakłada się na:{' '}
                            {warnings
                                .map((warning) => warning.event.title)
                                .join(', ')}
                            .
                        </p>
                        <button
                            type="button"
                            aria-label="Zamknij ostrzeżenie"
                            onClick={() => setWarnings([])}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                )}
                {(mine.isPending || (!!calendar && query.isPending)) && (
                    <p className={c.state} role="status">
                        <LoaderCircle
                            size={18}
                            className={c.spinner}
                            aria-hidden="true"
                        />
                        Wczytywanie kalendarza…
                    </p>
                )}
                {(mine.isError || (!!calendar && query.isError)) && (
                    <div className={c.error} role="alert">
                        <p>Nie udało się wczytać kalendarza.</p>
                        <Button
                            type="button"
                            onClick={() => {
                                if (mine.isError) void mine.refetch()
                                else void query.refetch()
                            }}
                        >
                            Spróbuj ponownie
                        </Button>
                    </div>
                )}
                {ready && weeklyEntries.length > 0 && (
                    <section
                        className={c.weekTasks}
                        aria-label="Zadania na tydzień"
                    >
                        <h2>
                            Zadania na tydzień{' '}
                            <span>Bez konkretnego dnia i godziny</span>
                        </h2>
                        <div>
                            {weeklyEntries.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={
                                        entry.kind === 'event' && entry.isDone
                                            ? c.weekDone
                                            : undefined
                                    }
                                    style={{ color: calendarEntryColor(entry) }}
                                    onClick={() =>
                                        setPopup({ mode: 'details', entry })
                                    }
                                    aria-label={`Zadanie na tydzień: ${entry.title}`}
                                >
                                    {entry.kind === 'event' && entry.isDone ? (
                                        <Check
                                            size={16}
                                            aria-label="Wykonane"
                                        />
                                    ) : (
                                        <CalendarDays
                                            size={16}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>
                                        <strong>{entry.title}</strong>
                                        <small>
                                            {calendarDayLabel(
                                                calendarEntryDate(
                                                    entry,
                                                    timeZone,
                                                ),
                                                true,
                                            )}{' '}
                                            –{' '}
                                            {calendarDayLabel(
                                                addCalendarDays(
                                                    calendarEntryDate(
                                                        entry,
                                                        timeZone,
                                                    ),
                                                    6,
                                                ),
                                                true,
                                            )}
                                        </small>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}
                {ready && initialTab === 'events' && view !== 'list' && (
                    <CalendarTimeline
                        dates={view === 'week' ? dates : [date]}
                        entries={dailyEntries}
                        timeZone={timeZone}
                        now={now}
                        onOpen={(entry) => setPopup({ mode: 'details', entry })}
                        onCreate={create}
                        onSelectDate={(value) => {
                            setSelectedDate(value)

                            setSelectedView('day')
                        }}
                        onOpenGroup={(entries) =>
                            setPopup({ mode: 'entries', entries })
                        }
                    />
                )}
                {ready &&
                    (initialTab !== 'events' || view === 'list') &&
                    (dailyEntries.length > 0 ? (
                        <CalendarEntriesList
                            entries={dailyEntries}
                            timeZone={timeZone}
                            now={now}
                            onOpen={(entry) =>
                                setPopup({ mode: 'details', entry })
                            }
                        />
                    ) : weeklyEntries.length ? null : (
                        <div className={c.empty}>
                            <CalendarDays size={28} aria-hidden="true" />
                            <strong>
                                {overdueMode
                                    ? 'Wszystko na czas'
                                    : 'Brak wpisów w tym tygodniu'}
                            </strong>
                            <span>
                                {overdueMode
                                    ? 'Nie masz otwartych terminów po czasie.'
                                    : 'Dodaj wpis lub wybierz inny tydzień.'}
                            </span>
                        </div>
                    ))}
                {ready && query.isFetching && (
                    <p className={c.loading} role="status">
                        Wczytywanie wpisów…
                    </p>
                )}
                {ready && initialTab === 'events' && view !== 'list' && (
                    <footer className={c.legend}>
                        <span>
                            <CalendarDays size={13} aria-hidden="true" />
                            Wydarzenia
                        </span>
                        <span>
                            <Bell size={13} aria-hidden="true" />
                            Przypomnienia
                        </span>
                        <span className={c.deadlineLegend}>
                            <Flag size={13} aria-hidden="true" />
                            Terminy
                        </span>
                    </footer>
                )}
            </div>
            {popup && calendar && (
                <Popup
                    key={
                        popup.mode === 'create'
                            ? `${popup.mode}-${popup.kind}`
                            : popup.mode === 'choose' ||
                                popup.mode === 'date' ||
                                popup.mode === 'entries'
                              ? popup.mode
                              : `${popup.mode}-${popup.entry.kind}-${popup.entry.id}`
                    }
                    title={popupTitle(popup)}
                    closeDisabled={pending}
                    fallbackFocusRef={section}
                    onClose={closePopup}
                >
                    {popup.mode === 'choose' && (
                        <div className={c.choose}>
                            {kinds.map(
                                ({ kind, title, description, icon: Icon }) => (
                                    <button
                                        type="button"
                                        key={kind}
                                        onClick={() => {
                                            setWarnings([])

                                            setPopup({
                                                mode: 'create',
                                                kind,
                                                date,
                                            })
                                        }}
                                    >
                                        <Icon size={22} aria-hidden="true" />
                                        <span>
                                            <strong>{title}</strong>
                                            <small>{description}</small>
                                        </span>
                                        <ChevronRight
                                            size={17}
                                            aria-hidden="true"
                                        />
                                    </button>
                                ),
                            )}
                        </div>
                    )}
                    {popup.mode === 'date' && (
                        <CalendarMonthPicker
                            date={date}
                            today={today}
                            onSelect={(value) => {
                                setSelectedDate(value)

                                setPopup(null)
                            }}
                        />
                    )}
                    {popup.mode === 'entries' && (
                        <CalendarEntriesList
                            entries={popup.entries}
                            timeZone={timeZone}
                            now={now}
                            onOpen={(entry) =>
                                setPopup({ mode: 'details', entry })
                            }
                        />
                    )}
                    {(popup.mode === 'create' || popup.mode === 'edit') && (
                        <CalendarEntryForm
                            calendar={calendar}
                            kind={
                                popup.mode === 'create'
                                    ? popup.kind
                                    : popup.entry.kind
                            }
                            entry={
                                popup.mode === 'edit' ? popup.entry : undefined
                            }
                            initialDate={
                                popup.mode === 'create' ? popup.date : date
                            }
                            onSuccess={saved}
                            onCancel={closePopup}
                            onPendingChange={setPending}
                        />
                    )}
                    {popup.mode === 'details' && (
                        <CalendarEntryDetails
                            calendarId={calendar.id}
                            timeZone={timeZone}
                            entry={popup.entry}
                            onEdit={(entry) =>
                                setPopup({ mode: 'edit', entry })
                            }
                            onDelete={(entry) =>
                                setPopup({ mode: 'delete', entry })
                            }
                            onUpdated={saved}
                            onPendingChange={setPending}
                        />
                    )}
                    {popup.mode === 'delete' && (
                        <CalendarDeleteForm
                            calendarId={calendar.id}
                            entry={popup.entry}
                            onSuccess={saved}
                            onCancel={closePopup}
                            onPendingChange={setPending}
                        />
                    )}
                </Popup>
            )}
        </section>
    )
}
