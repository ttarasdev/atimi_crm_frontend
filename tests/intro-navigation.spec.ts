import { test, expect, type Page } from '@playwright/test'
import type { Manager } from '../src/api/managers/managers.types'

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
    roles: [{ id: 1, name: 'manager' }],
}

async function mockApi(page: Page) {
    await page.route('**:4201/**', (route) => {
        const path = new URL(route.request().url()).pathname

        if (route.request().method() === 'OPTIONS')
            return route.fulfill({ status: 204 })

        if (path === '/managers/me') return route.fulfill({ json: manager })

        if (path === '/crm-overview/me')
            return route.fulfill({
                json: {
                    date: '2026-10-16',
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
                },
            })

        return route.fulfill({
            json: { rows: [], total: 0, page: 1, limit: 20, offset: 0 },
        })
    })
}

async function failInitialScripts(page: Page) {
    const blockedScripts: string[] = []

    const documents: string[] = []

    page.on('request', (request) => {
        if (
            request.isNavigationRequest() &&
            request.resourceType() === 'document' &&
            request.frame() === page.mainFrame()
        )
            documents.push(new URL(request.url()).pathname)
    })

    await page.route('**/_next/**/*.js*', (route) => {
        if (documents.length > 1) return route.continue()

        blockedScripts.push(route.request().url())

        return route.abort('failed')
    })

    return { blockedScripts, documents }
}

test('intro reaches login when its initial application scripts fail', async ({
    page,
}) => {
    await mockApi(page)

    const navigation = await failInitialScripts(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL('/auth', { timeout: 10000 })

    expect(navigation.blockedScripts.length).toBeGreaterThan(0)

    expect(navigation.documents).toEqual(['/', '/auth'])

    await expect(page.getByLabel('Adres e-mail', { exact: true })).toBeVisible()
})

test('intro opens the login form without a manual reload', async ({ page }) => {
    await mockApi(page)

    await page.goto('/')

    await expect(page).toHaveURL('/auth')

    await expect(page.getByLabel('Adres e-mail', { exact: true })).toBeVisible()
})

test('stored session reaches dashboard even when initial scripts fail', async ({
    page,
}) => {
    await mockApi(page)

    await page.addInitScript(() => {
        localStorage.setItem('atimi:access_token', 'intro-stored-session')
    })

    const navigation = await failInitialScripts(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL('/main', { timeout: 10000 })

    expect(navigation.blockedScripts.length).toBeGreaterThan(0)

    expect(navigation.documents).toEqual(['/', '/main'])

    await expect(
        page.getByRole('region', { name: 'Pulpit', exact: true }),
    ).toBeVisible()
})

test('unavailable storage does not leave the intro loading forever', async ({
    page,
}) => {
    await mockApi(page)

    await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new DOMException(
                    'Storage is unavailable',
                    'SecurityError',
                )
            },
        })
    })

    await failInitialScripts(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL('/auth', { timeout: 10000 })

    await expect(
        page.getByRole('status', { name: 'Ładowanie CRM' }),
    ).toHaveCount(0)

    await expect(page.getByLabel('Adres e-mail', { exact: true })).toBeVisible()
})
