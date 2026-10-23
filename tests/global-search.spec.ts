import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { SearchGroup, SearchItem } from '../src/api/search/search.types'

const timestamps = {
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
}

const client = {
    id: 7,
    name: 'Anna',
    surname: 'Nowak',
    managerId: 1,
    isPrivate: true,
    sourceId: null,
    status: 'active',
    priority: 'normal',
    paymentStatus: 'unpaid',
    paymentCurrency: 'PLN',
    archivedAt: null,
    manager: { id: 1, name: 'Jan', surname: 'Opiekun' },
    ...timestamps,
}

const process = {
    id: 500,
    clientId: 7,
    managerId: 1,
    title: 'Sprawa znaleziona po numerze',
    status: 'active',
    caseData: { referenceNumber: 'REF-2026' },
    completedAt: null,
    ...timestamps,
}

const stage = {
    id: 600,
    clientProcessId: 500,
    stageTemplateId: null,
    title: 'Dokładny etap z wyszukiwarki',
    iconId: null,
    color: '#2563eb',
    assignedManagerId: null,
    sortKey: 10000,
    status: 'planned',
    plannedAt: null,
    completedAt: null,
    ...timestamps,
}

const item = (id: number, title = `Klient ${id}`): SearchItem => ({
    type: 'client',
    id,
    kind: 'client',
    title,
    subtitle: 'Klient',
    clientId: id,
})

const rows = <T>(items: T[]) => ({
    rows: items,
    total: items.length,
    page: 1,
    limit: 20,
    offset: 0,
})

async function mockSearch(page: Page, senderOnly = false) {
    const state: {
        groups: SearchGroup[]
        requests: Request[]
        searchStatus: number
        fileStatus: number
        targetStatus: number
        gateQuery?: string
        gate?: Promise<void>
        queryResults: Map<string, SearchGroup[]>
    } = {
        groups: [
            { type: 'client', items: [item(7, 'Anna Nowak')], hasMore: false },
        ],
        requests: [],
        searchStatus: 200,
        fileStatus: 200,
        targetStatus: 200,
        queryResults: new Map(),
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'search-test-session'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        const send = (json: unknown, status = 200) =>
            route.fulfill({
                status,
                json,
                headers: { 'access-control-allow-origin': '*' },
            })

        if (request.method() === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'GET,POST,OPTIONS',
                    'access-control-allow-headers':
                        'Authorization,Content-Type',
                },
            })

        state.requests.push(request)

        if (path === '/managers/me')
            return send({
                id: 1,
                name: 'Jan',
                surname: 'Opiekun',
                email: 'manager@example.test',
                status: 'active',
                remindersEnabled: false,
                roles: [
                    {
                        id: senderOnly ? 3 : 2,
                        name: senderOnly ? 'sender' : 'manager',
                    },
                ],
                ...timestamps,
            })

        if (path === '/search') {
            const q = url.searchParams.get('q') ?? ''

            const groups = state.queryResults.get(q) ?? state.groups

            if (state.gateQuery === q && state.gate) await state.gate

            return send(
                state.searchStatus === 200
                    ? { query: q, mode: q ? 'results' : 'suggestions', groups }
                    : { message: 'Access unavailable' },
                state.searchStatus,
            )
        }

        if (path === '/search/client') {
            const pageNumber = Number(url.searchParams.get('page'))

            const all = Array.from({ length: 23 }, (_, i) => item(100 + i))

            return send({
                rows: all.slice((pageNumber - 1) * 20, pageNumber * 20),
                total: 23,
                page: pageNumber,
                limit: 20,
                offset: (pageNumber - 1) * 20,
            })
        }

        if (path === '/private-assets/45/file')
            return state.fileStatus !== 200
                ? send({ message: 'File unavailable' }, state.fileStatus)
                : route.fulfill({
                      status: 200,
                      contentType: 'application/pdf',
                      body: '%PDF-1.7\nfile\n%%EOF',
                      headers: { 'access-control-allow-origin': '*' },
                  })

        if (path === '/partners/71')
            return send({
                id: 71,
                name: 'Dokładny partner',
                category: 'legal',
                city: 'Warszawa',
                isActive: true,
                isFeatured: false,
                ...timestamps,
            })

        if (path === '/clients/7') return send(client)

        if (path === '/clients/7/legalization')
            return send({
                emailMarketingConsent: false,
                emailAutomationConsent: false,
            })

        if (path === '/clients/7/processes')
            return send({
                ...rows([{ ...process, id: 9, title: 'Inna sprawa' }]),
                total: 101,
                limit: 100,
            })

        if (path === '/clients/7/processes/500')
            return state.targetStatus === 200
                ? send(process)
                : send({ message: 'Process not found' }, 404)

        if (path === '/clients/7/processes/500/stages')
            return send({
                ...rows([
                    {
                        ...stage,
                        id: 11,
                        title: 'Inny aktywny etap',
                        sortKey: 1000,
                        status: 'active',
                    },
                ]),
                total: 101,
                limit: 100,
            })

        if (path === '/clients/7/processes/500/stages/600')
            return state.targetStatus === 200
                ? send(stage)
                : send({ message: 'Stage not found' }, 404)

        if (path === '/document-upload-notifications')
            return send({ ...rows([]), unreadCount: 0 })

        if (path.startsWith('/calendars/'))
            return send({
                id: 10,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        return send(rows([]))
    })

    return state
}

async function openSearch(page: Page) {
    await page
        .getByRole('button', { name: 'Szukaj w CRM', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Szukaj w CRM',
        exact: true,
    })

    await expect(dialog.getByLabel('Szukaj w całym CRM')).toBeFocused()

    return dialog
}

test('header search groups previews, pages one category, restores previews and fits both screens', async ({
    page,
}, info) => {
    const state = await mockSearch(page)

    state.groups = [
        {
            type: 'client',
            items: [item(7, 'Anna Nowak'), item(8), item(9)],
            hasMore: true,
        },
        {
            type: 'section',
            items: [
                {
                    type: 'section',
                    id: 1,
                    kind: 'section',
                    key: 'documents',
                    title: 'Dokumenty',
                    subtitle: '/main/documents',
                },
            ],
            hasMore: false,
        },
    ]

    await page.goto('/main/profile')

    const dialog = await openSearch(page)

    await expect(
        dialog
            .getByRole('region', { name: 'Klienci', exact: true })
            .getByRole('button'),
    ).toHaveCount(4)

    await expect(
        dialog.getByRole('region', { name: 'Sekcje aplikacji' }),
    ).toBeVisible()

    await expect(dialog).toContainText('Ostatnie wpisy i skróty')

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)

    const panel = await dialog.locator('[data-popup-panel]').boundingBox()

    if (info.project.name === 'mobile') {
        expect(panel?.width).toBe(page.viewportSize()?.width)

        expect(panel?.height).toBe(page.viewportSize()?.height)
    }

    mkdirSync('/tmp/atimi-global-search-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-global-search-shots/search-${info.project.name}.png`,
        fullPage: false,
    })

    await dialog
        .getByRole('button', { name: 'Pokaż wszystkie: Klienci' })
        .click()

    await expect(
        dialog
            .getByRole('region', { name: 'Klienci', exact: true })
            .getByRole('button'),
    ).toHaveCount(20)

    await dialog.getByRole('button', { name: 'Pokaż więcej wyników' }).click()

    await expect(
        dialog
            .getByRole('region', { name: 'Klienci', exact: true })
            .getByRole('button'),
    ).toHaveCount(23)

    await expect(
        dialog.getByRole('button', { name: 'Pokaż więcej wyników' }),
    ).toHaveCount(0)

    expect(
        state.requests
            .filter(
                (request) =>
                    new URL(request.url()).pathname === '/search/client',
            )
            .map((request) => new URL(request.url()).searchParams.get('page')),
    ).toEqual(['1', '2'])

    await dialog.getByRole('button', { name: 'Wszystkie kategorie' }).click()

    await expect(
        dialog.getByRole('button', { name: 'Pokaż wszystkie: Klienci' }),
    ).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeHidden()

    await expect(
        page.getByRole('button', { name: 'Szukaj w CRM', exact: true }),
    ).toBeFocused()
})

test('input debounces 300ms, hides stale results immediately and ignores cancelled old response', async ({
    page,
}) => {
    const state = await mockSearch(page)

    state.queryResults.set('Old', [
        { type: 'client', items: [item(8, 'Stary wynik')], hasMore: false },
    ])

    state.queryResults.set('New', [
        { type: 'client', items: [item(9, 'Nowy wynik')], hasMore: false },
    ])

    const gate = Promise.withResolvers<void>()

    state.gateQuery = 'Old'

    state.gate = gate.promise

    await page.goto('/main/profile')

    const dialog = await openSearch(page)

    await expect(
        dialog.getByRole('button', { name: 'Anna Nowak Klient' }),
    ).toBeVisible()

    await page.clock.install()

    await page.clock.pauseAt(new Date(Date.now() + 1000))

    await dialog.getByLabel('Szukaj w całym CRM').fill('Old')

    await expect(
        dialog.getByRole('button', { name: 'Anna Nowak Klient' }),
    ).toHaveCount(0)

    const queried = (q: string) =>
        state.requests.filter(
            (request) =>
                new URL(request.url()).pathname === '/search' &&
                new URL(request.url()).searchParams.get('q') === q,
        ).length

    expect(queried('Old')).toBe(0)

    await page.clock.fastForward(299)

    expect(queried('Old')).toBe(0)

    await page.clock.fastForward(1)

    await expect.poll(() => queried('Old')).toBe(1)

    await dialog.getByLabel('Szukaj w całym CRM').fill('New')

    await page.clock.fastForward(300)

    await page.clock.resume()

    await expect(
        dialog.getByRole('button', { name: 'Nowy wynik Klient' }),
    ).toBeVisible()

    gate.resolve()

    await expect(
        dialog.getByRole('button', { name: 'Stary wynik Klient' }),
    ).toHaveCount(0)

    expect(queried('New')).toBe(1)
})

test('search opens the exact client and an off-page case and stage instead of the active stage', async ({
    page,
}) => {
    const state = await mockSearch(page)

    await page.goto('/main/profile')

    let dialog = await openSearch(page)

    await dialog.getByRole('button', { name: 'Anna Nowak Klient' }).click()

    await expect(page).toHaveURL('/main/clients/7')

    await expect(
        page.getByRole('heading', { name: 'Anna Nowak', exact: true }),
    ).toBeVisible()

    state.groups = [
        {
            type: 'stage',
            items: [
                {
                    type: 'stage',
                    id: 600,
                    kind: 'stage',
                    title: stage.title,
                    subtitle: process.title,
                    clientId: 7,
                    processId: 500,
                    stageId: 600,
                },
            ],
            hasMore: false,
        },
    ]

    dialog = await openSearch(page)

    await dialog
        .getByRole('button', { name: `${stage.title} ${process.title}` })
        .click()

    await expect(page).toHaveURL('/main/clients/7?processId=500&stageId=600')

    await expect(
        page.getByRole('region', {
            name: `Wybrany etap ${stage.title}`,
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        page.getByRole('region', {
            name: 'Wybrany etap Inny aktywny etap',
            exact: true,
        }),
    ).toHaveCount(0)

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname === '/clients/7/processes/500',
        ),
    ).toBe(true)

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname ===
                '/clients/7/processes/500/stages/600',
        ),
    ).toBe(true)

    expect(state.requests.every((request) => request.method() === 'GET')).toBe(
        true,
    )
})

test('unavailable exact case produces an access message without rendering its stale search title', async ({
    page,
}) => {
    const state = await mockSearch(page)

    state.targetStatus = 404

    await page.goto('/main/clients/7?processId=500&stageId=600')

    await expect(
        page.getByText('Nie można otworzyć wskazanej sprawy.', { exact: true }),
    ).toBeVisible()

    await expect(page.getByText(process.title, { exact: true })).toHaveCount(0)

    await expect(
        page.getByRole('region', {
            name: `Wybrany etap ${stage.title}`,
            exact: true,
        }),
    ).toHaveCount(0)
})

test('document uses an authorized download, reports revoked access and explicitly retries with a safe filename', async ({
    page,
}) => {
    const state = await mockSearch(page)

    state.groups = [
        {
            type: 'document',
            items: [
                {
                    type: 'document',
                    id: 45,
                    kind: 'file',
                    title: 'Skan paszportu',
                    subtitle: 'application/pdf',
                    assetId: 45,
                },
            ],
            hasMore: false,
        },
    ]

    state.fileStatus = 404

    await page.goto('/main/profile')

    const dialog = await openSearch(page)

    await dialog.getByRole('button', { name: 'Skan paszportu PDF' }).click()

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie można pobrać pliku',
    )

    state.fileStatus = 200

    const download = page.waitForEvent('download')

    await dialog.getByRole('button', { name: 'Skan paszportu PDF' }).click()

    expect((await download).suggestedFilename()).toBe('Skan paszportu.pdf')

    const reads = state.requests.filter(
        (request) =>
            new URL(request.url()).pathname === '/private-assets/45/file',
    )

    expect(reads).toHaveLength(2)

    expect(
        reads.every(
            (request) =>
                request.headers().authorization ===
                'Bearer search-test-session',
        ),
    ).toBe(true)
})

test('failed search can retry; changed query shows empty state and sender-only never mounts search', async ({
    page,
}) => {
    let state = await mockSearch(page)

    state.searchStatus = 403

    await page.goto('/main/profile')

    const dialog = await openSearch(page)

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie udało się wyszukać',
    )

    state.searchStatus = 200

    await dialog
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await expect(
        dialog.getByRole('button', { name: 'Anna Nowak Klient' }),
    ).toBeVisible()

    state.queryResults.set('No match', [])

    await dialog.getByLabel('Szukaj w całym CRM').fill('No match')

    await expect(dialog.getByRole('status')).toHaveText(
        'Brak wyników. Zmień wpisane hasło.',
    )

    await page.keyboard.press('Escape')

    await page.unroute('**:4201/**')

    state = await mockSearch(page, true)

    await page.goto('/main/profile')

    await expect(
        page.getByRole('heading', { name: 'Mój profil', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Szukaj w CRM', exact: true }),
    ).toHaveCount(0)

    expect(
        state.requests.some((request) =>
            new URL(request.url()).pathname.startsWith('/search'),
        ),
    ).toBe(false)
})

test('soft navigation opens exact partner, closing clears selection and search can reopen same record', async ({
    page,
}) => {
    const state = await mockSearch(page)

    state.groups = [
        {
            type: 'partner',
            items: [
                {
                    type: 'partner',
                    kind: 'partner',
                    id: 71,
                    title: 'Dokładny partner',
                    subtitle: 'Warszawa',
                },
            ],
            hasMore: false,
        },
    ]

    await page.goto('/main/profile')

    for (let attempt = 0; attempt < 2; attempt++) {
        const search = await openSearch(page)

        await search
            .getByRole('button', {
                name: 'Dokładny partner Warszawa',
                exact: true,
            })
            .click()

        await expect(page).toHaveURL('/main/partners?partnerId=71')

        const detail = page.getByRole('dialog', {
            name: 'Kontakt partnera',
            exact: true,
        })

        await expect(
            detail.getByRole('heading', {
                name: 'Dokładny partner',
                exact: true,
            }),
        ).toBeVisible()

        await detail
            .getByRole('button', { name: 'Zamknij okno', exact: true })
            .click()

        await expect(detail).toBeHidden()

        await expect(page).toHaveURL('/main/partners')
    }

    expect(
        state.requests.some(
            (request) => new URL(request.url()).pathname === '/partners/71',
        ),
    ).toBe(true)
})
