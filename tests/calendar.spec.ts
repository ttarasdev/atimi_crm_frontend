import { selectOption } from './helpers/select-option'
import {
    test,
    expect,
    type Locator,
    type Page,
    type Request,
} from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type {
    Calendar,
    CalendarDeadline,
    CalendarEntry,
    CalendarEvent,
    CalendarEventWarning,
    CalendarReminder,
    CreateCalendarDeadlineDto,
    CreateCalendarEventDto,
    CreateCalendarReminderDto,
} from '../src/api/calendars/calendars.types'
import type { TaskType } from '../src/api/task-types/task-types.types'
import type { Manager } from '../src/api/managers/managers.types'
import {
    PublicBucket,
    type PublicAsset,
} from '../src/api/public-assets/public-assets.types'

test.use({ timezoneId: 'UTC' })

const token = 'calendar-ui-test-session'

const now = new Date('2026-10-05T08:00:00.000Z')

const timestamps = {
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
}

const manager: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    email: 'anna@example.test',
    phone: null,
    position: null,
    avatarId: null,
    status: 'active',
    remindersEnabled: true,
    lastLoginAt: null,
    roles: [{ id: 2, name: 'manager' }],
    ...timestamps,
}

const calendar: Calendar = {
    id: 7,
    managerId: 1,
    timeZone: 'Europe/Warsaw',
    ...timestamps,
}

const png = readFileSync('tests/fixtures/icons/house.png')

const icon: PublicAsset = {
    id: 150,
    bucket: PublicBucket.ICONS,
    relPath: '2026/10/house.png',
    originalName: 'house.png',
    mimeType: 'image/png',
    sizeBytes: png.length,
    isPopular: true,
    createdByManagerId: 1,
    ...timestamps,
}

const defaultType: TaskType = {
    id: 17,
    name: 'Zadanie',
    iconId: icon.id,
    color: '#4676B4',
    reminderMinutes: [60, 10],
    isActive: true,
    isDefault: true,
    icon,
    ...timestamps,
}

const presentationType: TaskType = {
    ...defaultType,
    id: 4,
    name: 'Prezentacja',
    color: '#5A90A2',
    isDefault: false,
}

function event(
    id: number,
    title: string,
    changes: Partial<CalendarEvent> = {},
): CalendarEntry {
    const item: CalendarEvent = {
        id,
        calendarId: calendar.id,
        clientStageId: null,
        title,
        description: null,
        taskTypeId: defaultType.id,
        taskType: defaultType,
        date: null,
        startAt: '2026-10-05T07:00:00.000Z',
        endAt: '2026-10-05T08:00:00.000Z',
        location: null,
        isDone: false,
        doneAt: null,
        sortKey: id * 1000,
        assignedManagerId: null,
        dueAt: null,
        seriesKey: null,
        repeat: null,
        repeatUntil: null,
        timeZone: calendar.timeZone,
        ...timestamps,
        ...changes,
    }

    return {
        ...item,
        kind: 'event',
        at: Date.parse(
            item.startAt ?? `${item.weekStart ?? item.date}T00:00:00+02:00`,
        ),
    }
}

function reminder(
    id: number,
    title: string,
    changes: Partial<CalendarReminder> = {},
): CalendarEntry {
    const item: CalendarReminder = {
        id,
        calendarId: calendar.id,
        clientStageId: null,
        clientTaskId: null,
        managerId: manager.id,
        title,
        remindAt: '2026-10-05T09:30:00.000Z',
        sentAt: null,
        ...timestamps,
        ...changes,
    }

    return { ...item, kind: 'reminder', at: Date.parse(item.remindAt) }
}

function deadline(
    id: number,
    title: string,
    changes: Partial<CalendarDeadline> = {},
): CalendarEntry {
    const item: CalendarDeadline = {
        id,
        calendarId: calendar.id,
        clientStageId: null,
        title,
        description: null,
        dueAt: '2026-10-05T13:00:00.000Z',
        isDone: false,
        reminderMinutes: [60],
        ...timestamps,
        ...changes,
    }

    return { ...item, kind: 'deadline', at: Date.parse(item.dueAt) }
}

interface CalendarMock {
    entries: CalendarEntry[]
    requests: Request[]
    listFails: boolean
    mutationFails: boolean
    mutationDelay: number
    warnings: CalendarEventWarning[]
}

function rangeInstant(value: string) {
    return Date.parse(value.length === 10 ? `${value}T00:00:00+02:00` : value)
}

async function mockCalendar(
    page: Page,
    entries: CalendarEntry[] = [],
    options: { employee?: boolean } = {},
): Promise<CalendarMock> {
    const selectedCalendar = options.employee
        ? { ...calendar, id: 27, managerId: 2 }
        : calendar

    const mock: CalendarMock = {
        entries,
        requests: [],
        listFails: false,
        mutationFails: false,
        mutationDelay: 200,
        warnings: [],
    }

    await page.clock.setFixedTime(now)

    await page.addInitScript((accessToken) => {
        localStorage.setItem('atimi:access_token', accessToken)
    }, token)

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const method = request.method()

        if (method === 'OPTIONS') return route.fulfill({ status: 204 })

        mock.requests.push(request)

        if (url.pathname === '/managers/me')
            return route.fulfill({
                json: options.employee
                    ? { ...manager, roles: [{ id: 1, name: 'admin' }] }
                    : manager,
            })

        if (url.pathname === '/managers/2')
            return route.fulfill({ json: { ...manager, id: 2, name: 'Marta' } })

        if (url.pathname === '/calendars/manager/2')
            return route.fulfill({ json: selectedCalendar })

        if (
            url.pathname === '/document-upload-notifications' ||
            url.pathname === '/notifications'
        )
            return route.fulfill({
                json: {
                    rows: [],
                    total: 0,
                    page: 1,
                    limit: 20,
                    offset: 0,
                    unreadCount: 0,
                },
            })

        if (url.pathname === '/calendars/me')
            return route.fulfill({ json: calendar })

        const pageNumber = Number(url.searchParams.get('page') ?? 1)

        const limit = Number(url.searchParams.get('limit') ?? 20)

        const offset = Number(
            url.searchParams.get('offset') ?? (pageNumber - 1) * limit,
        )

        if (url.pathname === '/task-types') {
            const types = [presentationType, defaultType]

            return route.fulfill({
                json: {
                    rows: types,
                    total: types.length,
                    page: pageNumber,
                    limit,
                    offset,
                },
            })
        }

        if (url.pathname === '/public-assets')
            return route.fulfill({
                json: {
                    rows: [icon],
                    total: 1,
                    page: pageNumber,
                    limit,
                    offset,
                },
            })

        if (url.pathname === `/public-assets/${icon.id}`)
            return route.fulfill({ json: icon })

        if (url.pathname === `/public-assets/${icon.id}/file`)
            return route.fulfill({
                contentType: 'image/png',
                headers: { 'access-control-allow-origin': '*' },
                body: png,
            })

        if (url.pathname === `/calendars/${selectedCalendar.id}/entries`) {
            if (mock.listFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Calendar unavailable' },
                })

            const kind = url.searchParams.get('kind')

            const from = rangeInstant(
                url.searchParams.get('from') ?? '2026-10-05',
            )

            const to =
                86400000 +
                rangeInstant(url.searchParams.get('to') ?? '2026-10-12')

            const overdue = url.searchParams.get('overdue') === 'true'

            const items = mock.entries
                .filter((entry) => {
                    if (kind && kind !== entry.kind) return false

                    if (entry.kind === 'event' && entry.weekStart)
                        return overdue
                            ? !entry.isDone && entry.at + 7 * 86400000 <= from
                            : entry.at < to && entry.at + 7 * 86400000 > from

                    if (overdue)
                        return (
                            entry.at < from &&
                            (entry.kind === 'reminder' || !entry.isDone)
                        )

                    return entry.at >= from && entry.at < to
                })
                .sort(
                    (first, second) =>
                        first.at - second.at || first.id - second.id,
                )

            return route.fulfill({
                json: {
                    rows: items.slice(offset, offset + limit),
                    total: items.length,
                    page: pageNumber,
                    limit,
                    offset,
                },
            })
        }

        if (
            /^\/clients(?:\/\d+\/processes(?:\/\d+\/stages)?)?$/.test(
                url.pathname,
            )
        )
            return route.fulfill({
                json: { rows: [], total: 0, page: pageNumber, limit, offset },
            })

        const match = url.pathname.match(
            new RegExp(
                `^/calendars/${selectedCalendar.id}/(events|reminders|deadlines)(?:/(\\d+))?$`,
            ),
        )

        if (match) {
            const kind =
                match[1] === 'events'
                    ? 'event'
                    : match[1] === 'reminders'
                      ? 'reminder'
                      : 'deadline'

            const id = match[2]
                ? Number(match[2])
                : Math.max(0, ...mock.entries.map((entry) => entry.id)) + 1

            const existing = mock.entries.find(
                (entry) => entry.kind === kind && entry.id === id,
            )

            if (method === 'GET')
                return existing
                    ? route.fulfill({ json: existing })
                    : route.fulfill({
                          status: 404,
                          json: { message: 'Entry not found' },
                      })

            await new Promise((resolve) =>
                setTimeout(resolve, mock.mutationDelay),
            )

            if (mock.mutationFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Calendar unavailable' },
                })

            if (method === 'DELETE') {
                if (
                    existing?.clientStageId &&
                    url.searchParams.get('deleteScope') === 'local'
                )
                    existing.calendarId = null

                mock.entries = mock.entries.filter(
                    (entry) => entry !== existing,
                )

                return route.fulfill({ json: { success: true } })
            }

            let item: CalendarEntry

            if (kind === 'event') {
                const dto: CreateCalendarEventDto = request.postDataJSON()

                item = event(id, dto.title, {
                    ...(existing?.kind === 'event' ? existing : {}),
                    ...dto,
                    calendarId: selectedCalendar.id,
                    taskType:
                        dto.taskTypeId === presentationType.id
                            ? presentationType
                            : defaultType,
                })
            } else if (kind === 'reminder') {
                const dto: CreateCalendarReminderDto = request.postDataJSON()

                item = reminder(id, dto.title, {
                    ...(existing?.kind === 'reminder' ? existing : {}),
                    ...dto,
                    sentAt: null,
                })
            } else {
                const dto: CreateCalendarDeadlineDto = request.postDataJSON()

                item = deadline(id, dto.title, {
                    ...(existing?.kind === 'deadline' ? existing : {}),
                    ...dto,
                })
            }

            mock.entries = [
                ...mock.entries.filter((entry) => entry !== existing),
                item,
            ]

            return route.fulfill({
                status: method === 'POST' ? 201 : 200,
                json:
                    kind === 'event'
                        ? { rows: [item], warnings: mock.warnings }
                        : item,
            })
        }

        return route.fulfill({
            status: 404,
            json: { message: `Unexpected endpoint: ${method} ${url.pathname}` },
        })
    })

    return mock
}

function mutations(mock: CalendarMock) {
    return mock.requests.filter((request) =>
        ['POST', 'PATCH', 'DELETE'].includes(request.method()),
    )
}

async function noOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
}

async function popupTop(page: Page, dialog: Locator, path: string) {
    await dialog.getByRole('button', { name: 'Zamknij okno' }).focus()

    await dialog.locator('[data-popup-panel]').evaluate((element) => {
        element.scrollTop = 0
    })

    await page.screenshot({ path, animations: 'disabled' })
}

function waitMutation(
    page: Page,
    resource: 'events' | 'reminders' | 'deadlines',
    method: string,
    id?: number,
) {
    return page.waitForRequest(
        (request) =>
            new URL(request.url()).pathname ===
                `/calendars/${calendar.id}/${resource}${id ? `/${id}` : ''}` &&
            request.method() === method,
    )
}

async function createDialog(
    page: Page,
    kind: 'event' | 'reminder' | 'deadline' = 'event',
    employee = false,
) {
    const block = page.getByRole('region', {
        name: employee ? 'Kalendarz pracownika' : 'Mój kalendarz',
        exact: true,
    })

    await expect(block).toBeVisible()

    const entryButton = block.getByRole('button', {
        name: 'Dodaj wpis',
        exact: true,
    })

    if (await entryButton.count()) {
        await entryButton.click()

        await page
            .getByRole('dialog', { name: 'Nowy wpis', exact: true })
            .getByRole('button', {
                name:
                    kind === 'event'
                        ? /^Wydarzenie /
                        : kind === 'reminder'
                          ? /^Przypomnienie /
                          : /^Termin /,
            })
            .click()
    } else {
        await block
            .getByRole('button', {
                name:
                    kind === 'reminder'
                        ? 'Dodaj przypomnienie'
                        : 'Dodaj termin',
                exact: true,
            })
            .click()
    }

    return page.getByRole('dialog', {
        name:
            kind === 'event'
                ? 'Nowe wydarzenie'
                : kind === 'reminder'
                  ? 'Nowe przypomnienie'
                  : 'Nowy termin',
        exact: true,
    })
}

test('the desktop week and mobile day navigate dates and expose calendar tabs without a calendar owner selector', async ({
    page,
}, info) => {
    const mock = await mockCalendar(page, [
        event(1, 'Przygotować dokumenty', {
            date: '2026-10-05',
            startAt: null,
            endAt: null,
        }),
        event(2, 'Prezentacja mieszkania', {
            taskTypeId: presentationType.id,
            taskType: presentationType,
            startAt: '2026-10-05T08:00:00.000Z',
            endAt: '2026-10-05T09:30:00.000Z',
            location: 'ul. Długa 12',
        }),
        event(3, 'Spotkanie w biurze', {
            startAt: '2026-10-07T11:00:00.000Z',
            endAt: '2026-10-07T12:00:00.000Z',
        }),
        reminder(4, 'Telefon do klienta'),
        deadline(5, 'Podpisanie umowy'),
    ])

    await page.goto('/main/calendar')

    const block = page.getByRole('region', {
        name: 'Mój kalendarz',
        exact: true,
    })

    const isMobile = info.project.name === 'mobile'

    await expect(
        block.getByLabel(isMobile ? 'Plan dnia' : 'Plan tygodnia', {
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        block.getByRole('button', {
            name: isMobile ? 'Dzień' : 'Tydzień',
            exact: true,
        }),
    ).toHaveAttribute('aria-pressed', 'true')

    await expect(
        block.getByRole('button', { name: /^Pokaż dzień:/ }),
    ).toHaveCount(isMobile ? 1 : 7)

    await expect(
        block.getByRole('button', {
            name: /^Wydarzenie: Prezentacja mieszkania,/,
        }),
    ).toBeVisible()

    await expect(block.getByRole('combobox')).toHaveCount(0)

    await noOverflow(page)

    mkdirSync('/tmp/ivan-calendar-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-calendar-qa/calendar-${info.project.name}.png`,
        animations: 'disabled',
        fullPage: true,
    })

    await block
        .getByRole('button', { name: 'Następny okres', exact: true })
        .click()

    if (isMobile) {
        await expect(
            block.getByRole('button', {
                name: 'Wybierz dzień: 6 października 2026',
                exact: true,
            }),
        ).toHaveAttribute('aria-pressed', 'true')
    } else {
        await expect(
            block.getByRole('button', {
                name: 'Pokaż dzień: 12 października 2026',
                exact: true,
            }),
        ).toBeVisible()
    }

    await block
        .getByRole('button', { name: 'Wybierz datę', exact: true })
        .click()

    const picker = page.getByRole('dialog', {
        name: 'Wybierz datę',
        exact: true,
    })

    await selectOption(picker.getByLabel('Miesiąc', { exact: true }), '11')

    await picker.getByLabel('Rok', { exact: true }).fill('2027')

    await picker
        .getByRole('button', { name: '12 listopada 2027', exact: true })
        .click()

    await expect(picker).not.toBeVisible()

    await expect(
        block.getByRole('button', { name: 'Wybierz datę', exact: true }),
    ).toContainText('listopad 2027')

    await block.getByRole('button', { name: 'Dzisiaj', exact: true }).click()

    await expect(
        block.getByRole('button', {
            name: /^Wydarzenie: Prezentacja mieszkania,/,
        }),
    ).toBeVisible()

    await block.getByRole('button', { name: 'Lista', exact: true }).click()

    await expect(
        block.getByRole('button', {
            name: 'Wydarzenie: Spotkanie w biurze',
            exact: true,
        }),
    ).toBeVisible()

    await block
        .getByRole('navigation', { name: 'Widoki kalendarza' })
        .getByRole('link', { name: 'Przypomnienia', exact: true })
        .click()

    await expect(page).toHaveURL('/main/calendar/reminders?date=2026-10-05')

    await expect(
        block.getByRole('button', {
            name: 'Przypomnienie: Telefon do klienta',
            exact: true,
        }),
    ).toBeVisible()

    expect(
        mock.requests.some(
            (request) => new URL(request.url()).pathname === '/calendars/me',
        ),
    ).toBe(true)

    expect(
        mock.requests.some((request) =>
            /\/calendars\/manager\//.test(new URL(request.url()).pathname),
        ),
    ).toBe(false)

    expect(mutations(mock)).toHaveLength(0)
})

test('a failed calendar list can be retried and all pages including Sunday are fetched automatically', async ({
    page,
}) => {
    const mock = await mockCalendar(page, [
        ...Array.from({ length: 101 }, (_, index) =>
            event(index + 1, `Zadanie ${index + 1}`, {
                date: '2026-10-05',
                startAt: null,
                endAt: null,
            }),
        ),
        event(102, 'Niedzielna prezentacja', {
            startAt: '2026-10-11T10:00:00.000Z',
            endAt: '2026-10-11T11:00:00.000Z',
        }),
    ])

    mock.listFails = true

    await page.goto('/main/calendar')

    const block = page.getByRole('region', {
        name: 'Mój kalendarz',
        exact: true,
    })

    await expect(block.getByRole('alert')).toContainText(
        'Nie udało się wczytać kalendarza',
    )

    await expect(
        block.getByLabel('Plan tygodnia', { exact: true }),
    ).toHaveCount(0)

    await expect(block.getByLabel('Plan dnia', { exact: true })).toHaveCount(0)

    await expect(
        block.getByText('Brak wpisów w tym tygodniu', { exact: true }),
    ).toHaveCount(0)

    mock.listFails = false

    await block
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await block.getByRole('button', { name: 'Lista', exact: true }).click()

    await expect(
        block.getByRole('button', {
            name: 'Wydarzenie: Zadanie 101',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        block.getByRole('button', {
            name: 'Wydarzenie: Niedzielna prezentacja',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        block.getByRole('button', { name: /^Wydarzenie:/ }),
    ).toHaveCount(102)

    const requests = mock.requests.filter((request) =>
        new URL(request.url()).pathname.endsWith('/entries'),
    )

    expect(
        requests.some(
            (request) =>
                new URL(request.url()).searchParams.get('page') === '2',
        ),
    ).toBe(true)

    expect(
        requests.every(
            (request) =>
                new URL(request.url()).searchParams.get('limit') === '100',
        ),
    ).toBe(true)

    expect(
        requests.every(
            (request) => request.headers().authorization === `Bearer ${token}`,
        ),
    ).toBe(true)

    await noOverflow(page)
})

test('selected dates persist across tabs and grouped markers expose every entry including midnight', async ({
    page,
}, info) => {
    await mockCalendar(page, [
        reminder(61, 'Północny e-mail', {
            remindAt: '2026-10-07T22:00:00.000Z',
        }),
        reminder(62, 'Pierwszy telefon', {
            remindAt: '2026-10-08T10:00:05.000Z',
        }),
        reminder(63, 'Drugi telefon', { remindAt: '2026-10-08T10:00:45.000Z' }),
        deadline(64, 'Termin w południe', {
            dueAt: '2026-10-08T10:00:00.000Z',
        }),
    ])

    await page.goto('/main/calendar')

    const block = page.getByRole('region', {
        name: 'Mój kalendarz',
        exact: true,
    })

    await block
        .getByRole('button', { name: 'Wybierz datę', exact: true })
        .click()

    await page
        .getByRole('dialog', { name: 'Wybierz datę', exact: true })
        .getByRole('button', { name: '8 października 2026', exact: true })
        .click()

    const midnight = block.getByRole('button', {
        name: 'Wpisy przed 8:00, 8 października 2026: 1',
        exact: true,
    })

    await expect(midnight).toBeVisible()

    await midnight.click()

    const midnightDetails = page.getByRole('dialog', {
        name: 'Przypomnienie',
        exact: true,
    })

    await expect(
        midnightDetails.getByRole('heading', {
            name: 'Północny e-mail',
            exact: true,
        }),
    ).toBeVisible()

    await expect(midnightDetails).toContainText('00:00')

    await midnightDetails.getByRole('button', { name: 'Zamknij okno' }).click()

    mkdirSync('/tmp/ivan-calendar-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-calendar-qa/midnight-${info.project.name}.png`,
        animations: 'disabled',
        fullPage: true,
    })

    const group = block.getByRole('button', {
        name: 'Wpisy o 12:00: 3',
        exact: true,
    })

    await expect(group).toBeAttached()

    for (const title of [
        'Pierwszy telefon',
        'Drugi telefon',
        'Termin w południe',
    ]) {
        await group.click()

        const chooser = page.getByRole('dialog', {
            name: 'Wpisy w kalendarzu',
            exact: true,
        })

        await expect(
            chooser.getByRole('button', { name: /^(Przypomnienie|Termin):/ }),
        ).toHaveCount(3)

        if (title === 'Pierwszy telefon')
            await popupTop(
                page,
                chooser,
                `/tmp/ivan-calendar-qa/group-chooser-${info.project.name}.png`,
            )

        await chooser
            .getByRole('button', {
                name: `${title === 'Termin w południe' ? 'Termin' : 'Przypomnienie'}: ${title}`,
                exact: true,
            })
            .click()

        const details = page.getByRole('dialog', {
            name: title === 'Termin w południe' ? 'Termin' : 'Przypomnienie',
            exact: true,
        })

        await expect(
            details.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible()

        await details.getByRole('button', { name: 'Zamknij okno' }).click()
    }

    await block
        .getByRole('navigation', { name: 'Widoki kalendarza' })
        .getByRole('link', { name: 'Przypomnienia', exact: true })
        .click()

    await expect(page).toHaveURL('/main/calendar/reminders?date=2026-10-08')

    await expect(
        block.getByRole('button', {
            name: 'Przypomnienie: Pierwszy telefon',
            exact: true,
        }),
    ).toBeVisible()

    await block
        .getByRole('navigation', { name: 'Widoki kalendarza' })
        .getByRole('link', { name: 'Terminy', exact: true })
        .click()

    await expect(page).toHaveURL('/main/calendar/deadlines?date=2026-10-08')

    await expect(
        block.getByRole('button', {
            name: 'Termin: Termin w południe',
            exact: true,
        }),
    ).toBeVisible()

    await block
        .getByRole('navigation', { name: 'Widoki kalendarza' })
        .getByRole('link', { name: 'Kalendarz', exact: true })
        .click()

    await expect(page).toHaveURL('/main/calendar?date=2026-10-08')

    await block
        .getByRole('button', { name: 'Wybierz datę', exact: true })
        .click()

    const picker = page.getByRole('dialog', {
        name: 'Wybierz datę',
        exact: true,
    })

    await expect(
        picker.getByRole('button', {
            name: '8 października 2026',
            exact: true,
        }),
    ).toHaveAttribute('aria-pressed', 'true')

    await picker.getByLabel('Rok', { exact: true }).fill('1000')

    await selectOption(picker.getByLabel('Miesiąc', { exact: true }), '1')

    await picker
        .getByRole('button', { name: 'Poprzedni miesiąc', exact: true })
        .click()

    await expect(picker.getByLabel('Rok', { exact: true })).toHaveValue('1000')

    await expect(
        picker.getByRole('button', { name: /grudnia 999$/ }).first(),
    ).toBeDisabled()

    await picker.getByLabel('Rok', { exact: true }).fill('')

    await picker.getByLabel('Rok', { exact: true }).pressSequentially('9999')

    await selectOption(picker.getByLabel('Miesiąc', { exact: true }), '12')

    await picker
        .getByRole('button', { name: 'Następny miesiąc', exact: true })
        .click()

    await expect(picker.getByLabel('Rok', { exact: true })).toHaveValue('9999')

    await expect(
        picker.getByRole('button', { name: /stycznia 10000$/ }).first(),
    ).toBeDisabled()

    await picker.getByLabel('Rok', { exact: true }).fill('999')

    await picker.getByLabel('Miesiąc', { exact: true }).focus()

    await expect(picker.getByLabel('Rok', { exact: true })).toHaveValue('9999')

    await noOverflow(page)
})

test('editing text preserves seconds and the daylight-saving occurrence, while editing an end time keeps the original start instant', async ({
    page,
}) => {
    const secondsStart = '2026-10-05T07:00:31.123Z'

    const secondsEnd = '2026-10-05T08:00:45.456Z'

    const foldedStart = '2026-10-25T01:30:45.678Z'

    const foldedEnd = '2026-10-25T01:45:15.321Z'

    const offsetStart = '2026-10-05T15:00:45.123+02:00'

    const mock = await mockCalendar(page, [
        event(71, 'Dokładna godzina', {
            startAt: secondsStart,
            endAt: secondsEnd,
        }),
        event(72, 'Po zmianie czasu', {
            startAt: foldedStart,
            endAt: foldedEnd,
        }),
        event(73, 'Zapis z offsetem', {
            startAt: offsetStart,
            endAt: '2026-10-05T16:00:35.456+02:00',
        }),
    ])

    for (const item of [
        {
            id: 71,
            title: 'Dokładna godzina',
            date: '2026-10-05',
            startAt: secondsStart,
            endAt: secondsEnd,
        },
        {
            id: 72,
            title: 'Po zmianie czasu',
            date: '2026-10-25',
            startAt: foldedStart,
            endAt: foldedEnd,
        },
    ]) {
        await page.goto(`/main/calendar?date=${item.date}`)

        if (item.id === 72) {
            await page
                .getByRole('button', { name: /^Wpisy przed 8:00,/ })
                .click()
        } else {
            await page
                .getByRole('button', {
                    name: new RegExp(`^Wydarzenie: ${item.title},`),
                })
                .click()
        }

        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Edytuj', exact: true })
            .click()

        const dialog = page.getByRole('dialog', {
            name: 'Edytuj wydarzenie',
            exact: true,
        })

        await dialog
            .getByLabel('Nazwa', { exact: true })
            .fill(`${item.title} zmieniona`)

        const saved = waitMutation(page, 'events', 'PATCH', item.id)

        await dialog
            .getByRole('button', { name: 'Zapisz zmiany', exact: true })
            .click()

        const payload = (await saved).postDataJSON()

        expect(payload).toMatchObject({ title: `${item.title} zmieniona` })

        expect(payload).not.toHaveProperty('date')

        expect(payload).not.toHaveProperty('startAt')

        expect(payload).not.toHaveProperty('endAt')

        await expect(dialog).not.toBeVisible()

        expect(
            mock.entries.find((entry) => entry.id === item.id),
        ).toMatchObject({ startAt: item.startAt, endAt: item.endAt })
    }

    await page.goto('/main/calendar?date=2026-10-05')

    await page
        .getByRole('button', { name: /^Wydarzenie: Zapis z offsetem,/ })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Edytuj', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Edytuj wydarzenie',
        exact: true,
    })

    await dialog.getByLabel('Do', { exact: true }).fill('17:00')

    const saved = waitMutation(page, 'events', 'PATCH', 73)

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    expect((await saved).postDataJSON()).toMatchObject({
        date: null,
        startAt: offsetStart,
        endAt: '2026-10-05T15:00:00.000Z',
    })

    await expect(dialog).not.toBeVisible()

    expect(mutations(mock)).toHaveLength(3)
})

test('series repetition changes apply only to following or all occurrences and stopping sends explicit null values', async ({
    page,
}, info) => {
    const mock = await mockCalendar(page, [
        event(81, 'Seria do zmiany', {
            seriesKey: 'editable-series',
            repeat: 'weekly',
            repeatUntil: '2026-11-02',
        }),
    ])

    await page.goto('/main/calendar')

    await page
        .getByRole('button', { name: /^Wydarzenie: Seria do zmiany,/ })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Edytuj', exact: true })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Edytuj wydarzenie',
        exact: true,
    })

    await expect(
        dialog.getByLabel('Zastosuj zmiany do', { exact: true }),
    ).toHaveText('Tylko to wydarzenie')

    await expect(dialog.getByLabel('Powtarzanie', { exact: true })).toHaveCount(
        0,
    )

    await expect(
        dialog.getByLabel('Powtarzaj do', { exact: true }),
    ).toHaveCount(0)

    await selectOption(
        dialog.getByLabel('Zastosuj zmiany do', { exact: true }),
        'following',
    )

    await expect(dialog.getByLabel('Powtarzanie', { exact: true })).toHaveText(
        'Co tydzień',
    )

    await expect(
        dialog.getByLabel('Powtarzaj do', { exact: true }),
    ).toHaveValue('2026-11-02')

    await selectOption(
        dialog.getByLabel('Powtarzanie', { exact: true }),
        'daily',
    )

    await dialog.getByLabel('Powtarzaj do', { exact: true }).fill('2026-11-09')

    mkdirSync('/tmp/ivan-calendar-qa', { recursive: true })

    await dialog
        .getByLabel('Zastosuj zmiany do', { exact: true })
        .scrollIntoViewIfNeeded()

    await page.screenshot({
        path: `/tmp/ivan-calendar-qa/repetition-edit-${info.project.name}.png`,
        animations: 'disabled',
    })

    const changed = waitMutation(page, 'events', 'PATCH', 81)

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    const changedRequest = await changed

    expect(new URL(changedRequest.url()).searchParams.get('seriesScope')).toBe(
        'following',
    )

    expect(changedRequest.postDataJSON()).toMatchObject({
        repeat: 'daily',
        repeatUntil: '2026-11-09',
    })

    expect(changedRequest.postDataJSON()).not.toHaveProperty('date')

    expect(changedRequest.postDataJSON()).not.toHaveProperty('startAt')

    expect(changedRequest.postDataJSON()).not.toHaveProperty('endAt')

    await expect(dialog).not.toBeVisible()

    await page
        .getByRole('button', { name: /^Wydarzenie: Seria do zmiany,/ })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Edytuj', exact: true })
        .click()

    dialog = page.getByRole('dialog', {
        name: 'Edytuj wydarzenie',
        exact: true,
    })

    await selectOption(
        dialog.getByLabel('Zastosuj zmiany do', { exact: true }),
        'all',
    )

    await expect(dialog.getByLabel('Powtarzanie', { exact: true })).toHaveText(
        'Codziennie',
    )

    await selectOption(dialog.getByLabel('Powtarzanie', { exact: true }), '')

    await expect(
        dialog.getByLabel('Powtarzaj do', { exact: true }),
    ).toHaveCount(0)

    const stopped = waitMutation(page, 'events', 'PATCH', 81)

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    const stoppedRequest = await stopped

    expect(new URL(stoppedRequest.url()).searchParams.get('seriesScope')).toBe(
        'all',
    )

    expect(stoppedRequest.postDataJSON()).toMatchObject({
        repeat: null,
        repeatUntil: null,
    })

    expect(stoppedRequest.postDataJSON()).not.toHaveProperty('startAt')

    await expect(dialog).not.toBeVisible()

    expect(mutations(mock)).toHaveLength(2)
})

test('recurring events expose edit and delete scopes for this occurrence, following occurrences and the whole series', async ({
    page,
}) => {
    const mock = await mockCalendar(page, [
        event(21, 'Seria pierwsza', {
            seriesKey: 'series-one',
            repeat: 'weekly',
            repeatUntil: '2026-11-02',
        }),
        event(22, 'Seria druga', {
            seriesKey: 'series-two',
            repeat: 'daily',
            repeatUntil: '2026-10-12',
        }),
        event(23, 'Seria trzecia', {
            seriesKey: 'series-three',
            repeat: 'monthly',
            repeatUntil: '2026-12-05',
        }),
    ])

    await page.goto('/main/calendar')

    for (const item of [
        { id: 21, title: 'Seria pierwsza', scope: 'one' },
        { id: 22, title: 'Seria druga', scope: 'following' },
        { id: 23, title: 'Seria trzecia', scope: 'all' },
    ]) {
        await page
            .getByRole('button', {
                name: new RegExp(`^Wydarzenie: ${item.title},`),
            })
            .click()

        let dialog = page.getByRole('dialog')

        await expect(
            dialog.getByRole('heading', { name: item.title, exact: true }),
        ).toBeVisible()

        await dialog
            .getByRole('button', { name: 'Edytuj', exact: true })
            .click()

        dialog = page.getByRole('dialog')

        await dialog
            .getByLabel('Nazwa', { exact: true })
            .fill(`${item.title} zmieniona`)

        await selectOption(
            dialog.getByLabel('Zastosuj zmiany do', { exact: true }),
            item.scope,
        )

        const saved = waitMutation(page, 'events', 'PATCH', item.id)

        await dialog
            .getByRole('button', { name: 'Zapisz zmiany', exact: true })
            .click()

        const request = await saved

        expect(new URL(request.url()).searchParams.get('seriesScope')).toBe(
            item.scope,
        )

        expect(request.postDataJSON()).toMatchObject({
            title: `${item.title} zmieniona`,
            taskTypeId: defaultType.id,
        })

        expect(request.postDataJSON()).not.toHaveProperty('repeat')

        expect(request.postDataJSON()).not.toHaveProperty('repeatUntil')

        await expect(dialog).not.toBeVisible()

        await page
            .getByRole('button', {
                name: new RegExp(`^Wydarzenie: ${item.title} zmieniona,`),
            })
            .click()

        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Usuń', exact: true })
            .click()

        dialog = page.getByRole('dialog')

        await selectOption(
            dialog.getByLabel('Które wydarzenia usunąć?', { exact: true }),
            item.scope,
        )

        const deleted = waitMutation(page, 'events', 'DELETE', item.id)

        await dialog.getByRole('button', { name: 'Usuń', exact: true }).click()

        expect(
            new URL((await deleted).url()).searchParams.get('seriesScope'),
        ).toBe(item.scope)

        await expect(dialog).not.toBeVisible()

        await expect(
            page.getByRole('button', {
                name: new RegExp(`^Wydarzenie: ${item.title} zmieniona,`),
            }),
        ).toHaveCount(0)
    }

    expect(mutations(mock)).toHaveLength(6)
})

test('deleting a linked entry requires an explicit calendar-only or everywhere choice', async ({
    page,
}) => {
    const mock = await mockCalendar(page, [
        event(31, 'Zadanie z etapu pierwsze', {
            clientStageId: 12,
            date: '2026-10-05',
            startAt: null,
            endAt: null,
        }),
        event(32, 'Zadanie z etapu drugie', {
            clientStageId: 13,
            date: '2026-10-05',
            startAt: null,
            endAt: null,
        }),
    ])

    await page.goto('/main/calendar')

    for (const item of [
        { id: 31, title: 'Zadanie z etapu pierwsze', scope: 'local' },
        { id: 32, title: 'Zadanie z etapu drugie', scope: 'everywhere' },
    ]) {
        await page
            .getByRole('button', {
                name: `Zadanie bez godziny: ${item.title}`,
                exact: true,
            })
            .click()

        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Usuń', exact: true })
            .click()

        const dialog = page.getByRole('dialog')

        await expect(
            dialog.getByLabel('Gdzie usunąć wpis?', { exact: true }),
        ).toBeVisible()

        expect(mutations(mock)).toHaveLength(item.scope === 'local' ? 0 : 1)

        await selectOption(
            dialog.getByLabel('Gdzie usunąć wpis?', { exact: true }),
            item.scope,
        )

        const deleted = waitMutation(page, 'events', 'DELETE', item.id)

        await dialog.getByRole('button', { name: 'Usuń', exact: true }).click()

        expect(
            new URL((await deleted).url()).searchParams.get('deleteScope'),
        ).toBe(item.scope)

        await expect(dialog).not.toBeVisible()
    }

    expect(mutations(mock)).toHaveLength(2)
})

test('reminders have no completion state and can be created and postponed with a precise time', async ({
    page,
}, info) => {
    const mock = await mockCalendar(page, [
        reminder(41, 'Zadzwonić do klienta', {
            sentAt: '2026-10-05T07:00:00.000Z',
        }),
    ])

    await page.goto('/main/calendar/reminders')

    const block = page.getByRole('region', {
        name: 'Mój kalendarz',
        exact: true,
    })

    await expect(
        block.getByRole('button', {
            name: 'Przypomnienie: Zadzwonić do klienta',
            exact: true,
        }),
    ).toBeVisible()

    await noOverflow(page)

    mkdirSync('/tmp/ivan-calendar-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-calendar-qa/reminders-${info.project.name}.png`,
        animations: 'disabled',
        fullPage: true,
    })

    await block
        .getByRole('button', {
            name: 'Przypomnienie: Zadzwonić do klienta',
            exact: true,
        })
        .click()

    const details = page.getByRole('dialog')

    await expect(
        details.getByRole('button', {
            name: /^(Oznacz jako wykonane|Wykonane)$/,
        }),
    ).toHaveCount(0)

    await details
        .getByRole('button', { name: 'Odłóż przypomnienie', exact: true })
        .click()

    const snoozed = waitMutation(page, 'reminders', 'PATCH', 41)

    await details
        .getByRole('button', { name: 'Za 15 min', exact: true })
        .click()

    expect((await snoozed).postDataJSON()).toEqual({
        remindAt: '2026-10-05T08:15:00.000Z',
    })

    await expect(details).not.toBeVisible()

    const dialog = await createDialog(page, 'reminder')

    await dialog
        .getByLabel('Treść przypomnienia', { exact: true })
        .fill('Odebrać dokumenty')

    await dialog.getByLabel('Data', { exact: true }).fill('2026-10-05')

    await dialog.getByLabel('Godzina', { exact: true }).fill('16:45')

    await expect(
        dialog.getByLabel('Typ wydarzenia', { exact: true }),
    ).toHaveCount(0)

    const created = waitMutation(page, 'reminders', 'POST')

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    expect((await created).postDataJSON()).toEqual({
        title: 'Odebrać dokumenty',
        remindAt: '2026-10-05T14:45:00.000Z',
    })

    await expect(dialog).not.toBeVisible()

    await expect(
        block.getByRole('button', {
            name: 'Przypomnienie: Odebrać dokumenty',
            exact: true,
        }),
    ).toBeVisible()

    expect(mutations(mock)).toHaveLength(2)
})

test('deadlines are thin calendar markers and overdue items can be completed without a type', async ({
    page,
}, info) => {
    const mock = await mockCalendar(page, [
        deadline(51, 'Podpisać umowę'),
        deadline(52, 'Dostarczyć dokumenty', {
            dueAt: '2026-10-04T13:00:00.000Z',
        }),
    ])

    await page.goto('/main/calendar')

    const marker = page.getByRole('button', {
        name: 'Termin: Podpisać umowę, 15:00',
        exact: true,
    })

    await expect(marker).toBeAttached()

    const size = await marker.boundingBox()

    expect(size?.height).toBeLessThanOrEqual(30)

    await page.goto('/main/calendar/deadlines')

    const block = page.getByRole('region', {
        name: 'Mój kalendarz',
        exact: true,
    })

    await expect(
        block.getByRole('button', {
            name: 'Termin: Podpisać umowę',
            exact: true,
        }),
    ).toBeVisible()

    mkdirSync('/tmp/ivan-calendar-qa', { recursive: true })

    await noOverflow(page)

    await page.screenshot({
        path: `/tmp/ivan-calendar-qa/deadlines-${info.project.name}.png`,
        animations: 'disabled',
        fullPage: true,
    })

    await block
        .getByRole('button', { name: 'Po terminie', exact: true })
        .click()

    const overdue = block.getByRole('button', {
        name: 'Termin: Dostarczyć dokumenty',
        exact: true,
    })

    await expect(overdue).toContainText('Po terminie')

    await overdue.click()

    const details = page.getByRole('dialog')

    const completed = waitMutation(page, 'deadlines', 'PATCH', 52)

    await details
        .getByRole('button', { name: 'Oznacz jako wykonane', exact: true })
        .click()

    expect((await completed).postDataJSON()).toEqual({ isDone: true })

    await expect(details).not.toBeVisible()

    await expect(overdue).toHaveCount(0)

    const dialog = await createDialog(page, 'deadline')

    await dialog.getByLabel('Nazwa', { exact: true }).fill('Wysłać ofertę')

    await dialog.getByLabel('Data', { exact: true }).fill('2026-10-05')

    await dialog.getByLabel('Godzina', { exact: true }).fill('17:00')

    await dialog
        .getByRole('checkbox', { name: '1 godz. przed', exact: true })
        .check()

    await expect(
        dialog.getByLabel('Typ wydarzenia', { exact: true }),
    ).toHaveCount(0)

    const created = waitMutation(page, 'deadlines', 'POST')

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    expect((await created).postDataJSON()).toEqual({
        title: 'Wysłać ofertę',
        dueAt: '2026-10-05T15:00:00.000Z',
        reminderMinutes: [60],
    })

    await expect(dialog).not.toBeVisible()

    expect(mutations(mock)).toHaveLength(2)
})

test('default type is automatic, a task without time sends only its date, and timed recurrence uses the calendar time zone', async ({
    page,
}, info) => {
    const mock = await mockCalendar(page)

    await page.goto('/main/calendar')

    let dialog = await createDialog(page)

    await expect(
        dialog.getByLabel('Typ wydarzenia', { exact: true }),
    ).toContainText('Zadanie')

    await dialog
        .getByLabel('Nazwa', { exact: true })
        .fill('  Przygotować ofertę  ')

    await dialog
        .getByRole('checkbox', {
            name: 'Bez godziny — zadanie na dzień',
            exact: true,
        })
        .check()

    await dialog.getByLabel('Data', { exact: true }).fill('2026-10-05')

    await expect(
        dialog.getByText('Tylko data. Przypomnienia są wyłączone.', {
            exact: true,
        }),
    ).toBeVisible()

    await expect(dialog.getByLabel('Od', { exact: true })).toHaveCount(0)

    await expect(dialog.getByLabel('Do', { exact: true })).toHaveCount(0)

    const allDaySent = waitMutation(page, 'events', 'POST')

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    expect((await allDaySent).postDataJSON()).toEqual({
        title: 'Przygotować ofertę',
        taskTypeId: defaultType.id,
        date: '2026-10-05',
        startAt: null,
        endAt: null,
    })

    await expect(dialog).not.toBeVisible()

    await expect(
        page.getByRole('button', {
            name: 'Zadanie bez godziny: Przygotować ofertę',
            exact: true,
        }),
    ).toBeVisible()

    dialog = await createDialog(page)

    await dialog
        .getByLabel('Nazwa', { exact: true })
        .fill('Spotkanie cykliczne')

    await dialog.getByLabel('Data', { exact: true }).fill('2026-10-05')

    await dialog.getByLabel('Od', { exact: true }).fill('14:00')

    await dialog.getByLabel('Do', { exact: true }).fill('15:30')

    await selectOption(
        dialog.getByLabel('Powtarzanie', { exact: true }),
        'weekly',
    )

    await dialog.getByLabel('Powtarzaj do', { exact: true }).fill('2026-11-02')

    await dialog
        .getByLabel('Miejsce (opcjonalnie)', { exact: true })
        .fill('Biuro')

    mkdirSync('/tmp/ivan-calendar-qa', { recursive: true })

    await popupTop(
        page,
        dialog,
        `/tmp/ivan-calendar-qa/event-form-top-${info.project.name}.png`,
    )

    await dialog
        .getByRole('button', { name: 'Dodaj', exact: true })
        .scrollIntoViewIfNeeded()

    await noOverflow(page)

    await page.screenshot({
        path: `/tmp/ivan-calendar-qa/event-form-bottom-${info.project.name}.png`,
        animations: 'disabled',
    })

    const timedSent = waitMutation(page, 'events', 'POST')

    mock.warnings = [
        {
            code: 'TIME_OVERLAP',
            event: {
                id: 90,
                title: 'Inne spotkanie',
                startAt: '2026-10-05T12:30:00.000Z',
                endAt: '2026-10-05T13:00:00.000Z',
            },
        },
    ]

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    const request = await timedSent

    expect(request.postDataJSON()).toEqual({
        title: 'Spotkanie cykliczne',
        taskTypeId: defaultType.id,
        date: null,
        startAt: '2026-10-05T12:00:00.000Z',
        endAt: '2026-10-05T13:30:00.000Z',
        location: 'Biuro',
        repeat: 'weekly',
        repeatUntil: '2026-11-02',
    })

    expect(request.headers().authorization).toBe(`Bearer ${token}`)

    expect(request.postDataJSON()).not.toHaveProperty('managerId')

    expect(request.postDataJSON()).not.toHaveProperty('reminderMinutes')

    await expect(dialog).not.toBeVisible()

    await expect(page.getByRole('status')).toContainText(
        'Wpis zapisany. Czas nakłada się na: Inne spotkanie.',
    )

    await expect(
        page.getByRole('button', {
            name: 'Wydarzenie: Spotkanie cykliczne, 14:00–15:30',
            exact: true,
        }),
    ).toBeAttached()

    expect(mutations(mock)).toHaveLength(2)
})

test('a failed save keeps values and a pending save protects the form from duplicate submission and closing', async ({
    page,
}) => {
    const mock = await mockCalendar(page)

    mock.mutationFails = true

    mock.mutationDelay = 700

    await page.goto('/main/calendar')

    const dialog = await createDialog(page)

    await dialog
        .getByLabel('Nazwa', { exact: true })
        .fill('Zadanie do zachowania')

    const sent = waitMutation(page, 'events', 'POST')

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    await sent

    await expect(dialog.getByLabel('Nazwa', { exact: true })).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Zapisywanie…', exact: true }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie udało się zapisać',
    )

    await expect(dialog.getByLabel('Nazwa', { exact: true })).toHaveValue(
        'Zadanie do zachowania',
    )

    await expect(dialog.getByLabel('Nazwa', { exact: true })).toBeEnabled()

    expect(mutations(mock)).toHaveLength(1)

    mock.mutationFails = false

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    await expect(dialog).not.toBeVisible()

    expect(mutations(mock)).toHaveLength(2)
})

test('the 8–24 timeline keeps dates, day tasks and time columns aligned while scrolling', async ({
    page,
}, info) => {
    await mockCalendar(page, [
        event(91, 'Pierwsza godzina', {
            startAt: '2026-10-05T06:00:00.000Z',
            endAt: '2026-10-05T07:00:00.000Z',
        }),
        event(92, 'Ostatnia godzina', {
            startAt: '2026-10-05T21:00:00.000Z',
            endAt: '2026-10-05T21:59:00.000Z',
        }),
        event(93, 'Zadanie nad skalą', {
            date: '2026-10-05',
            startAt: null,
            endAt: null,
        }),
    ])

    await page.goto('/main/calendar')

    const timeline = page.getByLabel(
        info.project.name === 'mobile' ? 'Plan dnia' : 'Plan tygodnia',
        { exact: true },
    )

    const scroll = timeline.getByRole('region', {
        name: 'Oś czasu od 8:00 do 24:00',
        exact: true,
    })

    const heading = timeline.getByRole('button', {
        name: 'Pokaż dzień: 5 października 2026',
        exact: true,
    })

    const dayTask = timeline.getByRole('button', {
        name: 'Zadanie bez godziny: Zadanie nad skalą',
        exact: true,
    })

    const firstEvent = timeline.getByRole('button', {
        name: 'Wydarzenie: Pierwsza godzina, 08:00–09:00',
        exact: true,
    })

    await expect(firstEvent).toBeVisible()

    await expect(timeline.getByText('08:00', { exact: true })).toBeVisible()

    await expect(timeline.getByText('07:00', { exact: true })).toHaveCount(0)

    await expect(timeline.getByText('00:00', { exact: true })).toHaveCount(0)

    const aligned = async () => {
        const header = await heading.boundingBox()

        const taskColumn = await dayTask.evaluate((element) =>
            element.parentElement!.getBoundingClientRect().toJSON(),
        )

        const timeColumn = await firstEvent.evaluate((element) =>
            element.parentElement!.getBoundingClientRect().toJSON(),
        )

        expect(Math.abs(header!.x - taskColumn.x)).toBeLessThan(1)

        expect(Math.abs(header!.x - timeColumn.x)).toBeLessThan(1)

        expect(Math.abs(header!.width - taskColumn.width)).toBeLessThan(1)

        expect(Math.abs(header!.width - timeColumn.width)).toBeLessThan(1)
    }

    await scroll.scrollIntoViewIfNeeded()

    await aligned()

    const headerTop = (await heading.boundingBox())!.y

    const bounds = (await scroll.boundingBox())!

    await page.mouse.move(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height - 30,
    )

    await page.mouse.wheel(0, 480)

    await expect
        .poll(() => scroll.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(100)

    await aligned()

    expect(Math.abs((await heading.boundingBox())!.y - headerTop)).toBeLessThan(
        1,
    )

    await scroll.focus()

    await page.keyboard.press('End')

    await expect
        .poll(() =>
            scroll.evaluate(
                (element) =>
                    element.scrollTop >=
                    element.scrollHeight - element.clientHeight - 1,
            ),
        )
        .toBe(true)

    await expect(timeline.getByText('24:00', { exact: true })).toBeInViewport()

    await expect(
        timeline.getByRole('button', {
            name: 'Wydarzenie: Ostatnia godzina, 23:00–23:59',
            exact: true,
        }),
    ).toBeVisible()

    await noOverflow(page)

    mkdirSync('/tmp/ivan-calendar-layout-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-calendar-layout-qa/range-bottom-${info.project.name}.png`,
        animations: 'disabled',
    })
})

test('entries before 8 remain reachable and events crossing 8 keep their original times', async ({
    page,
}) => {
    await mockCalendar(page, [
        event(101, 'Wcześniejsze spotkanie', {
            startAt: '2026-10-05T05:00:00.000Z',
            endAt: '2026-10-05T06:00:00.000Z',
        }),
        event(102, 'Spotkanie na granicy', {
            startAt: '2026-10-05T05:45:00.000Z',
            endAt: '2026-10-05T06:15:00.000Z',
        }),
        reminder(103, 'Północna wiadomość', {
            remindAt: '2026-10-04T22:00:00.000Z',
        }),
        deadline(104, 'Wczesny termin', { dueAt: '2026-10-05T05:30:00.000Z' }),
    ])

    await page.goto('/main/calendar')

    const early = page.getByRole('button', {
        name: 'Wpisy przed 8:00, 5 października 2026: 3',
        exact: true,
    })

    await expect(early).toBeVisible()

    for (const entry of [
        { title: 'Wcześniejsze spotkanie', kind: 'Wydarzenie' },
        { title: 'Północna wiadomość', kind: 'Przypomnienie' },
        { title: 'Wczesny termin', kind: 'Termin' },
    ]) {
        await early.click()

        const chooser = page.getByRole('dialog', {
            name: 'Wpisy w kalendarzu',
            exact: true,
        })

        await expect(
            chooser.getByRole('button', {
                name: /^(Wydarzenie|Przypomnienie|Termin):/,
            }),
        ).toHaveCount(3)

        await chooser
            .getByRole('button', {
                name: `${entry.kind}: ${entry.title}`,
                exact: true,
            })
            .click()

        const details = page.getByRole('dialog')

        await expect(
            details.getByRole('heading', { name: entry.title, exact: true }),
        ).toBeVisible()

        await details.getByRole('button', { name: 'Zamknij okno' }).click()
    }

    await page
        .getByRole('button', {
            name: 'Wydarzenie: Spotkanie na granicy, 07:45–08:15',
            exact: true,
        })
        .click()

    const details = page.getByRole('dialog')

    await expect(
        details.getByRole('heading', {
            name: 'Spotkanie na granicy',
            exact: true,
        }),
    ).toBeVisible()

    await expect(details).toContainText('07:45 – 08:15')
})

test('desktop navigation collapses to accessible icons and expands from the keyboard while mobile retains its drawer', async ({
    page,
}, info) => {
    await mockCalendar(page)

    await page.goto('/main/calendar')

    if (info.project.name === 'mobile') {
        await expect(
            page.getByRole('button', { name: 'Zwiń menu', exact: true }),
        ).toHaveCount(0)

        await page
            .getByRole('button', { name: 'Otwórz menu', exact: true })
            .click()

        const drawer = page.getByRole('dialog', {
            name: 'Menu główne',
            exact: true,
        })

        await expect(
            drawer.getByRole('link', { name: 'Kalendarz', exact: true }),
        ).toBeVisible()

        await expect(
            drawer.getByText('PRZESTRZEŃ PRACY', { exact: true }),
        ).toBeVisible()

        await drawer
            .getByRole('button', { name: 'Zamknij menu', exact: true })
            .click()

        await expect(drawer).not.toBeVisible()

        await noOverflow(page)

        return
    }

    const rail = page.locator('#desktop-navigation')

    const content = page.locator('#content')

    const originalWidth = (await content.boundingBox())!.width

    await page.getByRole('button', { name: 'Zwiń menu', exact: true }).click()

    const expand = page.getByRole('button', {
        name: 'Rozwiń menu',
        exact: true,
    })

    await expect(expand).toHaveAttribute('aria-expanded', 'false')

    expect((await rail.boundingBox())!.width).toBe(72)

    expect((await content.boundingBox())!.width).toBeGreaterThan(
        originalWidth + 170,
    )

    const calendarLink = rail.getByRole('link', {
        name: 'Kalendarz',
        exact: true,
    })

    await expect(calendarLink).toBeVisible()

    mkdirSync('/tmp/ivan-calendar-layout-qa', { recursive: true })

    await page.screenshot({
        path: '/tmp/ivan-calendar-layout-qa/sidebar-collapsed-desktop.png',
        animations: 'disabled',
    })

    await expect(calendarLink).toHaveAttribute('title', 'Kalendarz')

    await expect(
        calendarLink.getByText('Kalendarz', { exact: true }),
    ).not.toBeVisible()

    await rail.getByRole('link', { name: 'Zarządzanie', exact: true }).click()

    const iconsLink = rail.getByRole('link', {
        name: 'Galeria ikon',
        exact: true,
    })

    await expect(iconsLink).toBeVisible()

    await expect(iconsLink.locator('svg')).toBeVisible()

    await iconsLink.click()

    await expect(page).toHaveURL('/main/management/icons')

    expect((await rail.boundingBox())!.width).toBe(72)

    await expand.focus()

    await page.keyboard.press('Enter')

    await expect(
        page.getByRole('button', { name: 'Zwiń menu', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true')

    expect((await rail.boundingBox())!.width).toBe(264)

    await noOverflow(page)

    mkdirSync('/tmp/ivan-calendar-layout-qa', { recursive: true })

    await page.screenshot({
        path: '/tmp/ivan-calendar-layout-qa/sidebar-expanded-desktop.png',
        animations: 'disabled',
    })
})

test('document expiry events link to client and cannot be edited directly', async ({
    page,
}) => {
    const mock = await mockCalendar(page, [
        event(100, 'Kończy się karta pobytu', {
            clientId: 7,
            clientCardId: 10,
        }),
    ])

    await page.goto('/main/calendar')

    await page
        .getByRole('button', {
            name: /^Wydarzenie: Kończy się karta pobytu,/,
        })
        .first()
        .click()

    const dialog = page.getByRole('dialog')

    await expect(
        dialog.getByText('To przypomnienie pochodzi z karty dokumentu.'),
    ).toBeVisible()

    await expect(
        dialog.getByRole('link', { name: 'Otwórz klienta' }),
    ).toHaveAttribute('href', '/main/clients/7')

    await expect(
        dialog.getByRole('button', { name: 'Edytuj', exact: true }),
    ).toHaveCount(0)

    await expect(
        dialog.getByRole('button', { name: 'Usuń', exact: true }),
    ).toHaveCount(0)

    await expect(
        dialog.getByRole('button', {
            name: 'Oznacz jako wykonane',
            exact: true,
        }),
    ).toHaveCount(0)

    expect(
        mock.requests.filter(
            (request) =>
                request.method() === 'PATCH' || request.method() === 'DELETE',
        ),
    ).toEqual([])
})

test('week task has no day or time, survives save failure and can complete then change into a day task', async ({
    page,
}, info) => {
    const mock = await mockCalendar(page)

    await page.goto('/main/calendar?date=2026-10-07')

    const dialog = await createDialog(page)

    await dialog
        .getByLabel('Nazwa', { exact: true })
        .fill('Zebrać dokumenty w tym tygodniu')

    await dialog
        .getByRole('checkbox', {
            name: 'Bez godziny — zadanie na dzień',
            exact: true,
        })
        .check()

    await selectOption(
        dialog.getByLabel('Zakres zadania', { exact: true }),
        'week',
    )

    await dialog
        .getByLabel('Dowolny dzień wybranego tygodnia', { exact: true })
        .fill('2026-10-07')

    await expect(dialog.getByLabel('Od', { exact: true })).toHaveCount(0)

    await expect(
        dialog.getByText(/Bez konkretnego dnia\. Przypomnienia są wyłączone/),
    ).toBeVisible()

    mock.mutationFails = true

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(dialog.getByLabel('Nazwa', { exact: true })).toHaveValue(
        'Zebrać dokumenty w tym tygodniu',
    )

    mock.mutationFails = false

    const created = waitMutation(page, 'events', 'POST')

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    expect((await created).postDataJSON()).toMatchObject({
        weekStart: '2026-10-05',
        date: null,
        startAt: null,
        endAt: null,
    })

    await expect(dialog).not.toBeVisible()

    const bucket = page.getByRole('region', {
        name: 'Zadania na tydzień',
        exact: true,
    })

    const task = bucket.getByRole('button', {
        name: 'Zadanie na tydzień: Zebrać dokumenty w tym tygodniu',
        exact: true,
    })

    await expect(task).toBeVisible()

    await expect(
        page.getByRole('button', {
            name: 'Zadanie bez godziny: Zebrać dokumenty w tym tygodniu',
            exact: true,
        }),
    ).toHaveCount(0)

    await noOverflow(page)

    mkdirSync('/tmp/atimi-week-calendar-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-week-calendar-shots/week-${info.project.name}.png`,
        fullPage: true,
    })

    await task.click()

    const details = page.getByRole('dialog', {
        name: 'Wydarzenie',
        exact: true,
    })

    await expect(details).toContainText('bez konkretnego dnia i godziny')

    await expect(details).toContainText('Wyłączone dla zadania bez godziny.')

    const completed = waitMutation(page, 'events', 'PATCH', 1)

    await details
        .getByRole('button', { name: 'Oznacz jako wykonane', exact: true })
        .click()

    expect((await completed).postDataJSON()).toEqual({ isDone: true })

    await expect(details).not.toBeVisible()

    await task.click()

    await expect(
        details.getByRole('button', { name: 'Wykonane', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')

    await details.getByRole('button', { name: 'Edytuj', exact: true }).click()

    const editor = page.getByRole('dialog', {
        name: 'Edytuj wydarzenie',
        exact: true,
    })

    await selectOption(
        editor.getByLabel('Zakres zadania', { exact: true }),
        'day',
    )

    await editor.getByLabel('Data', { exact: true }).fill('2026-10-07')

    const changed = waitMutation(page, 'events', 'PATCH', 1)

    await editor
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    expect((await changed).postDataJSON()).toMatchObject({
        weekStart: null,
        date: '2026-10-07',
        startAt: null,
        endAt: null,
    })

    await expect(bucket).toHaveCount(0)

    await expect(
        page.getByRole('button', {
            name: 'Zadanie bez godziny: Zebrać dokumenty w tym tygodniu',
            exact: true,
        }),
    ).toBeVisible()
})

test('one weekly bucket appears in week day and list views and disappears in the following week', async ({
    page,
}) => {
    await mockCalendar(page, [
        event(1, 'Plan tygodnia', {
            weekStart: '2026-10-05',
            date: null,
            startAt: null,
            endAt: null,
        }),
    ])

    await page.goto('/main/calendar?date=2026-10-07')

    const bucket = page.getByRole('region', {
        name: 'Zadania na tydzień',
        exact: true,
    })

    await expect(
        bucket.getByRole('button', {
            name: 'Zadanie na tydzień: Plan tygodnia',
            exact: true,
        }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Dzień', exact: true }).click()

    await expect(bucket).toBeVisible()

    const monday = page.getByRole('button', {
        name: 'Wybierz dzień: 5 października 2026',
        exact: true,
    })

    await expect(monday.locator('i')).toHaveCount(0)

    await page.getByRole('button', { name: 'Lista', exact: true }).click()

    await expect(bucket).toBeVisible()

    await expect(
        page.getByText('Brak wpisów w tym tygodniu', { exact: true }),
    ).toHaveCount(0)

    await page
        .getByRole('button', { name: 'Następny okres', exact: true })
        .click()

    await expect(bucket).toHaveCount(0)
})

test('weekly recurrence creates week buckets without offering daily or monthly recurrence', async ({
    page,
}) => {
    await mockCalendar(page)

    await page.goto('/main/calendar')

    const dialog = await createDialog(page)

    await dialog
        .getByLabel('Nazwa', { exact: true })
        .fill('Cotygodniowa kontrola')

    await dialog
        .getByRole('checkbox', {
            name: 'Bez godziny — zadanie na dzień',
            exact: true,
        })
        .check()

    await selectOption(
        dialog.getByLabel('Zakres zadania', { exact: true }),
        'week',
    )

    await dialog.getByLabel('Powtarzanie', { exact: true }).click()

    await expect(
        page.getByRole('option', { name: 'Codziennie', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('option', {
            name: 'Co miesiąc, tego samego dnia',
            exact: true,
        }),
    ).toHaveCount(0)

    await page.getByRole('option', { name: 'Co tydzień', exact: true }).click()

    await dialog.getByLabel('Powtarzaj do', { exact: true }).fill('2026-11-02')

    const sent = waitMutation(page, 'events', 'POST')

    await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

    expect((await sent).postDataJSON()).toMatchObject({
        weekStart: '2026-10-05',
        repeat: 'weekly',
        repeatUntil: '2026-11-02',
        date: null,
        startAt: null,
        endAt: null,
    })
})

test('administrator creates timed daily and weekly entries in the opened employee calendar', async ({
    page,
}) => {
    const mock = await mockCalendar(page, [], { employee: true })

    await page.goto('/main/managers/2/calendar?date=2026-10-07')

    await expect(
        page.getByText('Plan dnia i tygodnia · Marta Kowalska', {
            exact: true,
        }),
    ).toBeVisible()

    for (const mode of ['time', 'day', 'week']) {
        const dialog = await createDialog(page, 'event', true)

        await dialog.getByLabel('Nazwa', { exact: true }).fill(`Admin ${mode}`)

        if (mode !== 'time')
            await dialog
                .getByRole('checkbox', {
                    name: 'Bez godziny — zadanie na dzień',
                    exact: true,
                })
                .check()

        if (mode === 'week')
            await selectOption(
                dialog.getByLabel('Zakres zadania', { exact: true }),
                'week',
            )

        const sent = page.waitForRequest(
            (request) =>
                new URL(request.url()).pathname === '/calendars/27/events' &&
                request.method() === 'POST',
        )

        await dialog.getByRole('button', { name: 'Dodaj', exact: true }).click()

        const body = (await sent).postDataJSON()

        expect(body.title).toBe(`Admin ${mode}`)

        if (mode === 'time') expect(body.startAt).toBeTruthy()
        else if (mode === 'day') expect(body.date).toBeTruthy()
        else expect(body.weekStart).toBe('2026-10-05')

        await expect(dialog).not.toBeVisible()
    }

    expect(
        mock.requests.some(
            (request) => new URL(request.url()).pathname === '/calendars/me',
        ),
    ).toBe(false)

    expect(mutations(mock)).toHaveLength(3)
})

test('task deadlines show Warsaw time and become overdue without duplicating calendar entries', async ({
    page,
}) => {
    const mock = await mockCalendar(page, [
        event(1, 'Zadanie po terminie', {
            date: '2026-10-05',
            startAt: null,
            endAt: null,
            dueAt: '2026-10-05T07:30:00.000Z',
        }),
        event(2, 'Zadanie później dzisiaj', {
            date: '2026-10-05',
            startAt: null,
            endAt: null,
            dueAt: '2026-10-05T08:30:00.000Z',
        }),
        event(3, 'Zadanie do końca dnia', {
            date: '2026-10-05',
            startAt: null,
            endAt: null,
        }),
    ])

    await page.goto('/main/calendar?date=2026-10-05')

    await page.getByRole('button', { name: 'Lista', exact: true }).click()

    const expired = page.getByRole('button', {
        name: 'Wydarzenie: Zadanie po terminie',
        exact: true,
    })

    const future = page.getByRole('button', {
        name: 'Wydarzenie: Zadanie później dzisiaj',
        exact: true,
    })

    const day = page.getByRole('button', {
        name: 'Wydarzenie: Zadanie do końca dnia',
        exact: true,
    })

    await expect(expired).toContainText('Termin: 09:30')

    await expect(expired).toContainText('Po terminie')

    await expect(future).toContainText('Termin: 10:30')

    await expect(future).not.toContainText('Po terminie')

    await expect(day).toContainText('Bez godziny')

    await expect(day).not.toContainText('Po terminie')

    await expect(expired).toHaveCount(1)

    await expired.click()

    const details = page.getByRole('dialog', {
        name: 'Wydarzenie',
        exact: true,
    })

    await expect(details).toContainText('09:30')

    await expect(details).toContainText('termin zadania')

    const completed = waitMutation(page, 'events', 'PATCH', 1)

    await details
        .getByRole('button', { name: 'Oznacz jako wykonane', exact: true })
        .click()

    expect((await completed).postDataJSON()).toEqual({ isDone: true })

    await expect(details).not.toBeVisible()

    await expect(expired).not.toContainText('Po terminie')

    await expect(expired).toContainText('Wykonane')

    expect(mutations(mock)).toHaveLength(1)

    await noOverflow(page)
})
