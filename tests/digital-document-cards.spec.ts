import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { selectOption } from './helpers/select-option'
import type { Client } from '../src/api/clients/clients.types'
import type {
    DocumentCard,
    DocumentCardType,
    LegalizationProfile,
} from '../src/api/legalization/legalization.types'

const timestamps = {
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
}

const catalog = [
    ['temporary_residence', 'Karta pobytu czasowego', true],
    ['permanent_residence', 'Karta pobytu stałego', true],
    ['eu_resident', 'Karta rezydenta długoterminowego UE', true],
    ['visa', 'Wiza', true],
    ['passport', 'Paszport', true],
    ['travel_document', 'Dokument podróży', true],
    ['work_permit', 'Zezwolenie na pracę', true],
    ['blue_card', 'Niebieska Karta UE', true],
    ['polish_card', 'Karta Polaka', true],
    ['citizenship', 'Obywatelstwo', false],
    ['permanent_status', 'Status pobytu stałego', false],
    ['eu_resident_status', 'Status rezydenta długoterminowego UE', false],
    ['pesel', 'Numer PESEL', false],
] as const

const types: DocumentCardType[] = catalog.map(
    ([code, title, requiresExpiry], index) => ({
        id: index + 1,
        code,
        title,
        requiresExpiry,
        reminderMonths: requiresExpiry ? [3, 2, 1] : [],
        reminderTime: '09:00',
        color: '#4676B4',
    }),
)

const client: Client = {
    id: 1,
    name: 'Olena',
    surname: 'Koval',
    isPrivate: true,
    managerId: 1,
    sourceId: null,
    language: 'ua',
    address: 'Adres demonstracyjny',
    preferredContactTime: null,
    status: 'active',
    priority: 'normal',
    paymentStatus: 'unpaid',
    archivedAt: null,
    ...timestamps,
}

const profile: LegalizationProfile = {
    birthDate: '1991-05-12',
    birthPlace: 'Miasto demonstracyjne',
    birthCountry: 'Ukraina',
    citizenship: 'Ukraina',
    pesel: '00000000000',
    stayBasis: 'Wiza — opis profilu nie wybiera aktualnej karty',
    emailMarketingConsent: false,
    emailAutomationConsent: false,
}

type CardWithBasis = DocumentCard & { isStayBasis: boolean }

const cardFieldNames = new Set([
    'typeId',
    'number',
    'issuingCountry',
    'issuingAuthority',
    'issuedAt',
    'expiresAt',
    'status',
    'reminderMonths',
    'notes',
    'isStayBasis',
])

function card(
    type: DocumentCardType,
    changes: Partial<CardWithBasis> = {},
): CardWithBasis {
    return {
        id: type.id,
        clientId: 1,
        typeId: type.id,
        type,
        status: 'active',
        isStayBasis: type.code === 'temporary_residence',
        issuedAt: '2025-01-01',
        ...(type.requiresExpiry ? { expiresAt: '2028-12-31' } : {}),
        reminderMonths: type.requiresExpiry ? [3, 2, 1] : [],
        notes: 'Notatka demonstracyjna przypisana do dokumentu.',
        ...timestamps,
        ...changes,
    }
}

async function setup(
    page: Page,
    options: { readonly?: boolean; longName?: boolean } = {},
) {
    const state = {
        writes: [] as { path: string; body: Record<string, unknown> }[],
        requests: [] as string[],
        client: {
            ...client,
            ...(options.readonly ? { managerId: 2, isPrivate: false } : {}),
            ...(options.longName
                ? {
                      name: 'Oleksandra Mariia',
                      surname: 'Koval-Dovhopolova-Shevchenko',
                  }
                : {}),
        },
        profile: { ...profile },
        cards: types.map((type) =>
            card(type, {
                ...(type.code === 'permanent_residence'
                    ? { expiresAt: '2038-12-31' }
                    : {}),
                ...(type.code === 'passport'
                    ? { issuedAt: '2020-01-01', expiresAt: '2022-12-31' }
                    : {}),
            }),
        ),
    }

    state.cards.push(
        card(types[3], {
            id: 14,
            status: 'replaced',
            issuedAt: '2020-01-01',
            expiresAt: '2021-12-31',
            isStayBasis: true,
        }),
        card(types[3], {
            id: 15,
            status: 'archived',
            expiresAt: '2040-12-31',
            isStayBasis: true,
        }),
    )

    await page.clock.setFixedTime(new Date('2026-10-16T10:00:00.000Z'))

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'digital-card-test-session'),
    )

    await page.route('http://localhost:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        const method = request.method()

        const send = (body: unknown, status = 200) =>
            route.fulfill({
                status,
                json: body,
                headers: { 'Access-Control-Allow-Origin': '*' },
            })

        if (method === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
                },
            })

        state.requests.push(path)

        const body =
            method === 'GET'
                ? {}
                : (request.postDataJSON() as Record<string, unknown>)

        if (method !== 'GET') state.writes.push({ path, body })

        const list = (rows: unknown[]) => ({
            rows,
            total: rows.length,
            page: 1,
            limit: 100,
            offset: 0,
        })

        if (path === '/managers/me')
            return send({
                id: 1,
                name: 'Anna',
                surname: 'Nowak',
                email: 'anna@example.test',
                status: 'active',
                avatarId: null,
                phone: null,
                position: null,
                lastLoginAt: null,
                remindersEnabled: false,
                roles: [{ id: 2, name: 'manager' }],
                ...timestamps,
            })

        if (path === '/clients/1') return send(state.client)

        if (path === '/clients/1/legalization') return send(state.profile)

        if (path === '/document-card-types') return send(list(types))

        if (path === '/calendars/manager/1')
            return send({
                id: 1,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        if (path === '/clients/1/document-cards') {
            if (method === 'GET') return send(list(state.cards))

            if (method === 'POST') {
                const type =
                    types.find((item) => item.id === body.typeId) ?? types[0]

                const created = card(type, {
                    id: state.cards.length + 1,
                    ...(body as Partial<CardWithBasis>),
                })

                if (created.isStayBasis)
                    state.cards.forEach((item) => {
                        item.isStayBasis = false
                    })

                state.cards.push(created)

                return send(created)
            }
        }

        const match = path.match(/^\/clients\/1\/document-cards\/(\d+)$/)

        if (match && method === 'PATCH') {
            const current = state.cards.find(
                (item) => item.id === Number(match[1]),
            )

            if (!current) return send({ message: 'Card not found' }, 404)

            if (body.isStayBasis === true)
                state.cards.forEach((item) => {
                    item.isStayBasis = false
                })

            Object.assign(current, body)

            return send(current)
        }

        return send(list([]))
    })

    return state
}

async function openCards(page: Page) {
    await page.goto('/main/clients/1')

    await page
        .getByRole('button', { name: 'Karty dokumentów', exact: true })
        .click()

    await expect(
        page.getByRole('heading', {
            name: 'Karty dokumentów i statusów',
            exact: true,
        }),
    ).toBeVisible()

    await expect(page.locator('article[data-document-type]')).toHaveCount(15)
}

test('all thirteen digital document types use client profile and stored card data without invented identity details', async ({
    page,
}, info) => {
    const state = await setup(page)

    await openCards(page)

    for (const type of types) {
        const document = page
            .locator(`article[data-document-type="${type.code}"]`)
            .first()

        await expect(
            document.getByRole('heading', { name: type.title, exact: true }),
        ).toBeVisible()

        await expect(document).toContainText('Olena Koval')

        if (type.code !== 'pesel')
            await expect(
                document
                    .getByText('Numer dokumentu', { exact: true })
                    .locator('..')
                    .locator('dd'),
            ).toHaveText('—')
    }

    const designs = await page
        .locator('article[data-document-type]')
        .evaluateAll((elements) =>
            elements
                .slice(0, 13)
                .map(
                    (element) =>
                        getComputedStyle(element.firstElementChild!)
                            .backgroundImage,
                ),
        )

    expect(new Set(designs).size).toBe(13)

    const passport = page.locator('article[data-document-type="passport"]')

    await expect(passport).toContainText('12.05.1991')

    await expect(passport).toContainText('Ukraina')

    await expect(passport).toContainText('31.12.2022')

    await expect(passport).toContainText('Ważność dokumentu upłynęła')

    const citizenship = page.locator(
        'article[data-document-type="citizenship"]',
    )

    await expect(citizenship).toContainText('Bezterminowo')

    await expect(page.locator('article[data-document-type] img')).toHaveCount(0)

    await expect(
        page.locator('article[data-document-type]').filter({ hasText: '<<' }),
    ).toHaveCount(0)

    expect(state.writes).toEqual([])

    mkdirSync('/tmp/atimi-digital-document-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-digital-document-shots/catalog-${info.project.name}.png`,
        fullPage: true,
    })
})

test('current stay basis comes from explicit active-card flag rather than latest expiry or profile text', async ({
    page,
}) => {
    const state = await setup(page)

    await openCards(page)

    const selected = page.locator(
        'article[data-document-type="temporary_residence"]',
    )

    const later = page.locator(
        'article[data-document-type="permanent_residence"]',
    )

    await expect(selected).toContainText('Podstawa pobytu')

    await expect(later).not.toContainText('Podstawa pobytu')

    await expect(page.getByRole('status')).toContainText(
        'Karta pobytu czasowego',
    )

    const historical = page
        .locator('article[data-document-type="visa"]')
        .filter({ hasText: /Zastąpiony|archiwum/ })

    await expect(historical).toHaveCount(2)

    await expect(historical.filter({ hasText: 'Podstawa pobytu' })).toHaveCount(
        0,
    )

    state.cards.forEach((item) => {
        item.isStayBasis = false
    })

    await openCards(page)

    await expect(page.getByRole('status')).toContainText(
        'Nie wskazano dokumentu pobytowego',
    )

    await expect(
        page
            .locator('article[data-document-type]')
            .filter({ hasText: 'Podstawa pobytu' }),
    ).toHaveCount(0)
})

test('editing stay-basis selection preserves dates and reminders and sends only document fields', async ({
    page,
}) => {
    const state = await setup(page)

    await openCards(page)

    const selected = page.locator(
        'article[data-document-type="temporary_residence"]',
    )

    await selected
        .getByRole('button', {
            name: 'Edytuj kartę: Karta pobytu czasowego',
            exact: true,
        })
        .click()

    const dialog = page.getByRole('dialog')

    const checkbox = dialog.getByRole('checkbox', {
        name: /^Podstawa pobytu w Polsce/,
    })

    await expect(checkbox).toBeChecked()

    await checkbox.uncheck()

    await dialog
        .getByRole('button', { name: 'Zapisz kartę', exact: true })
        .click()

    await expect.poll(() => state.writes.length).toBe(1)

    const write = state.writes[0]

    expect(write.path).toBe('/clients/1/document-cards/1')

    expect(write.body).toMatchObject({
        isStayBasis: false,
        expiresAt: '2028-12-31',
        issuedAt: '2025-01-01',
        reminderMonths: [3, 2, 1],
        typeId: 1,
    })

    expect(
        Object.keys(write.body).every((key) => cardFieldNames.has(key)),
    ).toBe(true)

    expect(state.requests.some((path) => path.includes('/mail'))).toBe(false)
})

test('creating a selected stay document previews profile data and stores expiry plus chosen reminders', async ({
    page,
}, info) => {
    const state = await setup(page)

    await openCards(page)

    await page.getByRole('button', { name: 'Dodaj kartę', exact: true }).click()

    const dialog = page.getByRole('dialog')

    await selectOption(
        dialog.getByRole('combobox', {
            name: 'Rodzaj dokumentu / statusu',
            exact: true,
        }),
        '4',
    )

    await dialog.getByLabel('Ważny do', { exact: true }).fill('2030-06-30')

    await dialog
        .getByRole('checkbox', { name: /^Podstawa pobytu w Polsce/ })
        .check()

    await dialog
        .getByRole('checkbox', { name: '1 miesiąc', exact: true })
        .uncheck()

    const preview = dialog.locator('article[data-document-type="visa"]')

    await expect(preview).toContainText('Olena Koval')

    await expect(preview).toContainText('30.06.2030')

    const previewBounds = await preview.boundingBox()

    const faceBounds = await preview
        .locator(':scope > div')
        .first()
        .boundingBox()

    expect(previewBounds!.height).toBeGreaterThan(200)

    expect(faceBounds!.height).toBeGreaterThan(150)

    expect(faceBounds!.y + faceBounds!.height).toBeLessThanOrEqual(
        previewBounds!.y + previewBounds!.height,
    )

    await preview.scrollIntoViewIfNeeded()

    mkdirSync('/tmp/atimi-digital-document-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-digital-document-shots/popup-${info.project.name}.png`,
    })

    await dialog
        .getByRole('button', { name: 'Dodaj kartę', exact: true })
        .click()

    await expect.poll(() => state.writes.length).toBe(1)

    expect(state.writes[0]).toMatchObject({
        path: '/clients/1/document-cards',
        body: {
            typeId: 4,
            isStayBasis: true,
            expiresAt: '2030-06-30',
            reminderMonths: [3, 2],
        },
    })

    expect(
        Object.keys(state.writes[0].body).every((key) =>
            cardFieldNames.has(key),
        ),
    ).toBe(true)

    expect(state.requests.some((path) => path.includes('/mail'))).toBe(false)
})

test('public client cards expose no write controls or owner calendar requests', async ({
    page,
}) => {
    const state = await setup(page, { readonly: true })

    await openCards(page)

    await expect(
        page.getByRole('button', { name: 'Dodaj kartę', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: /^Edytuj kartę:/ }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: /Ustaw.*podstaw|Wybierz.*podstaw/ }),
    ).toHaveCount(0)

    expect(state.writes).toEqual([])

    expect(
        state.requests.filter((path) => path.startsWith('/calendars/')),
    ).toEqual([])
})

test('digital cards fit narrow viewports with complete names and dates', async ({
    page,
}, info) => {
    await page.setViewportSize({
        width: info.project.name === 'mobile' ? 360 : 1440,
        height: 1000,
    })

    await setup(page, { longName: true })

    await openCards(page)

    const fullName = 'Oleksandra Mariia Koval-Dovhopolova-Shevchenko'

    const articles = page.locator('article[data-document-type]')

    for (const article of await articles.all()) {
        await expect(article).toContainText(fullName)

        const bounds = await article.boundingBox()

        expect(bounds).not.toBeNull()

        expect(bounds!.x).toBeGreaterThanOrEqual(0)

        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
            (page.viewportSize()?.width ?? 0) + 1,
        )

        const clipped = await article.evaluate((element) => {
            const face = element.firstElementChild!

            const bounds = face.getBoundingClientRect()

            return [...face.querySelectorAll('h3, dt, dd')]
                .filter((field) => {
                    const rect = field.getBoundingClientRect()

                    if (rect.width === 0 && rect.height === 0) return false

                    return (
                        rect.left < bounds.left - 1 ||
                        rect.right > bounds.right + 1 ||
                        rect.bottom > bounds.bottom + 1 ||
                        field.scrollWidth > field.clientWidth + 1
                    )
                })
                .map((field) => field.textContent)
        })

        expect(
            clipped,
            (await article.getAttribute('data-document-type')) ??
                'document card',
        ).toEqual([])
    }

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)

    mkdirSync('/tmp/atimi-digital-document-shots', { recursive: true })

    await articles.first().screenshot({
        path: `/tmp/atimi-digital-document-shots/first-card-${info.project.name}.png`,
    })

    await page.screenshot({
        path: `/tmp/atimi-digital-document-shots/narrow-${info.project.name}.png`,
        fullPage: true,
    })
})
