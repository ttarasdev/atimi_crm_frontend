import { test, expect, type Page } from '@playwright/test'
import type { Manager } from '../src/api/managers/managers.types'
import type {
    CrmOverview,
    CrmStatistics,
} from '../src/api/crm-overview/crm-overview.types'

const token = 'a'.repeat(64)

const manager: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    email: 'anna@example.test',
    status: 'active',
    phone: null,
    position: null,
    avatarId: null,
    remindersEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
    roles: [{ id: 1, name: 'admin' }],
}

const overview: CrmOverview = {
    date: '2026-10-06',
    timeZone: 'Europe/Warsaw',
    counts: {
        clients: 0,
        activeProcesses: 0,
        openTasks: 0,
        eventsToday: 0,
        documents: 0,
        notes: 0,
    },
    clients: [],
    events: [],
    tasks: [],
    deadlines: [],
    reminders: [],
}

const statistics: CrmStatistics = {
    paymentStats: { statuses: [], currencies: [], unknownAmountCount: 0 },
    period: { from: '2026-05-01', to: '2026-10-31', months: 6 },
    clients: [],
    processes: [],
    monthly: [],
    managers: [],
    sources: [],
    archivedClients: 0,
    tasks: { open: 0, done: 0 },
}

async function api(page: Page, role = 'admin') {
    await page.route('**:4201/**', async (route) => {
        const path = new URL(route.request().url()).pathname

        if (route.request().method() === 'OPTIONS')
            return route.fulfill({ status: 204 })

        if (path === '/manager-auth/login')
            return route.fulfill({ json: { token: 'test-session' } })

        if (path === '/managers/me')
            return route.fulfill({
                json: { ...manager, roles: [{ id: 1, name: role }] },
            })

        if (
            path === '/document-upload-notifications' ||
            path === '/note-mention-notifications'
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

        if (path === '/crm-overview/me')
            return route.fulfill({ json: overview })

        if (path === '/crm-overview/statistics')
            return route.fulfill({ json: statistics })

        if (
            [
                '/public-assets',
                '/clients',
                '/client-sources',
                '/stage-templates',
                '/managers',
            ].includes(path) &&
            route.request().method() === 'GET'
        ) {
            const query = new URL(route.request().url()).searchParams

            const page = Number(query.get('page') ?? 1)

            const limit = Number(query.get('limit') ?? 20)

            return route.fulfill({
                json: {
                    rows: [],
                    total: 0,
                    page,
                    limit,
                    offset: Number(query.get('offset') ?? (page - 1) * limit),
                },
            })
        }

        return route.fulfill({ json: { success: true } })
    })
}

async function login(page: Page) {
    await page
        .getByLabel('Adres e-mail', { exact: true })
        .fill('anna@example.test')

    await page.getByLabel('Hasło', { exact: true }).fill('test-password-123')

    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click()
}

async function menu(page: Page) {
    const button = page.getByRole('button', { name: 'Otwórz menu' })

    if (await button.isVisible()) await button.click()
}

function profileEmail(page: Page) {
    return page
        .getByRole('region', { name: 'Mój profil', exact: true })
        .getByRole('paragraph')
        .filter({ hasText: /^anna@example\.test$/ })
}

test('login verifies manager, preserves private destination, navigates menu and logs out on server', async ({
    page,
}, info) => {
    await api(page)

    await page.goto('/main/clients')

    await expect(page).toHaveURL(/auth\?next=/)

    await login(page)

    await expect(
        page.getByRole('heading', { name: 'Klienci', exact: true }),
    ).toBeVisible()

    await expect(page).toHaveURL('/main/clients')

    await menu(page)

    await page.getByRole('link', { name: 'Zarządzanie', exact: true }).click()

    await expect(
        page.getByRole('heading', { name: 'Zarządzanie', exact: true }),
    ).toBeVisible()

    await menu(page)

    await page.getByRole('link', { name: 'Galeria ikon', exact: true }).click()

    await expect(
        page.getByRole('region', { name: 'Galeria ikon', exact: true }),
    ).toBeVisible()

    await page.goto('/main/profile')

    await expect(profileEmail(page)).toBeVisible()

    await page.screenshot({
        path: `test-results/profile-${info.project.name}.png`,
        fullPage: true,
    })

    const logout = page.waitForRequest((request) =>
        request.url().endsWith('/manager-auth/logout'),
    )

    await page.getByRole('button', { name: 'Wyloguj się' }).click()

    expect((await logout).headers().authorization).toBe('Bearer test-session')

    await expect(page).toHaveURL(/\/auth/)

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBeNull()
})

test('login errors are readable and public requests do not carry authorization', async ({
    page,
}, info) => {
    await api(page)

    await page.route('**/manager-auth/login', (route) =>
        route.fulfill({
            status: 401,
            json: { message: 'Invalid email or password' },
        }),
    )

    await page.goto('/auth')

    await page.screenshot({
        path: `test-results/login-${info.project.name}.png`,
        fullPage: true,
    })

    const sent = page.waitForRequest((request) =>
        request.url().endsWith('/manager-auth/login'),
    )

    await login(page)

    expect((await sent).headers().authorization).toBeUndefined()

    await expect(page.locator('main [role="alert"]')).toContainText(
        'Nieprawidłowy e-mail lub hasło',
    )

    await expect(
        page.getByRole('button', { name: 'Zaloguj się', exact: true }),
    ).toBeEnabled()

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBeNull()
})

test('unverified manager response never persists token', async ({ page }) => {
    await api(page)

    await page.route('**/managers/me', (route) =>
        route.fulfill({ status: 403, json: { message: 'Forbidden' } }),
    )

    await page.goto('/auth')

    await login(page)

    await expect(page.locator('main [role="alert"]')).toContainText(
        'nie ma dostępu',
    )

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBeNull()
})

test('external return URL cannot redirect outside CRM', async ({ page }) => {
    await api(page)

    await page.goto('/auth?next=https://example.com')

    await login(page)

    await expect(page).toHaveURL('/main')
})

test('forgot password sends email and shows neutral confirmation with cooldown', async ({
    page,
}, info) => {
    await api(page)

    await page.goto('/auth/forgot-password')

    await page
        .getByLabel('Adres e-mail', { exact: true })
        .fill('anna@example.test')

    const sent = page.waitForRequest((request) =>
        request.url().endsWith('/manager-auth/forgot-password'),
    )

    await page.getByRole('button', { name: 'Wyślij link', exact: true }).click()

    expect((await sent).postDataJSON()).toEqual({ email: 'anna@example.test' })

    await expect(
        page.getByRole('heading', { name: 'Sprawdź swoją pocztę' }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: /Wyślij ponownie za/ }),
    ).toBeDisabled()

    await page.screenshot({
        path: `test-results/email-sent-${info.project.name}.png`,
        fullPage: true,
    })
})

test('reset requires valid token, matching passwords and handles one-use expired link', async ({
    page,
}, info) => {
    await api(page)

    await page.goto('/auth/reset-password')

    await expect(page.locator('main [role="alert"]')).toContainText(
        'Brakuje poprawnego linku',
    )

    await page.goto(`/auth/reset-password?token=${token}`)

    await page.locator('input[name="password"]').fill('new-password-123')

    await page.getByLabel('Powtórz nowe hasło').fill('different-password')

    await page.getByRole('button', { name: 'Zapisz nowe hasło' }).click()

    await expect(page.locator('main [role="alert"]')).toContainText(
        'Hasła muszą być takie same',
    )

    await page.getByLabel('Powtórz nowe hasło').fill('new-password-123')

    await page.route('**/manager-auth/reset-password', (route) =>
        route.fulfill({
            status: 400,
            json: { message: 'Invalid or expired token' },
        }),
    )

    await page.getByRole('button', { name: 'Zapisz nowe hasło' }).click()

    await expect(page.locator('main [role="alert"]')).toContainText(
        'wykorzystany lub wygasł',
    )

    await page.unroute('**/manager-auth/reset-password')

    await page.screenshot({
        path: `test-results/reset-${info.project.name}.png`,
        fullPage: true,
    })

    const sent = page.waitForRequest((request) =>
        request.url().endsWith('/manager-auth/reset-password'),
    )

    await page.getByRole('button', { name: 'Zapisz nowe hasło' }).click()

    expect((await sent).postDataJSON()).toEqual({
        token,
        password: 'new-password-123',
    })

    await expect(
        page.getByRole('heading', { name: 'Hasło zostało zmienione' }),
    ).toBeVisible()

    await expect(page).toHaveURL('/auth/reset-password')
})

test('confirmation can request email or activate from link', async ({
    page,
}, info) => {
    await api(page)

    await page.goto('/auth/confirm-email')

    await page
        .getByLabel('Adres e-mail', { exact: true })
        .fill('anna@example.test')

    const resend = page.waitForRequest((request) =>
        request.url().endsWith('/manager-auth/resend-confirmation'),
    )

    await page.getByRole('button', { name: 'Wyślij link' }).click()

    expect((await resend).postDataJSON()).toEqual({
        email: 'anna@example.test',
    })

    await expect(
        page.getByRole('heading', { name: 'Sprawdź swoją pocztę' }),
    ).toBeVisible()

    await page.goto(`/auth/confirm-email?token=${token}`)

    await page.screenshot({
        path: `test-results/confirm-${info.project.name}.png`,
        fullPage: true,
    })

    const confirm = page.waitForRequest((request) =>
        request.url().endsWith('/manager-auth/confirm-email'),
    )

    await page.getByRole('button', { name: 'Potwierdź adres e-mail' }).click()

    expect((await confirm).postDataJSON()).toEqual({ token })

    await expect(
        page.getByRole('heading', { name: 'E-mail potwierdzony' }),
    ).toBeVisible()
})

test('manager cannot access admin section even by URL', async ({ page }) => {
    await api(page, 'manager')

    await page.goto('/auth')

    await login(page)

    await expect(page).toHaveURL('/main')

    await page.goto('/main/managers')

    await expect(
        page.getByRole('heading', { name: 'Brak uprawnień' }),
    ).toBeVisible()

    await menu(page)

    await expect(
        page.getByRole('link', { name: 'Pracownicy', exact: true }),
    ).toHaveCount(0)
})

test('session revoked in another tab removes private UI', async ({
    page,
    context,
}) => {
    await api(page)

    await page.goto('/auth')

    await login(page)

    await expect(page).toHaveURL('/main')

    const other = await context.newPage()

    await api(other)

    await other.goto('/main/profile')

    await expect(profileEmail(other)).toBeVisible()

    await page.goto('/main/profile')

    await page.getByRole('button', { name: 'Wyloguj się' }).click()

    await expect(other).toHaveURL(/\/auth/)

    await expect(other.getByText('anna@example.test')).toHaveCount(0)
})

test('layouts do not overflow and mobile drawer traps focus and closes with Escape', async ({
    page,
}, info) => {
    await api(page)

    for (const route of [
        '/auth',
        '/auth/forgot-password',
        `/auth/reset-password?token=${token}`,
        '/auth/confirm-email',
    ]) {
        await page.goto(route)

        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true)
    }

    await page.goto('/auth')

    await login(page)

    await expect(page).toHaveURL('/main')

    if (info.project.name === 'mobile') {
        await menu(page)

        await expect(page.getByRole('dialog')).toBeVisible()

        await page.screenshot({
            path: 'test-results/mobile-menu.png',
            fullPage: true,
        })

        await page.keyboard.press('Escape')

        await expect(page.getByRole('dialog')).not.toBeVisible()

        await expect(
            page.getByRole('button', { name: 'Otwórz menu' }),
        ).toBeFocused()
    }

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
})

test('stored session finishes checking after a slow profile response', async ({
    page,
}) => {
    await api(page)

    await page.addInitScript(() => {
        localStorage.setItem('atimi:access_token', 'stored-session')
    })

    await page.route('**/managers/me', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500))

        await route.fulfill({ json: manager })
    })

    await page.goto('/main/profile')

    await expect(profileEmail(page)).toBeVisible()

    await page.reload()

    await expect(profileEmail(page)).toBeVisible()
})

test('expired session clears token and returns to login', async ({ page }) => {
    await api(page)

    await page.addInitScript(() => {
        localStorage.setItem('atimi:access_token', 'expired-session')
    })

    await page.route('**/managers/me', (route) =>
        route.fulfill({ status: 401, json: { message: 'Unauthorized' } }),
    )

    await page.goto('/main')

    await expect(page).toHaveURL(/\/auth/)

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBeNull()
})

test('intro opens login and verified login page returns to dashboard', async ({
    page,
}, info) => {
    await api(page)

    await page.goto('/')

    await expect(page).toHaveURL('/auth')

    await expect(page.getByLabel('Adres e-mail', { exact: true })).toBeVisible()

    await page.screenshot({
        path: `test-results/intro-${info.project.name}.png`,
        animations: 'disabled',
    })

    await login(page)

    await expect(page).toHaveURL('/main')

    await page.goto('/auth')

    await expect(page).toHaveURL('/main')
})

test('unresponsive session offers retry instead of loading forever', async ({
    page,
}) => {
    await api(page)

    await page.addInitScript(() => {
        localStorage.setItem('atimi:access_token', 'stored-session')
    })

    await page.route('**/managers/me', () => {})

    await page.goto('/main')

    await expect(
        page.getByRole('heading', { name: 'Nie można sprawdzić sesji' }),
    ).toBeVisible({ timeout: 15000 })

    await expect(
        page.getByRole('button', { name: 'Spróbuj ponownie' }),
    ).toBeEnabled()
})

test('server-rendered login waits for hydration and never submits credentials through a native GET', async ({
    page,
}) => {
    await api(page)

    const documents: string[] = []

    page.on('request', (request) => {
        if (
            request.isNavigationRequest() &&
            request.frame() === page.mainFrame()
        )
            documents.push(request.url())
    })

    let releaseScripts: () => void = () => {}

    const scripts = new Promise<void>((resolve) => {
        releaseScripts = resolve
    })

    await page.route('**/_next/**/*.js*', async (route) => {
        await scripts

        await route.continue()
    })

    await page.goto('/auth', { waitUntil: 'commit' })

    const button = page.getByRole('button', {
        name: 'Zaloguj się',
        exact: true,
    })

    try {
        await expect(button).toBeDisabled()

        await expect(
            page.getByLabel('Adres e-mail', { exact: true }),
        ).toBeDisabled()

        await expect(page.getByLabel('Hasło', { exact: true })).toBeDisabled()

        await expect(
            page.getByRole('form', { name: 'Logowanie' }),
        ).toHaveAttribute('method', 'post')

        await button.evaluate((element: HTMLButtonElement) => element.click())

        await expect(page).toHaveURL('/auth')
    } finally {
        releaseScripts()
    }

    await expect(button).toBeEnabled()

    await login(page)

    await expect(page).toHaveURL('/main')

    expect(
        documents.every((value) => {
            const params = new URL(value).searchParams

            return !params.has('email') && !params.has('password')
        }),
    ).toBe(true)
})
