import {
    test,
    expect,
    type Locator,
    type Page,
    type Request,
} from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'
import {
    PublicBucket,
    type PublicAsset,
} from '../src/api/public-assets/public-assets.types'
import type {
    CreateStageTemplateDto,
    StageTemplate,
} from '../src/api/stage-templates/stage-templates.types'
import type {
    CreateStageTemplateTaskDto,
    StageTemplateTask,
} from '../src/api/stage-template-tasks/stage-template-tasks.types'
import type { TaskType } from '../src/api/task-types/task-types.types'

const session = 'stage-templates-test-session'

const timestamps = {
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
}

const admin: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    email: 'anna@example.test',
    phone: null,
    position: null,
    avatarId: null,
    status: 'active',
    remindersEnabled: false,
    lastLoginAt: null,
    roles: [{ id: 1, name: 'admin' }],
    ...timestamps,
}

const png = readFileSync('tests/fixtures/icons/house.png')

const icons: PublicAsset[] = [150, 149].map((id) => ({
    id,
    bucket: PublicBucket.ICONS,
    relPath: `2026/10/ikona-${id}.png`,
    originalName: `ikona-${id}.png`,
    mimeType: 'image/png',
    sizeBytes: png.length,
    isPopular: id === 150,
    createdByManagerId: admin.id,
    ...timestamps,
}))

const types: TaskType[] = [
    {
        id: 3,
        name: 'Zadanie',
        iconId: 150,
        color: '#4676B4',
        reminderMinutes: [15],
        isActive: true,
        isDefault: true,
        ...timestamps,
    },
    {
        id: 6,
        name: 'Dokumenty',
        iconId: 149,
        color: '#7390BA',
        reminderMinutes: [1440, 60],
        isActive: true,
        isDefault: false,
        ...timestamps,
    },
]

function template(
    id: number,
    title: string,
    changes: Partial<StageTemplate> = {},
): StageTemplate {
    return {
        id,
        title,
        description: 'Szablon do wykorzystania w sprawach klientów.',
        iconId: 150,
        color: '#4676B4',
        isActive: true,
        ...timestamps,
        ...changes,
    }
}

function task(
    id: number,
    title: string,
    changes: Partial<StageTemplateTask> = {},
): StageTemplateTask {
    return {
        id,
        stageTemplateId: 1,
        taskTypeId: 3,
        title,
        description: null,
        sortKey: id * 1000,
        ...timestamps,
        ...changes,
    }
}

interface StageMock {
    manager: Manager
    templates: StageTemplate[]
    tasks: StageTemplateTask[]
    requests: Request[]
    listFails: boolean
    mutationFails: boolean
    mutationGate?: Promise<void>
}

function listResponse<T>(url: URL, rows: T[]) {
    const page = Number(url.searchParams.get('page') ?? 1)

    const limit = Number(url.searchParams.get('limit') ?? 20)

    const offset = Number(url.searchParams.get('offset') ?? (page - 1) * limit)

    return {
        rows: rows.slice(offset, offset + limit),
        total: rows.length,
        page,
        limit,
        offset,
    }
}

async function mockStages(
    page: Page,
    templates: StageTemplate[] = [template(1, 'Analiza potrzeb')],
    tasks: StageTemplateTask[] = [],
): Promise<StageMock> {
    const mock: StageMock = {
        manager: admin,
        templates,
        tasks,
        requests: [],
        listFails: false,
        mutationFails: false,
    }

    await page.addInitScript((token) => {
        localStorage.setItem('atimi:access_token', token)
    }, session)

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const method = request.method()

        if (method === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods':
                        'GET, POST, PATCH, DELETE, OPTIONS',
                    'access-control-allow-headers':
                        'Authorization, Content-Type',
                },
            })

        mock.requests.push(request)

        if (url.pathname === '/managers/me')
            return route.fulfill({ json: mock.manager })

        if (method === 'GET' && url.pathname === '/public-assets')
            return route.fulfill({ json: listResponse(url, icons) })

        const asset = url.pathname.match(/^\/public-assets\/(\d+)(\/file)?$/)

        if (method === 'GET' && asset) {
            const item = icons.find((item) => item.id === Number(asset[1]))

            if (asset[2])
                return route.fulfill({
                    body: png,
                    contentType: 'image/png',
                    headers: { 'access-control-allow-origin': '*' },
                })

            return route.fulfill({ json: item })
        }

        if (method === 'GET' && url.pathname === '/task-types')
            return route.fulfill({ json: listResponse(url, types) })

        if (method === 'GET' && url.pathname === '/stage-templates') {
            if (mock.listFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Stage templates unavailable' },
                })

            const isActive = url.searchParams.get('isActive')

            const search = url.searchParams.get('search')?.toLowerCase() ?? ''

            const rows = mock.templates
                .filter(
                    (row) =>
                        (isActive === null ||
                            row.isActive === (isActive === 'true')) &&
                        row.title.toLowerCase().includes(search),
                )
                .sort((first, second) => second.id - first.id)

            return route.fulfill({ json: listResponse(url, rows) })
        }

        const item = url.pathname.match(/^\/stage-templates\/(\d+)$/)

        if (method === 'GET' && item)
            return route.fulfill({
                json: mock.templates.find((row) => row.id === Number(item[1])),
            })

        const taskRoute = url.pathname.match(
            /^\/stage-templates\/(\d+)\/tasks(?:\/(\d+)(\/order)?)?$/,
        )

        if (method === 'GET' && taskRoute) {
            const search = url.searchParams.get('search')?.toLowerCase() ?? ''

            const rows = mock.tasks
                .filter(
                    (row) =>
                        row.stageTemplateId === Number(taskRoute[1]) &&
                        row.title.toLowerCase().includes(search),
                )
                .sort(
                    (first, second) =>
                        first.sortKey - second.sortKey || first.id - second.id,
                )
                .map((row) => ({
                    ...row,
                    taskType: types.find((type) => type.id === row.taskTypeId),
                }))

            return route.fulfill({ json: listResponse(url, rows) })
        }

        if (['POST', 'PATCH', 'DELETE'].includes(method)) {
            if (mock.mutationGate) await mock.mutationGate

            if (mock.mutationFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Stage mutation unavailable' },
                })

            if (method === 'POST' && url.pathname === '/stage-templates') {
                const changes: CreateStageTemplateDto = request.postDataJSON()

                const row = template(
                    Math.max(0, ...mock.templates.map((row) => row.id)) + 1,
                    '',
                    changes,
                )

                mock.templates.push(row)

                return route.fulfill({ status: 201, json: row })
            }

            if (method === 'PATCH' && item) {
                const row = mock.templates.find(
                    (row) => row.id === Number(item[1]),
                )

                Object.assign(row ?? {}, request.postDataJSON())

                return route.fulfill({ json: row })
            }

            if (taskRoute) {
                const templateId = Number(taskRoute[1])

                const id = taskRoute[2] ? Number(taskRoute[2]) : undefined

                if (method === 'POST') {
                    const changes: CreateStageTemplateTaskDto =
                        request.postDataJSON()

                    const row = task(
                        Math.max(0, ...mock.tasks.map((row) => row.id)) + 1,
                        '',
                        { ...changes, stageTemplateId: templateId },
                    )

                    mock.tasks.push(row)

                    return route.fulfill({ status: 201, json: row })
                }

                if (method === 'DELETE') {
                    mock.tasks = mock.tasks.filter(
                        (row) =>
                            row.id !== id || row.stageTemplateId !== templateId,
                    )

                    return route.fulfill({ json: { success: true } })
                }

                const row = mock.tasks.find(
                    (row) =>
                        row.id === id && row.stageTemplateId === templateId,
                )

                if (taskRoute[3]) {
                    const rows = mock.tasks
                        .filter((row) => row.stageTemplateId === templateId)
                        .sort((first, second) => first.sortKey - second.sortKey)

                    const index = rows.findIndex((row) => row.id === id)

                    const { direction }: { direction: 'up' | 'down' } =
                        request.postDataJSON()

                    const target = index + (direction === 'up' ? -1 : 1)

                    if (index >= 0 && target >= 0 && target < rows.length)
                        [rows[index], rows[target]] = [
                            rows[target],
                            rows[index],
                        ]

                    rows.forEach((row, index) => {
                        row.sortKey = (index + 1) * 1000
                    })

                    return route.fulfill({ json: rows })
                }

                Object.assign(row ?? {}, request.postDataJSON())

                return route.fulfill({ json: row })
            }
        }

        return route.fulfill({
            status: 404,
            json: { message: 'Unexpected stage constructor test request' },
        })
    })

    return mock
}

function mutations(mock: StageMock) {
    return mock.requests.filter((request) =>
        ['POST', 'PATCH', 'DELETE'].includes(request.method()),
    )
}

async function noScheduling(dialog: Locator) {
    await expect(
        dialog.locator(
            'input[type="date"], input[type="time"], input[type="datetime-local"]',
        ),
    ).toHaveCount(0)

    await expect(
        dialog.getByRole('checkbox', {
            name: /przypomn|bez godziny|wykonane/i,
        }),
    ).toHaveCount(0)
}

async function noOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
}

async function screenshot(page: Page, name: string) {
    mkdirSync('/tmp/ivan-stage-templates-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-stage-templates-qa/${name}.png`,
        animations: 'disabled',
    })
}

async function openTemplate(page: Page, title = 'Analiza potrzeb') {
    await page
        .getByRole('button', { name: `Otwórz etap ${title}`, exact: true })
        .click()

    return page.getByRole('dialog', { name: title, exact: true })
}

test('admin creates a styled reusable stage without dates or default reminders', async ({
    page,
}, info) => {
    const mock = await mockStages(page, [])

    await page.goto('/main/management/stages')

    const block = page.getByRole('region', { name: 'Konstruktor etapów' })

    await block.getByRole('button', { name: 'Dodaj etap', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Nowy etap', exact: true })

    await dialog.getByLabel('Nazwa etapu', { exact: true }).fill('   ')

    await dialog
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('Nazwa etapu')

    await dialog
        .getByLabel('Nazwa etapu', { exact: true })
        .fill('  Przygotowanie oferty  ')

    await dialog
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('ikonę')

    expect(mutations(mock)).toHaveLength(0)

    await dialog
        .getByRole('button', { name: 'Wybierz ikonę', exact: true })
        .click()

    await dialog
        .getByRole('button', { name: 'ikona-149.png', exact: true })
        .click()

    await dialog.getByLabel('Własny kolor', { exact: true }).fill('#5a90a2')

    await dialog.getByLabel('Opis', { exact: true }).fill('  Zdjęcia i opis.  ')

    await expect(dialog.getByLabel('Podgląd etapu')).toHaveCSS(
        'color',
        'rgb(90, 144, 162)',
    )

    await noScheduling(dialog)

    await noOverflow(page)

    await screenshot(page, `stage-form-${info.project.name}`)

    await dialog
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(mutations(mock)).toHaveLength(1)

    expect(mutations(mock)[0].postDataJSON()).toEqual({
        title: 'Przygotowanie oferty',
        iconId: 149,
        color: '#5A90A2',
        description: 'Zdjęcia i opis.',
    })

    expect(mutations(mock)[0].headers().authorization).toBe(`Bearer ${session}`)

    const details = page.getByRole('dialog', {
        name: 'Przygotowanie oferty',
        exact: true,
    })

    await expect(
        details.getByRole('heading', { name: 'Zadania domyślne' }),
    ).toBeVisible()

    await noOverflow(page)

    await screenshot(page, `stage-details-${info.project.name}`)

    await details.getByRole('button', { name: 'Zamknij okno' }).click()

    await expect(
        block.getByText('Przygotowanie oferty', { exact: true }),
    ).toBeVisible()

    await screenshot(page, `stage-list-${info.project.name}`)
})

test('metadata changes preserve untouched settings, archive requires confirmation and restore does not delete', async ({
    page,
}) => {
    const mock = await mockStages(page, [
        template(1, 'Analiza potrzeb'),
        template(2, 'Finalizacja', { isActive: false }),
    ])

    await page.goto('/main/management/stages')

    const block = page.getByRole('region', { name: 'Konstruktor etapów' })

    const details = await openTemplate(page)

    await details
        .getByRole('button', { name: 'Edytuj etap', exact: true })
        .click()

    await details
        .getByLabel('Nazwa etapu', { exact: true })
        .fill('  Rozmowa z klientem  ')

    await details.getByLabel('Opis', { exact: true }).fill('')

    await details
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    const updated = page.getByRole('dialog', {
        name: 'Rozmowa z klientem',
        exact: true,
    })

    await expect(
        updated.getByRole('heading', { name: 'Zadania domyślne' }),
    ).toBeVisible()

    expect(mutations(mock)[0].postDataJSON()).toEqual({
        title: 'Rozmowa z klientem',
        description: null,
    })

    await updated.getByRole('button', { name: 'Zamknij okno' }).click()

    const archive = block.getByRole('button', {
        name: 'Archiwizuj etap Rozmowa z klientem',
        exact: true,
    })

    await archive.click()

    const confirmation = page.getByRole('dialog', {
        name: 'Archiwizować etap?',
        exact: true,
    })

    await expect(confirmation).toBeVisible()

    await confirmation
        .getByRole('button', { name: 'Anuluj', exact: true })
        .click()

    expect(mutations(mock)).toHaveLength(1)

    await archive.click()

    await confirmation
        .getByRole('button', { name: 'Archiwizuj', exact: true })
        .click()

    await expect(confirmation).not.toBeVisible()

    await expect(
        block.getByText('Rozmowa z klientem', { exact: true }),
    ).toHaveCount(0)

    expect(mutations(mock)[1].postDataJSON()).toEqual({ isActive: false })

    await block.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await block
        .getByRole('button', {
            name: 'Przywróć etap Rozmowa z klientem',
            exact: true,
        })
        .click()

    await expect(
        block.getByText('Rozmowa z klientem', { exact: true }),
    ).toHaveCount(0)

    expect(mutations(mock)[2].postDataJSON()).toEqual({ isActive: true })

    await block.getByRole('button', { name: 'Aktywne', exact: true }).click()

    await expect(
        block.getByText('Rozmowa z klientem', { exact: true }),
    ).toBeVisible()

    expect(mutations(mock)).toHaveLength(3)

    expect(
        mutations(mock).every((request) => request.method() === 'PATCH'),
    ).toBe(true)
})

test('default tasks select the default type and support typed create, edit, ordering and confirmed deletion without scheduling', async ({
    page,
}, info) => {
    const mock = await mockStages(page, undefined, [
        task(1, 'Zapisać potrzeby'),
    ])

    await page.goto('/main/management/stages')

    const details = await openTemplate(page)

    await details
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(
        details.getByLabel('Typ zadania', { exact: true }),
    ).toContainText('Zadanie')

    await details
        .getByLabel('Nazwa zadania', { exact: true })
        .fill('  Sprawdzić dokumenty  ')

    await noScheduling(details)

    await expect(details.getByRole('textbox')).toHaveCount(2)

    await details
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(
        details.getByText('Sprawdzić dokumenty', { exact: true }),
    ).toBeVisible()

    expect(mutations(mock)[0].postDataJSON()).toEqual({
        title: 'Sprawdzić dokumenty',
        taskTypeId: 3,
    })

    await details
        .getByRole('button', {
            name: 'Edytuj zadanie Sprawdzić dokumenty',
            exact: true,
        })
        .click()

    await details
        .getByLabel('Nazwa zadania', { exact: true })
        .fill('Sprawdzić księgę wieczystą')

    await details.getByLabel('Typ zadania', { exact: true }).click()

    await details
        .getByRole('button', { name: 'Dokumenty', exact: true })
        .click()

    await details
        .getByLabel('Opis zadania', { exact: true })
        .fill('  Porównać dane właściciela.  ')

    await noScheduling(details)

    await noOverflow(page)

    await screenshot(page, `task-form-${info.project.name}`)

    await details
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(
        details.getByText('Sprawdzić księgę wieczystą', { exact: true }),
    ).toBeVisible()

    expect(mutations(mock)[1].postDataJSON()).toEqual({
        title: 'Sprawdzić księgę wieczystą',
        taskTypeId: 6,
        description: 'Porównać dane właściciela.',
    })

    await details
        .getByRole('button', {
            name: 'Przesuń zadanie Sprawdzić księgę wieczystą w górę',
            exact: true,
        })
        .click()

    await expect(details.locator('ol > li strong').first()).toHaveText(
        'Sprawdzić księgę wieczystą',
    )

    expect(mutations(mock)[2].postDataJSON()).toEqual({ direction: 'up' })

    expect(new URL(mutations(mock)[2].url()).pathname).toBe(
        '/stage-templates/1/tasks/2/order',
    )

    await noOverflow(page)

    await screenshot(page, `tasks-${info.project.name}`)

    await details
        .getByRole('button', {
            name: 'Usuń zadanie Sprawdzić księgę wieczystą',
            exact: true,
        })
        .click()

    await expect(details.getByText(/Usunąć zadanie/)).toBeVisible()

    expect(mutations(mock)).toHaveLength(3)

    await details.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await details
        .getByRole('button', {
            name: 'Usuń zadanie Sprawdzić księgę wieczystą',
            exact: true,
        })
        .click()

    await details
        .getByRole('button', { name: 'Usuń zadanie', exact: true })
        .click()

    await expect(
        details.getByText('Sprawdzić księgę wieczystą', { exact: true }),
    ).toHaveCount(0)

    await expect(
        details.getByText('Zapisać potrzeby', { exact: true }),
    ).toBeVisible()

    expect(mutations(mock)).toHaveLength(4)

    expect(mutations(mock)[3].method()).toBe('DELETE')
})

test('a failed pending save retains values and can be retried without duplicate submission or premature closure', async ({
    page,
}) => {
    const mock = await mockStages(page)

    mock.mutationFails = true

    let release: (() => void) | undefined

    mock.mutationGate = new Promise((resolve) => {
        release = resolve
    })

    await page.goto('/main/management/stages')

    const details = await openTemplate(page)

    await details
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await details
        .getByLabel('Nazwa zadania', { exact: true })
        .fill('Zadanie zachowane po błędzie')

    await expect(
        details.getByLabel('Typ zadania', { exact: true }),
    ).toContainText('Zadanie')

    await details
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(
        details.getByLabel('Nazwa zadania', { exact: true }),
    ).toBeDisabled()

    await expect(
        details.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await expect(
        details.getByRole('button', { name: 'Zapisywanie…', exact: true }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(details).toBeVisible()

    release?.()

    await expect(details.getByRole('alert')).toContainText(
        'Nie udało się zapisać zadania',
    )

    await expect(
        details.getByLabel('Nazwa zadania', { exact: true }),
    ).toHaveValue('Zadanie zachowane po błędzie')

    expect(mutations(mock)).toHaveLength(1)

    mock.mutationFails = false

    await details
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(
        details.getByText('Zadanie zachowane po błędzie', { exact: true }),
    ).toBeVisible()

    expect(mutations(mock)).toHaveLength(2)

    expect(mutations(mock)[1].postDataJSON()).toEqual(
        mutations(mock)[0].postDataJSON(),
    )
})

test('list failures provide retry and a manager can inspect templates and tasks without write controls', async ({
    page,
}, info) => {
    const mock = await mockStages(
        page,
        [
            template(1, 'Analiza potrzeb'),
            template(2, 'Finalizacja', { isActive: false }),
        ],
        [task(1, 'Zapisać potrzeby')],
    )

    mock.listFails = true

    await page.goto('/main/management/stages')

    const block = page.getByRole('region', { name: 'Konstruktor etapów' })

    await expect(block.getByRole('alert')).toContainText(/Nie udało się/i)

    mock.listFails = false

    await block
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await expect(
        block.getByText('Analiza potrzeb', { exact: true }),
    ).toBeVisible()

    mock.manager = { ...admin, roles: [{ id: 2, name: 'manager' }] }

    await page.reload()

    await expect(
        block.getByText('Analiza potrzeb', { exact: true }),
    ).toBeVisible()

    await expect(
        block.getByRole('button', { name: 'Dodaj etap', exact: true }),
    ).toHaveCount(0)

    await expect(
        block.getByRole('button', {
            name: /^(Edytuj|Archiwizuj|Przywróć) etap/,
        }),
    ).toHaveCount(0)

    const details = await openTemplate(page)

    await expect(
        details.getByText('Zapisać potrzeby', { exact: true }),
    ).toBeVisible()

    await expect(
        details.getByRole('button', { name: /^(Dodaj|Edytuj|Usuń|Przesuń)/ }),
    ).toHaveCount(0)

    await noScheduling(details)

    await noOverflow(page)

    await screenshot(page, `manager-readonly-${info.project.name}`)

    await details.getByRole('button', { name: 'Zamknij okno' }).click()

    await block.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await expect(block.getByText('Finalizacja', { exact: true })).toBeVisible()

    expect(mutations(mock)).toHaveLength(0)
})
