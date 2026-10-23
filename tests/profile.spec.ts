import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type {
    Manager,
    UpdateManagerDto,
} from '../src/api/managers/managers.types'

const session = 'profile-test-session'

const manager: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    email: 'anna@example.test',
    phone: '+48 600 123 456',
    position: 'Doradca nieruchomości',
    avatarId: null,
    status: 'active',
    remindersEnabled: true,
    lastLoginAt: '2026-10-05T08:00:00.000Z',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    roles: [{ id: 2, name: 'manager' }],
}

interface ProfileMock {
    manager: Manager
    requests: Request[]
    mutationFails: boolean
    mutationDelay: number
    mutationGate?: Promise<void>
}

async function mockProfile(
    page: Page,
    changes: Partial<Manager> = {},
): Promise<ProfileMock> {
    const mock: ProfileMock = {
        manager: { ...manager, ...changes },
        requests: [],
        mutationFails: false,
        mutationDelay: 350,
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
                    'access-control-allow-methods': 'GET, PATCH, OPTIONS',
                    'access-control-allow-headers':
                        'Authorization, Content-Type',
                },
            })

        mock.requests.push(request)

        if (url.pathname === '/managers/me') {
            if (request.method() === 'GET')
                return route.fulfill({ json: mock.manager })

            if (request.method() === 'PATCH') {
                if (mock.mutationGate) await mock.mutationGate

                await new Promise((resolve) =>
                    setTimeout(resolve, mock.mutationDelay),
                )

                if (mock.mutationFails)
                    return route.fulfill({
                        status: 503,
                        json: { message: 'Profile unavailable' },
                    })

                const changes: UpdateManagerDto = request.postDataJSON()

                mock.manager = {
                    ...mock.manager,
                    ...changes,
                    updatedAt: '2026-10-05T09:00:00.000Z',
                }

                return route.fulfill({ json: mock.manager })
            }
        }

        if (url.pathname === '/calendars/me')
            return route.fulfill({
                json: {
                    id: 7,
                    managerId: mock.manager.id,
                    timeZone: 'Europe/Warsaw',
                    createdAt: '2026-10-01T08:00:00.000Z',
                    updatedAt: '2026-10-01T08:00:00.000Z',
                },
            })

        if (url.pathname === '/calendars/7/entries')
            return route.fulfill({
                json: {
                    rows: [],
                    total: 0,
                    page: Number(url.searchParams.get('page') ?? 1),
                    limit: Number(url.searchParams.get('limit') ?? 20),
                    offset: Number(url.searchParams.get('offset') ?? 0),
                },
            })

        if (url.pathname === '/manager-auth/logout')
            return route.fulfill({ json: { success: true } })

        return route.fulfill({
            status: 404,
            json: { message: 'Unexpected profile test request' },
        })
    })

    return mock
}

function updates(mock: ProfileMock) {
    return mock.requests.filter(
        (request) =>
            request.method() === 'PATCH' &&
            new URL(request.url()).pathname === '/managers/me',
    )
}

async function expectNoOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
}

async function screenshot(page: Page, name: string, fullPage = true) {
    mkdirSync('/tmp/ivan-profile-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-profile-qa/${name}.png`,
        animations: 'disabled',
        fullPage,
    })
}

test('profile shows actual account details, current role and calendar shortcuts with the existing mobile menu', async ({
    page,
}, info) => {
    const mock = await mockProfile(page)

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    await expect(
        profile.getByRole('heading', { name: 'Anna Kowalska', exact: true }),
    ).toBeVisible()

    await expect(
        profile.getByText('anna@example.test', { exact: true }),
    ).toHaveCount(2)

    await expect(
        profile.getByText('+48 600 123 456', { exact: true }),
    ).toBeVisible()

    await expect(
        profile.getByText('Doradca nieruchomości', { exact: true }),
    ).toBeVisible()

    await expect(profile.getByText('Doradca', { exact: true })).toBeVisible()

    await expect(profile.getByLabel('Inicjały użytkownika')).toHaveText('AK')

    await expect(
        profile.getByRole('switch', {
            name: 'Powiadomienia e-mail z kalendarza',
        }),
    ).toHaveAttribute('aria-checked', 'true')

    for (const [name, href] of [
        ['Wydarzenia i zadania', '/main/calendar'],
        ['Przypomnienia', '/main/calendar/reminders'],
        ['Terminy', '/main/calendar/deadlines'],
    ])
        await expect(
            profile.getByRole('link', { name: new RegExp(`^${name}`) }),
        ).toHaveAttribute('href', href)

    await expect(
        profile.getByRole('link', { name: /^Typy wydarzeń/ }),
    ).toHaveCount(0)

    await expect(
        profile.getByRole('button', { name: 'Wyloguj się' }),
    ).toBeVisible()

    if (info.project.name === 'mobile') {
        await expect(
            page.getByRole('button', { name: 'Otwórz menu' }),
        ).toBeVisible()

        await expect(
            page.getByRole('dialog', { name: 'Menu główne' }),
        ).not.toBeVisible()
    }

    await expectNoOverflow(page)

    await screenshot(page, `profile-${info.project.name}`)

    mock.manager = { ...mock.manager, roles: [{ id: 1, name: 'admin' }] }

    await page.reload()

    await expect(
        profile.getByText('Administrator', { exact: true }),
    ).toBeVisible()

    await expect(
        profile.getByRole('link', { name: /^Typy wydarzeń/ }),
    ).toHaveAttribute('href', '/main/management/calendar')

    expect(updates(mock)).toHaveLength(0)
})

test('calendar email switch sends boolean false, waits for acknowledgement and remains muted after navigation and session refresh', async ({
    page,
}, info) => {
    const mock = await mockProfile(page)

    mock.mutationDelay = 0

    let releaseMutation: (() => void) | undefined

    mock.mutationGate = new Promise((resolve) => {
        releaseMutation = resolve
    })

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    const toggle = profile.getByRole('switch', {
        name: 'Powiadomienia e-mail z kalendarza',
    })

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await toggle.click()

    await expect(toggle).toBeDisabled()

    await expect(toggle).toHaveAttribute('aria-busy', 'true')

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await expect(
        profile.getByRole('button', { name: 'Edytuj profil' }),
    ).toBeDisabled()

    await expect(profile.getByText('Zapisywanie ustawienia…')).toBeVisible()

    releaseMutation?.()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(toggle).toBeEnabled()

    await expect(profile.getByRole('status')).toHaveText(
        'Wyłączone — kalendarz działa, wiadomości nie są wysyłane.',
    )

    expect(updates(mock)).toHaveLength(1)

    expect(updates(mock)[0].postDataJSON()).toEqual({ remindersEnabled: false })

    expect(updates(mock)[0].headers().authorization).toBe(`Bearer ${session}`)

    await screenshot(page, `profile-muted-${info.project.name}`)

    await profile.getByRole('link', { name: /^Przypomnienia/ }).click()

    await expect(page).toHaveURL('/main/calendar/reminders')

    await expect(
        page.getByRole('region', { name: 'Mój kalendarz' }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'E-mail wyłączony' }),
    ).toHaveAttribute('href', '/main/profile')

    await page
        .locator('header')
        .getByRole('link', { name: 'Mój profil', exact: true })
        .click()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    const refresh = page.waitForRequest(
        (request) =>
            request.method() === 'GET' &&
            new URL(request.url()).pathname === '/managers/me',
    )

    await page.evaluate(() =>
        window.dispatchEvent(new Event('visibilitychange')),
    )

    await refresh

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await page.reload()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    expect(updates(mock)).toHaveLength(1)
})

test('a muted account stays muted when enabling fails and can retry without an optimistic success', async ({
    page,
}) => {
    const mock = await mockProfile(page, { remindersEnabled: false })

    mock.mutationFails = true

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    const toggle = profile.getByRole('switch', {
        name: 'Powiadomienia e-mail z kalendarza',
    })

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(profile.getByRole('alert')).toHaveText(
        'Nie udało się zmienić powiadomień. Spróbuj ponownie.',
    )

    await expect(toggle).toBeEnabled()

    expect(mock.manager.remindersEnabled).toBe(false)

    expect(updates(mock)).toHaveLength(1)

    expect(updates(mock)[0].postDataJSON()).toEqual({ remindersEnabled: true })

    mock.mutationFails = false

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await expect(profile.getByRole('alert')).toHaveCount(0)

    await expect(profile.getByRole('status')).toHaveText(
        'Włączone — przypomnienia przyjdą na Twój adres e-mail.',
    )

    expect(updates(mock)).toHaveLength(2)

    await page.reload()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')
})

test('profile edit validates names, sends only trimmed changes and updates the shared account header after save', async ({
    page,
}, info) => {
    const mock = await mockProfile(page)

    mock.mutationDelay = 0

    let releaseMutation: (() => void) | undefined

    mock.mutationGate = new Promise((resolve) => {
        releaseMutation = resolve
    })

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    await profile.getByRole('button', { name: 'Edytuj profil' }).click()

    const dialog = page.getByRole('dialog', {
        name: 'Edytuj profil',
        exact: true,
    })

    const submit = dialog.getByRole('button', {
        name: 'Zapisz zmiany',
        exact: true,
    })

    await expect(dialog.getByLabel('Imię', { exact: true })).toHaveValue('Anna')

    await expect(dialog.getByLabel('Nazwisko', { exact: true })).toHaveValue(
        'Kowalska',
    )

    await expect(dialog.getByLabel('Telefon', { exact: true })).toHaveValue(
        '+48 600 123 456',
    )

    await expect(dialog.getByLabel('Stanowisko', { exact: true })).toHaveValue(
        'Doradca nieruchomości',
    )

    await expect(dialog.getByRole('textbox')).toHaveCount(4)

    await expect(submit).toBeDisabled()

    await expectNoOverflow(page)

    await screenshot(page, `profile-edit-${info.project.name}`, false)

    await dialog.getByLabel('Imię', { exact: true }).fill('   ')

    await submit.click()

    await expect(dialog.getByRole('alert')).toHaveText(
        'Imię i nazwisko muszą mieć od 1 do 100 znaków.',
    )

    expect(updates(mock)).toHaveLength(0)

    await dialog.getByLabel('Imię', { exact: true }).fill('  Alicja  ')

    await dialog.getByLabel('Nazwisko', { exact: true }).fill('  Nowak  ')

    await submit.click()

    await expect(
        dialog.getByRole('button', { name: 'Zapisywanie…', exact: true }),
    ).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    await expect(
        page
            .locator('section[aria-label="Mój profil"] h2')
            .filter({ hasText: /^Anna Kowalska$/ }),
    ).toBeVisible()

    releaseMutation?.()

    await expect(dialog).not.toBeVisible()

    await expect(
        profile.getByRole('heading', { name: 'Alicja Nowak', exact: true }),
    ).toBeVisible()

    await expect(
        page
            .locator('header')
            .getByRole('link', { name: 'Mój profil', exact: true }),
    ).toContainText('Alicja')

    await expect(profile.getByLabel('Inicjały użytkownika')).toHaveText('AN')

    expect(updates(mock)).toHaveLength(1)

    expect(updates(mock)[0].postDataJSON()).toEqual({
        name: 'Alicja',
        surname: 'Nowak',
    })

    expect(mock.manager.remindersEnabled).toBe(true)

    await page.reload()

    await expect(
        profile.getByRole('heading', { name: 'Alicja Nowak', exact: true }),
    ).toBeVisible()
})

test('failed profile edit retains contact details and form values, then optional fields can be cleared explicitly', async ({
    page,
}) => {
    const mock = await mockProfile(page)

    mock.mutationFails = true

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    await profile.getByRole('button', { name: 'Edytuj profil' }).click()

    const dialog = page.getByRole('dialog', {
        name: 'Edytuj profil',
        exact: true,
    })

    await dialog.getByLabel('Telefon', { exact: true }).fill('')

    await dialog.getByLabel('Stanowisko', { exact: true }).fill('')

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toHaveText(
        'Nie udało się zapisać profilu. Spróbuj ponownie.',
    )

    await expect(dialog.getByLabel('Telefon', { exact: true })).toHaveValue('')

    await expect(
        dialog.getByRole('button', { name: 'Zapisz zmiany', exact: true }),
    ).toBeEnabled()

    await expect(
        profile.getByText('+48 600 123 456', { exact: true }),
    ).toBeVisible()

    expect(updates(mock)).toHaveLength(1)

    expect(updates(mock)[0].postDataJSON()).toEqual({
        phone: null,
        position: null,
    })

    mock.mutationFails = false

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    await expect(profile.getByText('Nie podano', { exact: true })).toHaveCount(
        2,
    )

    expect(mock.manager.phone).toBeNull()

    expect(mock.manager.position).toBeNull()

    expect(updates(mock)).toHaveLength(2)

    await profile.getByRole('button', { name: 'Edytuj profil' }).click()

    await expect(dialog.getByLabel('Telefon', { exact: true })).toHaveValue('')

    await expect(dialog.getByLabel('Stanowisko', { exact: true })).toHaveValue(
        '',
    )

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await expect(dialog).not.toBeVisible()
})
