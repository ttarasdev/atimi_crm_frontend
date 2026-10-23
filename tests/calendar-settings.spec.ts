import {
    test,
    expect,
    type Locator,
    type Page,
    type Request,
} from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'
import {
    PublicBucket,
    type PublicAsset,
} from '../src/api/public-assets/public-assets.types'

const session = 'calendar-settings-test-session'

const admin: Manager = {
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
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    roles: [{ id: 1, name: 'admin' }],
}

const png = readFileSync('tests/fixtures/icons/house.png')

interface EventTypeFixture {
    id: number
    name: string
    iconId: number
    color: string
    reminderMinutes: number[]
    isActive: boolean
    isDefault: boolean
    createdAt: string
    updatedAt: string
}

interface SettingsMock {
    manager: Manager
    types: EventTypeFixture[]
    icons: PublicAsset[]
    requests: Request[]
    listFails: boolean
    mutationFails: boolean
    mutationDelay: number
}

function icon(id: number, isPopular = false): PublicAsset {
    return {
        id,
        bucket: PublicBucket.ICONS,
        relPath: `2026/10/ikona-${id}.png`,
        originalName: `ikona-${id}.png`,
        mimeType: 'image/png',
        sizeBytes: png.length,
        isPopular,
        createdByManagerId: admin.id,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
    }
}

function eventType(
    id: number,
    name: string,
    changes: Partial<EventTypeFixture> = {},
): EventTypeFixture {
    return {
        id,
        name,
        iconId: 150,
        color: '#4676B4',
        reminderMinutes: [60, 10],
        isActive: true,
        isDefault: false,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
        ...changes,
    }
}

async function mockSettings(
    page: Page,
    types: EventTypeFixture[] = [eventType(1, 'Prezentacja')],
): Promise<SettingsMock> {
    const mock: SettingsMock = {
        manager: admin,
        types,
        icons: Array.from({ length: 150 }, (_, index) =>
            icon(150 - index, index < 2),
        ),
        requests: [],
        listFails: false,
        mutationFails: false,
        mutationDelay: 400,
    }

    await page.addInitScript((token) => {
        localStorage.setItem('atimi:access_token', token)
    }, session)

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        if (request.method() === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
                    'access-control-allow-headers':
                        'Authorization, Content-Type',
                },
            })

        mock.requests.push(request)

        if (url.pathname === '/managers/me')
            return route.fulfill({ json: mock.manager })

        if (url.pathname === '/task-types' && request.method() === 'GET') {
            if (mock.listFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Calendar settings unavailable' },
                })

            const pageNumber = Number(url.searchParams.get('page') ?? 1)

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const offset = Number(
                url.searchParams.get('offset') ?? (pageNumber - 1) * limit,
            )

            const isActive = url.searchParams.get('isActive')

            const items = mock.types
                .filter(
                    (item) =>
                        isActive === null ||
                        item.isActive === (isActive === 'true'),
                )
                .sort((first, second) => first.id - second.id)

            return route.fulfill({
                json: {
                    rows: items.slice(offset, offset + limit).map((item) => ({
                        ...item,
                        icon: mock.icons.find(
                            (asset) => asset.id === item.iconId,
                        ),
                    })),
                    total: items.length,
                    page: pageNumber,
                    limit,
                    offset,
                },
            })
        }

        const update = url.pathname.match(/^\/task-types\/(\d+)$/)

        if (
            (url.pathname === '/task-types' && request.method() === 'POST') ||
            (update && request.method() === 'PATCH')
        ) {
            await new Promise((resolve) =>
                setTimeout(resolve, mock.mutationDelay),
            )

            if (mock.mutationFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Calendar settings unavailable' },
                })

            const changes: Partial<EventTypeFixture> = request.postDataJSON()

            if (update) {
                const item = mock.types.find(
                    (item) => item.id === Number(update[1]),
                )

                if (!item)
                    return route.fulfill({
                        status: 404,
                        json: { message: 'Task type not found' },
                    })

                Object.assign(item, changes, {
                    updatedAt: '2026-10-05T09:00:00.000Z',
                })

                return route.fulfill({ json: item })
            }

            const item = eventType(
                Math.max(0, ...mock.types.map((item) => item.id)) + 1,
                '',
                changes,
            )

            mock.types.push(item)

            return route.fulfill({ status: 201, json: item })
        }

        if (url.pathname === '/public-assets' && request.method() === 'GET') {
            const pageNumber = Number(url.searchParams.get('page') ?? 1)

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const offset = Number(
                url.searchParams.get('offset') ?? (pageNumber - 1) * limit,
            )

            return route.fulfill({
                json: {
                    rows: mock.icons.slice(offset, offset + limit),
                    total: mock.icons.length,
                    page: pageNumber,
                    limit,
                    offset,
                },
            })
        }

        const asset = url.pathname.match(/^\/public-assets\/(\d+)(\/file)?$/)

        if (asset && request.method() === 'GET') {
            const item = mock.icons.find((item) => item.id === Number(asset[1]))

            if (!item)
                return route.fulfill({
                    status: 404,
                    json: { message: 'Asset not found' },
                })

            if (asset[2])
                return route.fulfill({
                    contentType: 'image/png',
                    headers: { 'access-control-allow-origin': '*' },
                    body: png,
                })

            return route.fulfill({ json: item })
        }

        return route.fulfill({
            status: 404,
            json: { message: 'Unexpected endpoint' },
        })
    })

    return mock
}

function mutations(mock: SettingsMock) {
    return mock.requests.filter((request) =>
        ['POST', 'PATCH', 'DELETE'].includes(request.method()),
    )
}

async function chooseIcon(dialog: Locator, name = 'ikona-150.png') {
    await dialog
        .getByRole('button', { name: 'Wybierz ikonę', exact: true })
        .click()

    await dialog.getByRole('button', { name, exact: true }).click()
}

async function expectNoOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
}

async function popupTop(page: Page, dialog: Locator, path: string) {
    await dialog.getByRole('button', { name: 'Zamknij okno' }).focus()

    await dialog.locator('[data-popup-panel]').evaluate(
        (element) =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    element.scrollTop = 0

                    requestAnimationFrame(() => resolve())
                })
            }),
    )

    await page.screenshot({ path, animations: 'disabled' })
}

test('default event type remains editable and cannot be archived', async ({
    page,
}) => {
    const mock = await mockSettings(page, [
        eventType(1, 'Zadanie', { isDefault: true }),
        eventType(2, 'Prezentacja'),
    ])

    await page.goto('/main/management/calendar')

    const block = page.getByRole('region', { name: 'Ustawienia kalendarza' })

    await expect(block.getByText('Domyślny', { exact: true })).toBeVisible()

    await expect(
        block.getByRole('button', { name: 'Archiwizuj typ Zadanie' }),
    ).toHaveCount(0)

    await expect(
        block.getByRole('button', { name: 'Archiwizuj typ Prezentacja' }),
    ).toBeVisible()

    await block.getByRole('button', { name: 'Edytuj typ Zadanie' }).click()

    const dialog = page.getByRole('dialog', { name: 'Edytuj typ wydarzenia' })

    await dialog
        .getByLabel('Nazwa typu', { exact: true })
        .fill('Szybkie zadanie')

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    await expect(
        block.getByText('Szybkie zadanie', { exact: true }),
    ).toBeVisible()

    expect(mock.types[0].isDefault).toBe(true)

    expect(mutations(mock)).toHaveLength(1)

    expect(mutations(mock)[0].postDataJSON()).not.toHaveProperty('isDefault')

    expect(mutations(mock)[0].postDataJSON()).not.toHaveProperty('isActive')
})

test('create validates required icon, reuses the full popular-first picker and saves color and reminder offsets', async ({
    page,
}, info) => {
    const mock = await mockSettings(page, [])

    await page.goto('/main/management/calendar')

    const block = page.getByRole('region', { name: 'Ustawienia kalendarza' })

    await expect(
        block.getByRole('heading', { name: 'Szablony typów wydarzeń' }),
    ).toBeVisible()

    const trigger = block.getByRole('button', {
        name: 'Dodaj typ',
        exact: true,
    })

    await trigger.click()

    const dialog = page.getByRole('dialog', { name: 'Nowy typ wydarzenia' })

    const name = dialog.getByLabel('Nazwa typu', { exact: true })

    await name.fill('  Kontakt telefoniczny  ')

    await dialog.getByRole('button', { name: 'Dodaj typ', exact: true }).click()

    await expect(dialog.getByRole('alert')).toContainText(/ikon/i)

    expect(mutations(mock)).toHaveLength(0)

    await dialog
        .getByRole('button', { name: 'Wybierz ikonę', exact: true })
        .click()

    const picker = dialog.getByRole('region', {
        name: 'Wybierz ikonę',
        exact: true,
    })

    const icons = picker.getByRole('button', { name: /^ikona-\d+\.png$/ })

    await expect(icons).toHaveCount(100)

    await expect(icons.nth(0)).toHaveAttribute('aria-label', 'ikona-150.png')

    await expect(icons.nth(1)).toHaveAttribute('aria-label', 'ikona-149.png')

    await expect(icons.nth(2)).toHaveAttribute('aria-label', 'ikona-148.png')

    await expect(icons.first().locator('span[style*="mask"]')).toHaveCSS(
        'color',
        'rgb(198, 73, 89)',
    )

    await expect(icons.nth(2).locator('span[style*="mask"]')).toHaveCSS(
        'color',
        'rgb(37, 99, 235)',
    )

    const size = await icons.first().boundingBox()

    expect(size?.width).toBe(50)

    expect(size?.height).toBe(50)

    mkdirSync('/tmp/ivan-calendar-settings-qa', { recursive: true })

    await popupTop(
        page,
        dialog,
        `/tmp/ivan-calendar-settings-qa/picker-${info.project.name}.png`,
    )

    await picker.getByRole('button', { name: 'Pokaż więcej' }).click()

    await expect(icons).toHaveCount(150)

    await picker
        .getByRole('button', { name: 'ikona-1.png', exact: true })
        .click()

    await dialog.getByLabel('Własny kolor', { exact: true }).fill('#5a90a2')

    await dialog
        .getByRole('checkbox', { name: '1 godz. przed', exact: true })
        .check()

    await dialog.getByLabel('Inny czas (minuty)', { exact: true }).fill('75')

    await dialog
        .getByRole('button', { name: 'Dodaj czas', exact: true })
        .click()

    await expectNoOverflow(page)

    await page.screenshot({
        path: `/tmp/ivan-calendar-settings-qa/form-${info.project.name}.png`,
        animations: 'disabled',
    })

    if (info.project.name === 'mobile') {
        await popupTop(
            page,
            dialog,
            '/tmp/ivan-calendar-settings-qa/form-top-mobile.png',
        )
    }

    const submitted = page.waitForRequest(
        (request) =>
            new URL(request.url()).pathname === '/task-types' &&
            request.method() === 'POST',
    )

    await dialog.getByRole('button', { name: 'Dodaj typ', exact: true }).click()

    const request = await submitted

    const payload = request.postDataJSON()

    expect(payload).toEqual({
        name: 'Kontakt telefoniczny',
        iconId: 1,
        color: '#5A90A2',
        reminderMinutes: expect.arrayContaining([60, 75]),
    })

    expect(payload.reminderMinutes).toHaveLength(2)

    expect(request.headers().authorization).toBe(`Bearer ${session}`)

    await expect(dialog).not.toBeVisible()

    await expect(
        block.getByText('Kontakt telefoniczny', { exact: true }),
    ).toBeVisible()

    await expect(trigger).toBeFocused()

    expect(mutations(mock)).toHaveLength(1)

    expect(
        mock.requests
            .filter(
                (request) =>
                    new URL(request.url()).pathname === '/public-assets',
            )
            .every(
                (request) =>
                    new URL(request.url()).searchParams.get('bucket') ===
                        'icons' &&
                    !new URL(request.url()).searchParams.has('isPopular') &&
                    request.headers().authorization === `Bearer ${session}`,
            ),
    ).toBe(true)

    await page.screenshot({
        path: `/tmp/ivan-calendar-settings-qa/page-${info.project.name}.png`,
        fullPage: true,
        animations: 'disabled',
    })
})

test('editing keeps existing settings, archive only after confirmation and restore use PATCH without deletion', async ({
    page,
}) => {
    const mock = await mockSettings(page, [
        eventType(1, 'Prezentacja'),
        eventType(2, 'Dokumenty', { isActive: false }),
    ])

    await page.goto('/main/management/calendar')

    const block = page.getByRole('region', { name: 'Ustawienia kalendarza' })

    await expect(block.getByText('Prezentacja', { exact: true })).toBeVisible()

    await expect(block.getByText('Dokumenty', { exact: true })).toHaveCount(0)

    const edit = block.getByRole('button', { name: 'Edytuj typ Prezentacja' })

    await edit.click()

    const dialog = page.getByRole('dialog', { name: 'Edytuj typ wydarzenia' })

    await expect(dialog.getByLabel('Nazwa typu', { exact: true })).toHaveValue(
        'Prezentacja',
    )

    await expect(
        dialog.getByLabel('Własny kolor', { exact: true }),
    ).toHaveValue('#4676b4')

    await expect(
        dialog.getByRole('checkbox', { name: '1 godz. przed', exact: true }),
    ).toBeChecked()

    await expect(
        dialog.getByRole('checkbox', { name: '10 min przed', exact: true }),
    ).toBeChecked()

    await dialog
        .getByLabel('Nazwa typu', { exact: true })
        .fill('  Prezentacja mieszkania  ')

    const saved = page.waitForRequest(
        (request) =>
            request.url().endsWith('/task-types/1') &&
            request.method() === 'PATCH',
    )

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    const request = await saved

    expect(request.postDataJSON()).toEqual({
        name: 'Prezentacja mieszkania',
        iconId: 150,
        color: '#4676B4',
        reminderMinutes: expect.arrayContaining([60, 10]),
    })

    await expect(dialog).not.toBeVisible()

    await expect(
        block.getByText('Prezentacja mieszkania', { exact: true }),
    ).toBeVisible()

    const archive = block.getByRole('button', {
        name: 'Archiwizuj typ Prezentacja mieszkania',
    })

    await archive.click()

    const confirmation = page.getByRole('dialog', { name: 'Archiwizować typ?' })

    await expect(confirmation).toBeVisible()

    expect(mutations(mock)).toHaveLength(1)

    await page.keyboard.press('Escape')

    await expect(confirmation).not.toBeVisible()

    await expect(archive).toBeFocused()

    await archive.click()

    const archived = page.waitForRequest(
        (request) =>
            request.url().endsWith('/task-types/1') &&
            request.method() === 'PATCH',
    )

    await confirmation
        .getByRole('button', { name: 'Archiwizuj', exact: true })
        .click()

    expect((await archived).postDataJSON()).toEqual({ isActive: false })

    await expect(confirmation).not.toBeVisible()

    await expect(
        block.getByText('Prezentacja mieszkania', { exact: true }),
    ).toHaveCount(0)

    await block.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await expect(
        block.getByText('Prezentacja mieszkania', { exact: true }),
    ).toBeVisible()

    await expect(block.getByText('Dokumenty', { exact: true })).toBeVisible()

    const restored = page.waitForRequest(
        (request) =>
            request.url().endsWith('/task-types/1') &&
            request.method() === 'PATCH',
    )

    await block
        .getByRole('button', { name: 'Przywróć typ Prezentacja mieszkania' })
        .click()

    expect((await restored).postDataJSON()).toEqual({ isActive: true })

    await expect(
        block.getByText('Prezentacja mieszkania', { exact: true }),
    ).toHaveCount(0)

    await block.getByRole('button', { name: 'Aktywne', exact: true }).click()

    await expect(
        block.getByText('Prezentacja mieszkania', { exact: true }),
    ).toBeVisible()

    expect(mutations(mock)).toHaveLength(3)

    expect(
        mutations(mock).every((request) => request.method() === 'PATCH'),
    ).toBe(true)

    expect(
        mutations(mock).every(
            (request) =>
                request.headers().authorization === `Bearer ${session}`,
        ),
    ).toBe(true)

    expect(
        mock.requests
            .filter(
                (request) => new URL(request.url()).pathname === '/task-types',
            )
            .every((request) =>
                ['true', 'false'].includes(
                    new URL(request.url()).searchParams.get('isActive') ?? '',
                ),
            ),
    ).toBe(true)

    await expectNoOverflow(page)
})

test('failed save preserves typed settings and selected icon, pending save blocks close and submits once', async ({
    page,
}) => {
    const mock = await mockSettings(page, [])

    mock.mutationFails = true

    mock.mutationDelay = 800

    await page.goto('/main/management/calendar')

    await page.getByRole('button', { name: 'Dodaj typ', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Nowy typ wydarzenia' })

    const name = dialog.getByLabel('Nazwa typu', { exact: true })

    await name.fill('Kontakt')

    await chooseIcon(dialog)

    await dialog.getByLabel('Własny kolor', { exact: true }).fill('#7390ba')

    const saved = page.waitForRequest(
        (request) =>
            new URL(request.url()).pathname === '/task-types' &&
            request.method() === 'POST',
    )

    await dialog.getByRole('button', { name: 'Dodaj typ', exact: true }).click()

    await saved

    await expect(name).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole('alert')).toContainText(/Nie udało się/i)

    await expect(name).toBeEnabled()

    await expect(name).toHaveValue('Kontakt')

    await expect(
        dialog.getByLabel('Własny kolor', { exact: true }),
    ).toHaveValue('#7390ba')

    await expect(
        dialog.getByRole('button', { name: 'Zmień ikonę', exact: true }),
    ).toBeVisible()

    expect(mutations(mock)).toHaveLength(1)

    mock.mutationFails = false

    await dialog.getByRole('button', { name: 'Dodaj typ', exact: true }).click()

    await expect(dialog).not.toBeVisible()

    await expect(page.getByText('Kontakt', { exact: true })).toBeVisible()

    expect(mutations(mock)).toHaveLength(2)

    expect(mutations(mock)[1].postDataJSON()).toEqual(
        mutations(mock)[0].postDataJSON(),
    )
})

test('list failure offers retry and managers can inspect active and archived types without mutation controls', async ({
    page,
}) => {
    const mock = await mockSettings(page, [
        eventType(1, 'Prezentacja'),
        eventType(2, 'Dokumenty', { isActive: false }),
    ])

    mock.listFails = true

    await page.goto('/main/management/calendar')

    const block = page.getByRole('region', { name: 'Ustawienia kalendarza' })

    await expect(block.getByRole('alert')).toContainText(/Nie udało się/i)

    mock.listFails = false

    await block
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await expect(block.getByText('Prezentacja', { exact: true })).toBeVisible()

    mock.manager = { ...admin, roles: [{ id: 2, name: 'manager' }] }

    await page.reload()

    await expect(block.getByText('Prezentacja', { exact: true })).toBeVisible()

    await expect(
        block.getByRole('button', { name: 'Dodaj typ', exact: true }),
    ).toHaveCount(0)

    await expect(
        block.getByRole('button', {
            name: /^(Edytuj|Archiwizuj|Przywróć) typ /,
        }),
    ).toHaveCount(0)

    await block.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await expect(block.getByText('Dokumenty', { exact: true })).toBeVisible()

    await expect(
        block.getByRole('button', {
            name: /^(Edytuj|Archiwizuj|Przywróć) typ /,
        }),
    ).toHaveCount(0)

    expect(mutations(mock)).toHaveLength(0)

    expect(
        mock.requests
            .filter(
                (request) => new URL(request.url()).pathname === '/task-types',
            )
            .every(
                (request) =>
                    request.headers().authorization === `Bearer ${session}`,
            ),
    ).toBe(true)

    expect(mock.requests.some((request) => request.method() === 'DELETE')).toBe(
        false,
    )

    await expectNoOverflow(page)
})
