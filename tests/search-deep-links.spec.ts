import { test, expect, type Page, type Request } from '@playwright/test'

const stamps = {
    createdAt: '2026-10-23T08:00:00.000Z',
    updatedAt: '2026-10-23T08:00:00.000Z',
}

const targets = [
    {
        route: '/main/leads',
        param: 'leadId',
        api: '/leads/81',
        title: 'Zgłoszenie odnalezione',
    },
    {
        route: '/main/partners',
        param: 'partnerId',
        api: '/partners/81',
        title: 'Partner odnaleziony',
    },
    {
        route: '/main/notes',
        param: 'noteId',
        api: '/manager-notes/81',
        title: 'Notatka odnaleziona',
    },
    {
        route: '/main/management/processes',
        param: 'templateId',
        api: '/process-templates/81',
        title: 'Szablon sprawy odnaleziony',
    },
    {
        route: '/main/management/stages',
        param: 'templateId',
        api: '/stage-templates/81',
        title: 'Szablon etapu odnaleziony',
    },
    {
        route: '/main/management/document-templates',
        param: 'templateId',
        api: '/document-templates/81',
        title: 'Szablon dokumentu odnaleziony',
    },
    {
        route: '/main/managers',
        param: 'managerId',
        api: '/managers/81',
        title: 'Pracownik Odnaleziony',
    },
]

async function fixture(page: Page, admin = true) {
    const state = { requests: [] as Request[], denied: false }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'search-target-test'),
    )

    const manager = {
        id: 1,
        name: 'Anna',
        surname: 'Test',
        email: 'anna@example.test',
        phone: null,
        position: null,
        avatarId: null,
        status: 'active',
        remindersEnabled: false,
        lastLoginAt: null,
        roles: [{ id: admin ? 1 : 2, name: admin ? 'admin' : 'manager' }],
        ...stamps,
    }

    const records = new Map<string, unknown>([
        [
            '/leads/81',
            {
                id: 81,
                name: targets[0].title,
                email: 'lead@example.test',
                phone: null,
                message: 'Treść wybranego zgłoszenia',
                source: 'manual',
                language: 'pl',
                status: 'converted',
                managerId: 1,
                clientId: 1,
                internalNote: null,
                externalId: null,
                consentedAt: null,
                convertedAt: stamps.createdAt,
                ...stamps,
            },
        ],
        [
            '/partners/81',
            {
                id: 81,
                name: targets[1].title,
                category: 'translation',
                contactPerson: 'Jan Test',
                email: 'partner@example.test',
                phone: null,
                additionalPhone: null,
                website: null,
                city: 'Warszawa',
                address: null,
                notes: 'Wybrany kontakt tłumacza',
                isActive: true,
                isFeatured: false,
                ...stamps,
            },
        ],
        [
            '/manager-notes/81',
            {
                id: 81,
                managerId: 1,
                title: targets[2].title,
                content: {
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Pełna treść wybranej notatki',
                                },
                            ],
                        },
                    ],
                },
                plainText: 'Pełna treść wybranej notatki',
                color: '#2563eb',
                isPinned: false,
                ...stamps,
            },
        ],
        [
            '/process-templates/81',
            {
                id: 81,
                title: targets[3].title,
                description: 'Dokładnie wskazany szablon sprawy',
                stageTemplateIds: [],
                isActive: true,
                ...stamps,
            },
        ],
        [
            '/stage-templates/81',
            {
                id: 81,
                title: targets[4].title,
                description: 'Dokładnie wskazany etap',
                iconId: null,
                color: '#2563eb',
                isActive: true,
                ...stamps,
            },
        ],
        [
            '/document-templates/81',
            {
                id: 81,
                name: targets[5].title,
                description: 'Dokładnie wskazany DOCX',
                privateAssetId: 81,
                fields: [],
                isActive: true,
                ...stamps,
            },
        ],
        [
            '/managers/81',
            {
                ...manager,
                id: 81,
                name: 'Pracownik',
                surname: 'Odnaleziony',
                email: 'worker@example.test',
                roles: [{ id: 2, name: 'manager' }],
            },
        ],
    ])

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

        if (url.pathname === '/managers/me') return send(manager)

        if (records.has(url.pathname))
            return state.denied
                ? send({ message: 'Not found' }, 404)
                : send(records.get(url.pathname))

        if (url.pathname === '/document-templates/variables') return send([])

        const pageNo = Number(url.searchParams.get('page') ?? 1)

        const limit = Number(url.searchParams.get('limit') ?? 20)

        return send({
            rows: [],
            total: 0,
            page: pageNo,
            limit,
            offset: (pageNo - 1) * limit,
            unreadCount: 0,
        })
    })

    return state
}

for (const target of targets) {
    test(`deep link ${target.param} at ${target.route} opens a record outside the loaded list`, async ({
        page,
    }) => {
        const state = await fixture(page)

        await page.goto(`${target.route}?${target.param}=81`)

        const dialog = page.getByRole('dialog')

        await expect(dialog).toBeVisible()

        await expect(dialog).toContainText(target.title)

        expect(
            state.requests.some(
                (request) => new URL(request.url()).pathname === target.api,
            ),
        ).toBe(true)

        expect(
            state.requests.every((request) => request.method() === 'GET'),
        ).toBe(true)

        await dialog.getByRole('button', { name: 'Zamknij okno' }).click()

        await expect.poll(() => new URL(page.url()).search).toBe('')

        await expect(page.getByRole('dialog')).not.toBeVisible()
    })
}

test('an unavailable direct note target shows an error without falling back to another note', async ({
    page,
}) => {
    const state = await fixture(page)

    state.denied = true

    await page.goto('/main/notes?noteId=81')

    const dialog = page.getByRole('dialog')

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie można otworzyć tej notatki',
    )

    await expect(dialog).not.toContainText(targets[2].title)

    state.denied = false

    await dialog.getByRole('button', { name: 'Spróbuj ponownie' }).click()

    await expect(dialog).toContainText(targets[2].title)
})

test('invalid and repeated direct target identifiers do not trigger record requests', async ({
    page,
}) => {
    const state = await fixture(page)

    for (const query of [
        'noteId=-1',
        'noteId=0',
        'noteId=2147483648',
        'noteId=81&noteId=82',
    ]) {
        await page.goto(`/main/notes?${query}`)

        await expect(
            page.getByRole('heading', { name: 'Notatki', exact: true }),
        ).toBeVisible()

        await expect(page.getByRole('dialog')).not.toBeVisible()
    }

    expect(
        state.requests.some((request) =>
            /\/manager-notes\/\d+$/.test(new URL(request.url()).pathname),
        ),
    ).toBe(false)
})

test('a manager cannot fetch an employee through a direct search link', async ({
    page,
}) => {
    const state = await fixture(page, false)

    await page.goto('/main/managers?managerId=81')

    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(
        page.getByRole('heading', { name: 'Brak uprawnień' }),
    ).toBeVisible()

    expect(
        state.requests.some(
            (request) => new URL(request.url()).pathname === '/managers/81',
        ),
    ).toBe(false)
})
