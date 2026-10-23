import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { Manager, ManagerRole } from '../src/api/managers/managers.types'
import type { Task, SaveTaskDto } from '../src/api/tasks/tasks.types'
import { selectOption } from './helpers/select-option'

test.use({ timezoneId: 'America/Los_Angeles' })

const dates = {
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
}

const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
}).format(new Date())

function day(offset: number) {
    const value = new Date(`${today}T12:00:00Z`)

    value.setUTCDate(value.getUTCDate() + offset)

    return value.toISOString().slice(0, 10)
}

function worker(
    id: number,
    name: string,
    role: ManagerRole,
    status: Manager['status'] = 'active',
): Manager {
    return {
        id,
        name,
        surname: 'Testowy',
        email: `worker${id}@example.test`,
        status,
        roles: [{ id, name: role }],
        phone: null,
        position: null,
        avatarId: null,
        remindersEnabled: false,
        lastLoginAt: null,
        ...dates,
    }
}

const workers = [
    worker(1, 'Anna', 'admin'),
    worker(2, 'Piotr', 'manager'),
    worker(3, 'Olena', 'sender'),
    worker(4, 'Karol', 'admin'),
    worker(5, 'Zablokowany', 'manager', 'blocked'),
]

function task(id: number, overrides: Partial<Task> = {}): Task {
    const assignedManagerId = id % 2 ? 1 : 2

    const dueDate =
        id <= 24
            ? today
            : id <= 30
              ? day(-1)
              : id <= 36
                ? day(1)
                : id <= 44
                  ? null
                  : day(-2)

    return {
        id,
        title: `Zadanie ${id} — sprawdzenie dokumentów`,
        description: 'Sprawdź kompletność dokumentów i zapisz wynik.',
        status: id > 44 ? 'done' : id % 7 === 0 ? 'in_progress' : 'todo',
        priority: id % 5 === 0 ? 'urgent' : id % 3 === 0 ? 'high' : 'normal',
        isDone: id > 44,
        assignedManagerId,
        assignedManagerName: `${workers[assignedManagerId - 1].name} Testowy`,
        clientId: null,
        clientName: null,
        processId: null,
        processTitle: null,
        clientStageId: null,
        clientStageTitle: null,
        calendarId: dueDate ? assignedManagerId + 100 : null,
        dueDate,
        dueTime: id === 1 ? '09:30' : null,
        dueAt: null,
        date: dueDate,
        weekStart: null,
        startAt: null,
        endAt: null,
        scheduleKind: dueDate ? (id === 1 ? 'deadline' : 'date') : 'none',
        isRecurring: false,
        canEdit: true,
        canDelete: true,
        ...dates,
        ...overrides,
    }
}

async function fixture(page: Page, role: ManagerRole = 'admin') {
    const profile =
        role === 'sender'
            ? workers[2]
            : role === 'manager'
              ? { ...workers[0], roles: [{ id: 2, name: 'manager' as const }] }
              : workers[0]

    const state = {
        requests: [] as Request[],
        unknown: [] as string[],
        failList: false,
        failSave: false,
        gate: undefined as Promise<void> | undefined,
        rows: Array.from({ length: 50 }, (_, index) => task(index + 1)),
    }

    if (role === 'sender')
        state.rows = [
            task(1, {
                assignedManagerId: 3,
                assignedManagerName: 'Olena Testowy',
            }),
            task(2, { assignedManagerId: 2 }),
        ]

    const clients = [
        {
            id: 301,
            name: 'Iryna',
            surname: 'Koval',
            managerId: 1,
            status: 'active',
            priority: 'normal',
            isPrivate: true,
            archivedAt: null,
            ...dates,
        },
        {
            id: 302,
            name: 'Oleh',
            surname: 'Bondar',
            managerId: 2,
            status: 'active',
            priority: 'normal',
            isPrivate: true,
            archivedAt: null,
            ...dates,
        },
    ]

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'tasks-mock-session'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        const method = request.method()

        const send = (json: unknown, status = 200) =>
            route.fulfill({
                json,
                status,
                headers: { 'access-control-allow-origin': '*' },
            })

        if (method === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': '*',
                    'access-control-allow-headers': '*',
                },
            })

        state.requests.push(request)

        const paginated = (rows: unknown[]) => {
            const pageNumber = Number(url.searchParams.get('page') ?? 1)

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const offset = Number(
                url.searchParams.get('offset') ?? (pageNumber - 1) * limit,
            )

            return {
                rows: rows.slice(offset, offset + limit),
                total: rows.length,
                page: pageNumber,
                limit,
                offset,
            }
        }

        if (path === '/managers/me') return send(profile)

        if (
            path === '/document-upload-notifications' ||
            path === '/note-mention-notifications'
        )
            return send({ ...paginated([]), unreadCount: 0 })

        if (path === '/managers')
            return send(
                paginated(
                    workers.filter(
                        (item) =>
                            !url.searchParams.get('status') ||
                            item.status === url.searchParams.get('status'),
                    ),
                ),
            )

        const managerId = path.match(/^\/managers\/(\d+)$/)?.[1]

        if (managerId)
            return send(workers.find((item) => item.id === Number(managerId)))

        if (path === '/clients')
            return send(
                paginated(
                    clients.filter(
                        (item) =>
                            !url.searchParams.get('managerId') ||
                            item.managerId ===
                                Number(url.searchParams.get('managerId')),
                    ),
                ),
            )

        if (/^\/clients\/30[12]$/.test(path))
            return send(
                clients.find((item) => item.id === Number(path.split('/')[2])),
            )

        if (/^\/clients\/30[12]\/processes$/.test(path))
            return send(
                paginated([
                    {
                        id: 11,
                        clientId: Number(path.split('/')[2]),
                        managerId: 1,
                        title: 'Pobyt czasowy',
                        status: 'active',
                        ...dates,
                    },
                ]),
            )

        if (/^\/clients\/30[12]\/processes\/11\/stages$/.test(path))
            return send(
                paginated([
                    {
                        id: 21,
                        clientProcessId: 11,
                        title: 'Kompletowanie dokumentów',
                        status: 'active',
                        color: '#4676B4',
                        iconId: null,
                        sortKey: 1000,
                        ...dates,
                    },
                ]),
            )

        if (path === '/tasks' && method === 'GET') {
            if (state.gate) await state.gate

            if (state.failList) return send({ message: 'Unavailable' }, 400)

            const scope =
                role === 'admin'
                    ? (url.searchParams.get('scope') ?? 'team')
                    : 'mine'

            const view = url.searchParams.get('view') ?? 'today'

            const search = (
                url.searchParams.get('search') ?? ''
            ).toLocaleLowerCase('pl')

            const filteredManager = Number(url.searchParams.get('managerId'))

            return send(
                paginated(
                    state.rows.filter(
                        (item) =>
                            (scope !== 'mine' ||
                                item.assignedManagerId === profile.id) &&
                            (!filteredManager ||
                                item.assignedManagerId === filteredManager) &&
                            (!url.searchParams.get('status') ||
                                item.status ===
                                    url.searchParams.get('status')) &&
                            (!url.searchParams.get('priority') ||
                                item.priority ===
                                    url.searchParams.get('priority')) &&
                            (!search ||
                                `${item.title} ${item.description ?? ''}`
                                    .toLocaleLowerCase('pl')
                                    .includes(search)) &&
                            (view === 'all' || view === 'completed'
                                ? view === 'all' || item.status === 'done'
                                : item.status !== 'done' &&
                                  (view === 'today'
                                      ? item.dueDate === today
                                      : view === 'overdue'
                                        ? !!item.dueDate && item.dueDate < today
                                        : view === 'upcoming'
                                          ? !!item.dueDate &&
                                            item.dueDate > today
                                          : item.dueDate === null)),
                    ),
                ),
            )
        }

        if (
            (path === '/tasks' && method === 'POST') ||
            (/^\/tasks\/\d+$/.test(path) && method === 'PATCH')
        ) {
            if (state.failSave)
                return send({ message: 'Temporary failure' }, 503)

            const dto = request.postDataJSON() as SaveTaskDto

            const id = method === 'POST' ? 100 : Number(path.split('/')[2])

            const previous =
                state.rows.find((item) => item.id === id) ??
                task(id, { dueDate: null, dueTime: null, scheduleKind: 'none' })

            const assignedId =
                dto.assignedManagerId ??
                (method === 'POST' ? profile.id : previous.assignedManagerId)

            const linkedClient = clients.find(
                (item) => item.id === dto.clientId,
            )

            const row: Task = {
                ...previous,
                ...dto,
                description:
                    dto.description === undefined
                        ? previous.description
                        : dto.description,
                assignedManagerId: assignedId,
                assignedManagerName: `${workers.find((item) => item.id === assignedId)?.name} Testowy`,
                dueDate:
                    dto.dueDate === undefined ? previous.dueDate : dto.dueDate,
                dueTime:
                    dto.dueTime === undefined ? previous.dueTime : dto.dueTime,
                clientId:
                    dto.clientId === undefined
                        ? previous.clientId
                        : dto.clientId,
                clientName:
                    dto.clientId === undefined
                        ? previous.clientName
                        : linkedClient
                          ? `${linkedClient.name} ${linkedClient.surname}`
                          : null,
                clientStageId:
                    dto.clientStageId === undefined
                        ? previous.clientStageId
                        : dto.clientStageId,
                processId:
                    dto.clientStageId === undefined
                        ? previous.processId
                        : dto.clientStageId
                          ? 11
                          : null,
                processTitle:
                    dto.clientStageId === undefined
                        ? previous.processTitle
                        : dto.clientStageId
                          ? 'Pobyt czasowy'
                          : null,
                clientStageTitle:
                    dto.clientStageId === undefined
                        ? previous.clientStageTitle
                        : dto.clientStageId
                          ? 'Kompletowanie dokumentów'
                          : null,
                isDone: dto.status ? dto.status === 'done' : previous.isDone,
            }

            state.rows = [
                ...state.rows.filter((item) => item.id !== id),
                row,
            ].sort((a, b) => a.id - b.id)

            return send(row, method === 'POST' ? 201 : 200)
        }

        const id = path.match(/^\/tasks\/(\d+)$/)?.[1]

        if (id && method === 'DELETE') {
            state.rows = state.rows.filter((item) => item.id !== Number(id))

            return send({ success: true })
        }

        if (id && method === 'GET')
            return send(
                state.rows.find((item) => item.id === Number(id)),
                state.rows.some((item) => item.id === Number(id)) ? 200 : 404,
            )

        state.unknown.push(`${method} ${path}`)

        return send({ message: 'Unexpected endpoint' }, 404)
    })

    return state
}

function requests(
    state: { requests: Request[] },
    path: string,
    method = 'GET',
) {
    return state.requests.filter(
        (request) =>
            new URL(request.url()).pathname === path &&
            request.method() === method,
    )
}

test('task views use server pagination, filters, team and mine scope without preloading the whole list', async ({
    page,
}, info) => {
    const state = await fixture(page)

    await page.goto('/main/tasks')

    await expect(
        page.getByText('1–20 z 24 zadań', { exact: true }),
    ).toBeVisible()

    const initialRequests = requests(state, '/tasks')

    expect(initialRequests.length).toBeGreaterThan(0)

    for (const request of initialRequests) {
        const params = new URL(request.url()).searchParams

        expect(params.get('page')).toBe('1')

        expect(params.get('limit')).toBe('20')
    }

    expect(
        new URL(requests(state, '/tasks')[0].url()).searchParams.get('limit'),
    ).toBe('20')

    await expect(
        page.getByRole('button', { name: 'Poprzednia', exact: true }),
    ).toBeDisabled()

    await page.getByRole('button', { name: 'Następna', exact: true }).click()

    await expect(
        page.getByText('21–24 z 24 zadań', { exact: true }),
    ).toBeVisible()

    await page
        .getByRole('searchbox', { name: 'Szukaj zadania' })
        .fill('Zadanie 22 —')

    await expect(
        page.getByText('1–1 z 1 zadania', { exact: true }),
    ).toBeVisible()

    const searched = new URL(requests(state, '/tasks').at(-1)!.url())

    expect(searched.searchParams.get('page')).toBe('1')

    expect(searched.searchParams.get('search')).toBe('Zadanie 22 —')

    await page.getByRole('searchbox', { name: 'Szukaj zadania' }).fill('')

    await expect(
        page.getByText('1–20 z 24 zadań', { exact: true }),
    ).toBeVisible()

    for (const [name, value, count] of [
        ['Zaległe', 'overdue', 6],
        ['Nadchodzące', 'upcoming', 6],
        ['Bez terminu', 'no_due', 8],
        ['Wykonane', 'completed', 6],
    ] as const) {
        await page.getByRole('tab', { name, exact: true }).click()

        await expect(
            page.getByText(`1–${count} z ${count} zadań`, { exact: true }),
        ).toBeVisible()

        expect(
            new URL(requests(state, '/tasks').at(-1)!.url()).searchParams.get(
                'view',
            ),
        ).toBe(value)
    }

    await expect(
        page.getByRole('combobox', { name: 'Status zadania' }),
    ).toBeDisabled()

    await page.getByRole('tab', { name: 'Wykonane', exact: true }).press('Home')

    await expect(
        page.getByRole('tab', { name: 'Dzisiaj', exact: true }),
    ).toBeFocused()

    await expect(page.getByRole('tabpanel')).toHaveAttribute(
        'aria-labelledby',
        'tasks-view-today',
    )

    await page.getByRole('tab', { name: 'Dzisiaj', exact: true }).click()

    await selectOption(
        page.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
        '2',
    )

    await expect(
        page.getByText('1–12 z 12 zadań', { exact: true }),
    ).toBeVisible()

    expect(
        new URL(requests(state, '/tasks').at(-1)!.url()).searchParams.get(
            'managerId',
        ),
    ).toBe('2')

    await page.getByRole('button', { name: 'Moje', exact: true }).click()

    await expect(
        page.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
    ).toHaveCount(0)

    await expect
        .poll(() =>
            new URL(requests(state, '/tasks').at(-1)!.url()).searchParams.get(
                'scope',
            ),
        )
        .toBe('mine')

    expect(
        new URL(requests(state, '/tasks').at(-1)!.url()).searchParams.has(
            'managerId',
        ),
    ).toBe(false)

    await selectOption(
        page.getByRole('combobox', { name: 'Priorytet zadania' }),
        'urgent',
    )

    await expect(page.getByRole('article')).toHaveCount(2)

    await selectOption(
        page.getByRole('combobox', { name: 'Status zadania' }),
        'todo',
    )

    await expect(page.getByRole('article')).toHaveCount(2)

    mkdirSync('/tmp/atimi-tasks-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-tasks-shots/compact-list-${info.project.name}.png`,
        fullPage: true,
    })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)

    expect(state.unknown).toEqual([])
})

test('administrator creates a timed standalone task for an active worker with one task request', async ({
    page,
}, info) => {
    const state = await fixture(page)

    await page.goto('/main/tasks')

    await page
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .first()
        .click()

    const dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Tytuł zadania', { exact: true })
        .fill('Oddzwoń do klienta')

    await dialog
        .getByLabel('Opis (opcjonalnie)', { exact: true })
        .fill('Potwierdź termin i wymagane dokumenty.')

    await selectOption(
        dialog.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
        '2',
    )

    await selectOption(
        dialog.getByRole('combobox', { name: 'Priorytet', exact: true }),
        'urgent',
    )

    await selectOption(
        dialog.getByRole('combobox', { name: 'Status', exact: true }),
        'in_progress',
    )

    await expect(
        dialog.getByLabel('Godzina (opcjonalnie)', { exact: true }),
    ).toBeDisabled()

    await dialog.getByLabel('Termin (opcjonalnie)', { exact: true }).fill(today)

    await dialog
        .getByLabel('Godzina (opcjonalnie)', { exact: true })
        .fill('10:45')

    await expect(
        dialog.getByText(/Bez godziny ma termin do końca/),
    ).toBeVisible()

    await expect
        .poll(() =>
            dialog.evaluate(
                (element) => element.scrollWidth <= element.clientWidth,
            ),
        )
        .toBe(true)

    mkdirSync('/tmp/atimi-tasks-shots', { recursive: true })

    await dialog.locator('[data-popup-panel]').evaluate((element) => {
        element.scrollTop = 0
    })

    await page.screenshot({
        path: `/tmp/atimi-tasks-shots/create-${info.project.name}.png`,
        fullPage: false,
    })

    await dialog
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(requests(state, '/tasks', 'POST')).toHaveLength(1)

    expect(requests(state, '/tasks', 'POST')[0].postDataJSON()).toEqual({
        title: 'Oddzwoń do klienta',
        description: 'Potwierdź termin i wymagane dokumenty.',
        assignedManagerId: 2,
        dueDate: today,
        dueTime: '10:45',
        priority: 'urgent',
        status: 'in_progress',
    })

    expect(
        state.requests
            .filter((request) => request.method() !== 'GET')
            .map((request) => new URL(request.url()).pathname),
    ).toEqual(['/tasks'])

    expect(requests(state, '/clients')).toHaveLength(0)

    expect(state.unknown).toEqual([])
})

test('manager saves and clears a date without assigning another employee or duplicating the calendar record', async ({
    page,
}) => {
    const state = await fixture(page, 'manager')

    state.rows = [task(1, { dueTime: null, assignedManagerId: 1 })]

    await page.goto('/main/tasks')

    await expect(
        page.getByRole('article').getByText('Do końca dnia', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: /Otwórz zadanie:/ }).click()

    let dialog = page.getByRole('dialog')

    await expect(
        dialog.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
    ).toHaveCount(0)

    await dialog
        .getByLabel('Tytuł zadania', { exact: true })
        .fill('Sprawdź dokumenty — uzupełnione')

    await dialog
        .getByRole('button', { name: 'Usuń termin', exact: true })
        .click()

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(requests(state, '/tasks/1', 'PATCH')[0].postDataJSON()).toEqual({
        title: 'Sprawdź dokumenty — uzupełnione',
        description: 'Sprawdź kompletność dokumentów i zapisz wynik.',
        dueDate: null,
        dueTime: null,
        priority: 'normal',
        status: 'todo',
    })

    await page.getByRole('tab', { name: 'Bez terminu', exact: true }).click()

    await expect(
        page.getByRole('article').getByText('Bez terminu', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: /Otwórz zadanie:/ }).click()

    dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Termin (opcjonalnie)', { exact: true })
        .fill(day(1))

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(
        requests(state, '/tasks/1', 'PATCH').at(-1)!.postDataJSON().dueDate,
    ).toBe(day(1))

    expect(
        requests(state, '/tasks/1', 'PATCH').at(-1)!.postDataJSON().dueTime,
    ).toBeNull()

    expect(requests(state, '/managers')).toHaveLength(0)

    expect(state.unknown).toEqual([])
})

test('sender-only can create and complete own standalone tasks without requesting employee or client data', async ({
    page,
}) => {
    const state = await fixture(page, 'sender')

    await page.goto('/main/tasks')

    await expect(page.getByRole('article')).toHaveCount(1)

    const menu = page.getByRole('button', { name: 'Otwórz menu', exact: true })

    if (await menu.isVisible()) await menu.click()

    await expect(
        page.getByRole('link', { name: 'Zadania', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'Klienci', exact: true }),
    ).toHaveCount(0)

    if (
        await page
            .getByRole('button', { name: 'Zamknij menu', exact: true })
            .isVisible()
    )
        await page
            .getByRole('button', { name: 'Zamknij menu', exact: true })
            .click()

    await page
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .first()
        .click()

    const dialog = page.getByRole('dialog')

    await expect(
        dialog.getByRole('button', { name: 'Dodaj powiązanie', exact: true }),
    ).toHaveCount(0)

    await dialog
        .getByLabel('Tytuł zadania', { exact: true })
        .fill('Przygotuj rozsyłkę')

    await dialog
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(
        requests(state, '/tasks', 'POST')[0].postDataJSON(),
    ).not.toHaveProperty('assignedManagerId')

    expect(
        requests(state, '/tasks', 'POST')[0].postDataJSON(),
    ).not.toHaveProperty('clientId')

    const row = page.getByRole('article').first()

    await row.getByRole('checkbox').click()

    await expect(page.getByRole('article')).toHaveCount(0)

    expect(requests(state, '/tasks/1', 'PATCH')[0].postDataJSON()).toEqual({
        status: 'done',
    })

    expect(
        state.requests.some(
            (request) =>
                /^\/(clients|managers)(\/|$)/.test(
                    new URL(request.url()).pathname,
                ) && new URL(request.url()).pathname !== '/managers/me',
        ),
    ).toBe(false)

    expect(state.unknown).toEqual([])
})

test('admin links to an assignee client and stage, while sender assignees stay standalone', async ({
    page,
}) => {
    const state = await fixture(page)

    await page.goto('/main/tasks')

    await page
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .first()
        .click()

    let dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Tytuł zadania', { exact: true })
        .fill('Uzupełnij załączniki')

    await selectOption(
        dialog.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
        '2',
    )

    await dialog
        .getByRole('button', { name: 'Dodaj powiązanie', exact: true })
        .click()

    await selectOption(
        dialog.getByRole('combobox', { name: 'Klient', exact: true }),
        '302',
    )

    expect(
        new URL(requests(state, '/clients').at(-1)!.url()).searchParams.get(
            'managerId',
        ),
    ).toBe('2')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Sprawa klienta (opcjonalnie)' }),
        '11',
    )

    await selectOption(
        dialog.getByRole('combobox', { name: 'Etap klienta (opcjonalnie)' }),
        '21',
    )

    await dialog
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(requests(state, '/tasks', 'POST')[0].postDataJSON()).toMatchObject({
        assignedManagerId: 2,
        clientId: 302,
        clientStageId: 21,
    })

    await page
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .first()
        .click()

    dialog = page.getByRole('dialog')

    await selectOption(
        dialog.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
        '3',
    )

    const previousClientRequests = requests(state, '/clients').length

    await dialog
        .getByRole('button', { name: 'Dodaj powiązanie', exact: true })
        .click()

    await expect(
        dialog.getByText(
            'Pracownik z rolą Sender otrzymuje zadania bez powiązania z klientem.',
        ),
    ).toBeVisible()

    await expect(
        dialog.getByRole('combobox', { name: 'Klient', exact: true }),
    ).toHaveCount(0)

    expect(requests(state, '/clients')).toHaveLength(previousClientRequests)

    await selectOption(
        dialog.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
        '4',
    )

    await expect(
        dialog.getByRole('combobox', { name: 'Klient', exact: true }),
    ).toBeVisible()

    await expect
        .poll(() => requests(state, '/clients').length)
        .toBeGreaterThan(previousClientRequests)

    expect(
        new URL(requests(state, '/clients').at(-1)!.url()).searchParams.has(
            'managerId',
        ),
    ).toBe(false)

    expect(state.unknown).toEqual([])
})

test('reassigning a linked task requires explicit relationship review and unchanged links are omitted from updates', async ({
    page,
}) => {
    const state = await fixture(page)

    state.rows = [
        task(1, {
            clientId: 301,
            clientName: 'Iryna Koval',
            processId: 11,
            processTitle: 'Pobyt czasowy',
            clientStageId: 21,
            clientStageTitle: 'Kompletowanie dokumentów',
        }),
    ]

    await page.goto('/main/tasks')

    await expect(
        page.getByRole('link', {
            name: 'Iryna Koval · Kompletowanie dokumentów',
            exact: true,
        }),
    ).toHaveAttribute('href', '/main/clients/301?processId=11&stageId=21')

    await page.getByRole('button', { name: /Otwórz zadanie:/ }).click()

    let dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Tytuł zadania', { exact: true })
        .fill('Tylko zmiana tytułu')

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    const first = requests(state, '/tasks/1', 'PATCH')[0].postDataJSON()

    expect(first).not.toHaveProperty('clientId')

    expect(first).not.toHaveProperty('clientStageId')

    expect(first).not.toHaveProperty('dueDate')

    await page.getByRole('button', { name: /Otwórz zadanie:/ }).click()

    dialog = page.getByRole('dialog')

    await selectOption(
        dialog.getByRole('combobox', {
            name: 'Osoba odpowiedzialna',
            exact: true,
        }),
        '3',
    )

    await expect(
        dialog.getByText(
            /Zmiana osoby odpowiedzialnej wymaga sprawdzenia powiązania/,
        ),
    ).toBeVisible()

    await expect(
        dialog.getByRole('button', { name: 'Zapisz zmiany', exact: true }),
    ).toBeDisabled()

    await dialog
        .getByRole('button', { name: 'Pozostaw bez klienta', exact: true })
        .click()

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(
        requests(state, '/tasks/1', 'PATCH').at(-1)!.postDataJSON(),
    ).toMatchObject({
        assignedManagerId: 3,
        clientId: null,
        clientStageId: null,
    })

    expect(state.unknown).toEqual([])
})

test('legacy meetings, weekly tasks and recurrence remain read only and open the correct employee calendar', async ({
    page,
}) => {
    const state = await fixture(page)

    state.rows = [
        task(1, {
            assignedManagerId: 2,
            assignedManagerName: 'Piotr Testowy',
            canEdit: false,
            canDelete: false,
            scheduleKind: 'event',
            isRecurring: true,
            dueDate: today,
            dueTime: '12:30',
        }),
        task(2, { scheduleKind: 'week', canEdit: false, canDelete: false }),
    ]

    await page.goto('/main/tasks')

    await expect(
        page.getByRole('article').first().getByRole('checkbox'),
    ).toBeDisabled()

    await expect(
        page.getByRole('button', { name: /Działania zadania:/ }),
    ).toHaveCount(0)

    await page
        .getByRole('button', { name: /Otwórz zadanie:/ })
        .first()
        .click()

    const dialog = page.getByRole('dialog')

    await expect(dialog.getByRole('textbox')).toHaveCount(0)

    await expect(
        dialog.getByRole('link', { name: 'Otwórz w kalendarzu' }),
    ).toHaveAttribute('href', `/main/managers/2/calendar?date=${today}`)

    await expect(dialog.getByText('12:30 · Warszawa')).toBeVisible()

    expect(state.requests.every((request) => request.method() === 'GET')).toBe(
        true,
    )

    expect(state.unknown).toEqual([])
})

test('task status, deletion confirmation and save failures preserve input without retrying a write', async ({
    page,
}) => {
    const state = await fixture(page, 'manager')

    state.rows = [task(1)]

    await page.goto('/main/tasks')

    await page.getByRole('button', { name: /Działania zadania:/ }).click()

    await page
        .getByRole('button', { name: 'Rozpocznij zadanie', exact: true })
        .click()

    await expect(
        page.getByRole('article').getByText('W trakcie', { exact: true }),
    ).toBeVisible()

    expect(requests(state, '/tasks/1', 'PATCH')[0].postDataJSON()).toEqual({
        status: 'in_progress',
    })

    await page.getByRole('button', { name: /Otwórz zadanie:/ }).click()

    const dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Tytuł zadania', { exact: true })
        .fill('Zachowaj wersję po błędzie')

    state.failSave = true

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(
        dialog.getByLabel('Tytuł zadania', { exact: true }),
    ).toHaveValue('Zachowaj wersję po błędzie')

    expect(requests(state, '/tasks/1', 'PATCH')).toHaveLength(2)

    state.failSave = false

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(requests(state, '/tasks/1', 'PATCH')).toHaveLength(3)

    await page.getByRole('button', { name: /Działania zadania:/ }).click()

    await page
        .getByRole('button', { name: 'Usuń zadanie', exact: true })
        .click()

    await expect(page.getByRole('dialog')).toContainText(
        'Powiązany wpis zniknie również z kalendarza.',
    )

    expect(requests(state, '/tasks/1', 'DELETE')).toHaveLength(0)

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Usuń zadanie', exact: true })
        .click()

    await expect(page.getByRole('article')).toHaveCount(0)

    expect(requests(state, '/tasks/1', 'DELETE')).toHaveLength(1)

    await page
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .first()
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Anuluj', exact: true })
        .click()

    await expect(page.getByRole('dialog')).not.toBeVisible()

    expect(state.unknown).toEqual([])
})

test('task list shows loading, retry and empty states without requesting the employee directory for a manager', async ({
    page,
}) => {
    const state = await fixture(page, 'manager')

    state.failList = true

    let release = () => {}

    state.gate = new Promise<void>((resolve) => {
        release = resolve
    })

    await page.goto('/main/tasks')

    await expect(
        page.getByText('Wczytywanie zadań…', { exact: true }),
    ).toBeVisible()

    release()

    await expect(
        page
            .getByRole('region', { name: 'Zadania zespołu' })
            .getByRole('alert'),
    ).toContainText('Nie udało się wczytać zadań.')

    state.failList = false

    state.rows = []

    await page
        .getByRole('button', { name: 'Wczytaj zadania ponownie', exact: true })
        .click()

    await expect(
        page.getByText('Brak zadań na dzisiaj.', { exact: true }),
    ).toBeVisible()

    expect(requests(state, '/managers')).toHaveLength(0)

    expect(state.unknown).toEqual([])
})

test('exact deadlines become overdue during their minute and active lists refresh as time advances', async ({
    page,
}) => {
    await page.clock.install({ time: new Date(`${today}T12:30:30Z`) })

    const state = await fixture(page, 'manager')

    const dueAt = `${today}T12:30:00.000Z`

    const dueTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Warsaw',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(dueAt))

    state.rows = [task(1, { dueAt, dueTime, assignedManagerId: 1 })]

    await page.goto('/main/tasks')

    await expect(page.getByRole('article').locator('time')).toHaveCSS(
        'color',
        'rgb(198, 73, 89)',
    )

    const initialRequests = requests(state, '/tasks').length

    await page.clock.runFor(60_001)

    await expect
        .poll(() => requests(state, '/tasks').length)
        .toBeGreaterThan(initialRequests)

    expect(state.unknown).toEqual([])
})
