import { selectOption } from './helpers/select-option'
import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'
import type {
    CrmOverview,
    CrmStatistics,
} from '../src/api/crm-overview/crm-overview.types'

const stamps = {
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-02T09:00:00Z',
}

const png = readFileSync('tests/fixtures/icons/house.png')

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
    ...stamps,
}

function overview(): CrmOverview {
    return {
        date: '2026-10-06',
        timeZone: 'Europe/Warsaw',
        counts: {
            clients: 17,
            activeProcesses: 9,
            openTasks: 21,
            eventsToday: 14,
            documents: 4,
            notes: 6,
        },
        clients: [
            {
                id: 1,
                name: 'Jan',
                surname: 'Nowak',
                status: 'active',
                priority: 'vip',
                updatedAt: stamps.updatedAt,
            },
        ],
        events: Array.from({ length: 8 }, (_, index) => ({
            id: index + 1,
            title: `Prezentacja ${index + 1}`,
            date: '2026-10-06',
            startAt: index === 0 ? null : '2026-10-06T09:00:00+02:00',
            endAt: index === 0 ? null : '2026-10-06T10:00:00+02:00',
            isDone: false,
            color: '#4676B4',
            iconId: 150,
        })),
        tasks: [
            {
                id: 1,
                title: 'Przygotować dokumenty',
                clientId: 1,
                clientName: 'Jan Nowak',
                processTitle: 'Kupno mieszkania',
                stageTitle: 'Formalności',
                color: '#508B77',
            },
        ],
        deadlines: [
            {
                id: 1,
                title: 'Termin podpisania',
                dueAt: '2020-01-01T12:00:00+01:00',
                clientId: 1,
            },
        ],
        reminders: [
            {
                id: 1,
                title: 'Oddzwonić do klienta',
                remindAt: '2026-10-06T13:00:00+02:00',
            },
        ],
    }
}

function statistics(empty = false, employee = false): CrmStatistics {
    return {
        paymentStats: {
            statuses: [
                { key: 'unpaid', total: empty ? 0 : employee ? 0 : 10 },
                { key: 'partial', total: empty ? 0 : employee ? 1 : 2 },
                { key: 'paid', total: empty ? 0 : employee ? 2 : 5 },
            ],
            currencies: empty
                ? []
                : [
                      {
                          currency: 'PLN',
                          total: employee ? 2 : 14,
                          knownAmountCount: employee ? 1 : 3,
                          unknownAmountCount: employee ? 1 : 11,
                          totalAmount: employee ? '5000.00' : '6500.00',
                          fullyPaidAmount: employee ? '0.00' : '1000.00',
                          unpaidAmount: employee ? '0.00' : '500.00',
                          partialAmount: '5000.00',
                      },
                      {
                          currency: 'EUR',
                          total: employee ? 1 : 3,
                          knownAmountCount: employee ? 1 : 2,
                          unknownAmountCount: employee ? 0 : 1,
                          totalAmount: employee ? '100.01' : '300.03',
                          fullyPaidAmount: '100.01',
                          unpaidAmount: employee ? '0.00' : '200.02',
                          partialAmount: '0.00',
                      },
                  ],
            unknownAmountCount: empty ? 0 : employee ? 1 : 12,
        },
        period: { from: '2026-05-01', to: '2026-10-31', months: 6 },
        clients: [
            { key: 'new', total: empty ? 0 : employee ? 1 : 5 },
            { key: 'active', total: empty ? 0 : employee ? 2 : 8 },
            { key: 'completed', total: empty ? 0 : employee ? 0 : 4 },
        ],
        processes: [
            { key: 'active', total: empty ? 0 : employee ? 1 : 9 },
            { key: 'completed', total: empty ? 0 : employee ? 0 : 3 },
        ],
        monthly: Array.from({ length: 6 }, (_, index) => ({
            month: `2026-${String(index + 5).padStart(2, '0')}`,
            clients: empty ? 0 : index + 2,
            completedProcesses: empty ? 0 : index % 3,
        })),
        managers: empty
            ? []
            : [
                  {
                      id: 1,
                      name: 'Anna',
                      surname: 'Kowalska',
                      status: 'active',
                      total: 10,
                      active: 6,
                      completed: 2,
                  },
                  {
                      id: 2,
                      name: 'Marta',
                      surname: 'Nowak',
                      status: 'active',
                      total: 7,
                      active: 2,
                      completed: 2,
                  },
              ],
        sources: [
            { name: 'Polecenie', total: empty ? 0 : 10 },
            { name: 'Strona internetowa', total: empty ? 0 : 7 },
        ],
        archivedClients: empty ? 0 : 2,
        tasks: { open: empty ? 0 : 21, done: empty ? 0 : 13 },
    }
}

async function mock(page: Page, isAdmin = true) {
    const state = {
        overview: overview(),
        empty: false,
        failOverview: false,
        failStatistics: false,
        requests: [] as Request[],
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'overview-test'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        state.requests.push(request)

        const send = (body: unknown, status = 200) =>
            route.fulfill({
                status,
                contentType: 'application/json',
                body: JSON.stringify(body),
            })

        if (url.pathname === '/managers/me')
            return send({
                ...admin,
                roles: isAdmin ? admin.roles : [{ id: 2, name: 'manager' }],
            })

        if (url.pathname === '/managers')
            return send({
                rows: [
                    admin,
                    { ...admin, id: 2, name: 'Marta', surname: 'Nowak' },
                ],
                total: 2,
                page: 1,
                limit: 100,
                offset: 0,
            })

        if (url.pathname === '/crm-overview/me')
            return state.failOverview
                ? send({ message: 'Unavailable' }, 503)
                : send(state.overview)

        if (url.pathname === '/crm-overview/statistics')
            return state.failStatistics
                ? send({ message: 'Unavailable' }, 503)
                : send(
                      statistics(
                          state.empty,
                          url.searchParams.get('managerId') === '2',
                      ),
                  )

        if (url.pathname === '/public-assets/150/file')
            return route.fulfill({ contentType: 'image/png', body: png })

        if (url.pathname === '/public-assets/150')
            return send({
                id: 150,
                bucket: 'icons',
                relPath: 'house.png',
                originalName: 'house.png',
                mimeType: 'image/png',
                sizeBytes: png.length,
                isPopular: true,
                createdByManagerId: 1,
                ...stamps,
            })

        return send({ rows: [], total: 0, page: 1, limit: 100, offset: 0 })
    })

    return state
}

test('dashboard combines live sections, counts all events beyond the preview and fits each viewport', async ({
    page,
}, testInfo) => {
    await mock(page)

    await page.goto('/main')

    await expect(
        page.getByRole('heading', { name: 'Dzień dobry, Anna' }),
    ).toBeVisible()

    const summary = page.getByRole('group', { name: 'Podsumowanie dnia' })

    await expect(
        summary.getByRole('link', { name: /Plan na dziś/ }),
    ).toContainText('14')

    await expect(
        summary.getByRole('link', { name: /Plan na dziś/ }),
    ).toContainText('8 najbliższych pozycji')

    await expect(
        page.getByRole('heading', { name: 'Następne kroki' }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: /Przygotować dokumenty/ }),
    ).toHaveAttribute('href', '/main/clients/1')

    await expect(
        page.getByRole('link', { name: /Termin podpisania/ }),
    ).toContainText('Po terminie')

    await expect(
        page.getByRole('heading', { name: 'Moja biblioteka' }),
    ).toBeVisible()

    await expect(
        page.getByRole('heading', { name: 'Wyniki zespołu' }),
    ).toBeVisible()

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((element) => element.clientWidth),
    )

    mkdirSync('/tmp/ivan-overview-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-overview-shots/dashboard-${testInfo.project.name}.png`,
        fullPage: true,
    })
})

test('manager dashboard hides team statistics and never queries the admin endpoint', async ({
    page,
}) => {
    const state = await mock(page, false)

    await page.goto('/main')

    await expect(
        page.getByRole('heading', { name: 'Moja biblioteka' }),
    ).toBeVisible()

    await expect(
        page.getByRole('heading', { name: 'Wyniki zespołu' }),
    ).toHaveCount(0)

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname === '/crm-overview/statistics',
        ),
    ).toBe(false)

    await page.goto('/main/reports')

    await expect(page.getByText('Brak uprawnień')).toBeVisible()

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname === '/crm-overview/statistics',
        ),
    ).toBe(false)
})

test('statistics filters query real period and manager, charts expose tooltip and numeric data', async ({
    page,
}, testInfo) => {
    const state = await mock(page)

    await page.goto('/main/reports')

    const growth = page.getByRole('figure', {
        name: 'Wykres nowych klientów i zakończonych spraw według miesiąca',
    })

    await expect(growth).toBeVisible()

    const plot = growth.getByRole('application')

    await expect(plot).toBeVisible()

    await plot.focus()

    await page.keyboard.press('ArrowRight')

    await expect(growth.locator('.recharts-tooltip-wrapper')).toContainText(
        'Nowi klienci',
    )

    await growth.getByText('Pokaż dane wykresu', { exact: true }).click()

    await expect(growth.getByRole('table')).toBeVisible()

    await expect(growth.getByRole('row')).toHaveCount(7)

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((element) => element.clientWidth),
    )

    mkdirSync('/tmp/ivan-overview-shots', { recursive: true })

    await page.getByRole('heading', { name: 'Statystyki', exact: true }).click()

    await page.screenshot({
        path: `/tmp/ivan-overview-shots/statistics-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await selectOption(page.getByLabel('Okres wykresu'), '3')

    await expect
        .poll(() =>
            state.requests
                .filter(
                    (request) =>
                        new URL(request.url()).pathname ===
                        '/crm-overview/statistics',
                )
                .at(-1)
                ?.url(),
        )
        .toContain('months=3')

    await selectOption(page.getByLabel('Pracownik', { exact: true }), '2')

    await expect
        .poll(() =>
            state.requests
                .filter(
                    (request) =>
                        new URL(request.url()).pathname ===
                        '/crm-overview/statistics',
                )
                .at(-1)
                ?.url(),
        )
        .toContain('managerId=2')

    await expect(
        page.getByRole('group', { name: 'Podsumowanie statystyk' }),
    ).toContainText('3')
})

test('all-zero statistics give readable empty states and accessible zero summaries', async ({
    page,
}) => {
    const state = await mock(page)

    state.empty = true

    await page.goto('/main/reports')

    await expect(
        page.getByText('Brak nowych klientów i zakończonych spraw', {
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        page.getByText('Brak klientów do podziału', { exact: true }),
    ).toBeVisible()

    await expect(
        page.getByText('Brak źródeł kontaktu do porównania', { exact: true }),
    ).toBeVisible()

    await expect(
        page.getByText('Nowi klienci: 0 · Zakończone sprawy: 0', {
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        page.getByText('Brak pracowników w tym zestawieniu.', { exact: true }),
    ).toBeVisible()

    await expect(page.locator('svg[role="application"]')).toHaveCount(0)
})

test('dashboard errors offer recovery, refresh updates live counts', async ({
    page,
}) => {
    const state = await mock(page, false)

    state.failOverview = true

    await page.goto('/main')

    const dashboardError = page
        .getByRole('alert')
        .filter({ hasText: 'Nie udało się wczytać pulpitu.' })

    await expect(dashboardError).toBeVisible({ timeout: 10000 })

    state.failOverview = false

    await dashboardError
        .getByRole('button', { name: 'Spróbuj ponownie' })
        .click()

    await expect(
        page.getByRole('group', { name: 'Podsumowanie dnia' }),
    ).toBeVisible()

    state.overview.counts.eventsToday = 19

    await page.getByRole('button', { name: 'Odśwież pulpit' }).click()

    await expect(
        page
            .getByRole('group', { name: 'Podsumowanie dnia' })
            .getByRole('link', { name: /Plan na dziś/ }),
    ).toContainText('19')
})

test('statistics errors recover without resetting filters', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/reports')

    await expect(
        page.getByRole('group', { name: 'Podsumowanie statystyk' }),
    ).toBeVisible()

    state.failStatistics = true

    await selectOption(page.getByLabel('Okres wykresu'), '3')

    const error = page
        .getByRole('alert')
        .filter({ hasText: 'Nie udało się wczytać statystyk.' })

    await expect(error).toBeVisible({ timeout: 10000 })

    state.failStatistics = false

    await error.getByRole('button', { name: 'Spróbuj ponownie' }).click()

    await expect(
        page.getByRole('group', { name: 'Podsumowanie statystyk' }),
    ).toBeVisible()

    await expect(page.getByLabel('Okres wykresu')).toHaveText(
        'Ostatnie 3 miesiące',
    )
})

test('admin payment snapshot separates currencies and partial service totals from exact received and unpaid amounts', async ({
    page,
}, info) => {
    const state = await mock(page)

    await page.goto('/main/reports')

    const payments = page.getByRole('region', {
        name: 'Płatności klientów',
        exact: true,
    })

    await expect(
        payments.getByRole('heading', {
            name: 'Aktualny stan płatności',
            exact: true,
        }),
    ).toBeVisible()

    const pln = payments.getByRole('article', {
        name: 'Płatności PLN',
        exact: true,
    })

    const eur = payments.getByRole('article', {
        name: 'Płatności EUR',
        exact: true,
    })

    await expect(pln).toContainText('6500,00 zł')

    await expect(pln).toContainText('1000,00 zł')

    await expect(pln).toContainText('500,00 zł')

    await expect(pln).toContainText('5000,00 zł')

    await expect(eur).toContainText('300,03 EUR')

    await expect(eur).toContainText('100,01 EUR')

    await expect(eur).toContainText('200,02 EUR')

    await expect(payments).toContainText('Bez podanej kwoty: 12 klientów.')

    await expect(payments).toContainText(
        'Komentarze nie są przeliczane na wpłaty.',
    )

    await expect(payments).toContainText('okres wykresu nie zmienia tych kwot')

    await selectOption(page.getByLabel('Okres wykresu'), '3')

    await expect(pln).toContainText('6500,00 zł')

    await selectOption(page.getByLabel('Pracownik', { exact: true }), '2')

    await expect
        .poll(() =>
            state.requests
                .filter(
                    (request) =>
                        new URL(request.url()).pathname ===
                        '/crm-overview/statistics',
                )
                .at(-1)
                ?.url(),
        )
        .toContain('managerId=2')

    await expect(pln).not.toContainText('6500,00 zł')

    await expect(pln).toContainText('5000,00 zł')

    await expect(pln).not.toContainText('1000,00 zł')

    await expect(eur).not.toContainText('300,03 EUR')

    await expect(eur).toContainText('100,01 EUR')

    await expect(payments).toContainText('Bez podanej kwoty: 1 klientów.')

    await payments.scrollIntoViewIfNeeded()

    await payments
        .getByRole('heading', { name: 'Aktualny stan płatności', exact: true })
        .click()

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)

    mkdirSync('/tmp/atimi-payment-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-payment-shots/statistics-${info.project.name}.png`,
        fullPage: true,
    })
})
