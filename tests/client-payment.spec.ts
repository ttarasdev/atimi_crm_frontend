import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { Client, UpdateClientDto } from '../src/api/clients/clients.types'
import type { Manager } from '../src/api/managers/managers.types'
import { selectOption } from './helpers/select-option'

const timestamps = {
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
}

async function mockPayment(
    page: Page,
    options: {
        admin?: boolean
        foreign?: boolean
        archived?: boolean
        privateDenied?: boolean
    } = {},
) {
    const manager: Manager = {
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
        roles: [
            {
                id: options.admin ? 1 : 2,
                name: options.admin ? 'admin' : 'manager',
            },
        ],
        ...timestamps,
    }

    const client: Client = {
        id: 7,
        name: 'Jan',
        surname: 'Nowak',
        managerId: options.foreign ? 2 : 1,
        isPrivate: !options.foreign,
        sourceId: null,
        language: 'pl',
        address: 'Warszawa',
        preferredContactTime: null,
        status: 'active',
        priority: 'normal',
        archivedAt: options.archived ? timestamps.createdAt : null,
        paymentStatus: 'unpaid',
        paymentAmount: null,
        paymentCurrency: 'PLN',
        paymentComment: null,
        ...timestamps,
        manager: {
            id: options.foreign ? 2 : 1,
            name: 'Opiekun',
            surname: 'Klienta',
            email: 'owner@example.test',
        },
    }

    const state: {
        client: Client
        clients: Client[]
        requests: Request[]
        failSave: number
        gate?: Promise<void>
    } = { client, clients: [client], requests: [], failSave: 0 }

    const rows = (items: unknown[]) => ({
        rows: items,
        total: items.length,
        page: 1,
        limit: 20,
        offset: 0,
    })

    await page.addInitScript(() =>
        localStorage.setItem(
            'atimi:access_token',
            'client-payment-test-session',
        ),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        const method = request.method()

        const send = (json: unknown, status = 200) =>
            route.fulfill({
                status,
                json,
                headers: { 'access-control-allow-origin': '*' },
            })

        if (method === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
                    'access-control-allow-headers':
                        'Authorization, Content-Type',
                },
            })

        state.requests.push(request)

        if (path === '/managers/me') return send(manager)

        if (path === '/clients/7') {
            if (options.privateDenied)
                return send({ message: 'Client not found' }, 404)

            if (method === 'PATCH') {
                if (state.gate) await state.gate

                if (state.failSave > 0) {
                    state.failSave--

                    return send({ message: 'Unavailable' }, 503)
                }

                const dto: UpdateClientDto = request.postDataJSON()

                Object.assign(client, dto)
            }

            return send(client)
        }

        if (path === '/clients') {
            const status = new URL(request.url()).searchParams.get(
                'paymentStatus',
            )

            return send(
                rows(
                    state.clients.filter(
                        (row) => !status || row.paymentStatus === status,
                    ),
                ),
            )
        }

        if (path.startsWith('/calendars/'))
            return send({
                id: 11,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        return send(rows([]))
    })

    return state
}

function updates(requests: Request[]) {
    return requests.filter(
        (request) =>
            request.method() === 'PATCH' &&
            new URL(request.url()).pathname === '/clients/7',
    )
}

async function capture(page: Page, name: string) {
    mkdirSync('/tmp/atimi-payment-shots', { recursive: true })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-payment-shots/${name}.png`,
        fullPage: true,
    })
}

test('admin updates payment status and plain comment, reloads it and clears the comment', async ({
    page,
}, info) => {
    const state = await mockPayment(page, { admin: true, foreign: true })

    await page.goto('/main/clients/7')

    const card = page.getByRole('region', {
        name: 'Płatność klienta',
        exact: true,
    })

    await expect(card).toHaveAttribute('data-payment-status', 'unpaid')

    await expect(card).toContainText('Nieopłacone')

    await expect(card.getByText('Nieopłacone', { exact: true })).toHaveCSS(
        'color',
        'rgb(220, 38, 38)',
    )

    await expect(card).toContainText('Nie podano kwoty')

    await card
        .getByRole('button', { name: 'Edytuj płatność', exact: true })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Edytuj płatność',
        exact: true,
    })

    await expect(
        dialog.getByLabel('Komentarz do płatności', { exact: true }),
    ).toHaveAttribute('maxlength', '2000')

    await expect(
        dialog.getByLabel(/Kwota otrzymana|Wpłacona kwota|Metoda|Transakcja/),
    ).toHaveCount(0)

    await selectOption(
        dialog.getByLabel('Status płatności', { exact: true }),
        'partial',
    )

    await dialog.getByLabel('Kwota usługi', { exact: true }).fill('5000,00')

    await expect(dialog.getByLabel('Waluta', { exact: true })).toHaveValue(
        'PLN',
    )

    const comment = 'Pierwsza część opłacona.\n<img src=x onerror=alert(1)>'

    await dialog
        .getByLabel('Komentarz do płatności', { exact: true })
        .fill(`  ${comment}  `)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    await expect(card).toHaveAttribute('data-payment-status', 'partial')

    await expect(
        card.getByText('Częściowo opłacone', { exact: true }),
    ).toHaveCSS('color', 'rgb(148, 98, 0)')

    await expect(card).toContainText(comment)

    await expect(card).toContainText('5000,00 zł')

    await expect(card.locator('img')).toHaveCount(0)

    expect(updates(state.requests).at(-1)?.postDataJSON()).toEqual({
        paymentStatus: 'partial',
        paymentAmount: '5000.00',
        paymentCurrency: 'PLN',
        paymentComment: comment,
    })

    await page.reload()

    await expect(card).toContainText(comment)

    const paymentBounds = await card.boundingBox()

    const infoBounds = await page
        .getByRole('region', { name: 'Informacje klienta', exact: true })
        .boundingBox()

    expect(paymentBounds).not.toBeNull()

    expect(infoBounds).not.toBeNull()

    if (paymentBounds && infoBounds) {
        if (info.project.name === 'desktop')
            expect(paymentBounds.x).toBeGreaterThan(
                infoBounds.x + infoBounds.width,
            )
        else expect(paymentBounds.y).toBeLessThan(infoBounds.y)
    }

    await capture(page, `partial-${info.project.name}`)

    await card
        .getByRole('button', { name: 'Edytuj płatność', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Edytuj płatność', exact: true })

    await selectOption(
        dialog.getByLabel('Status płatności', { exact: true }),
        'paid',
    )

    await dialog
        .getByLabel('Komentarz do płatności', { exact: true })
        .fill('   ')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(card.getByText('Opłacone', { exact: true })).toHaveCSS(
        'color',
        'rgb(22, 128, 61)',
    )

    await expect(card).toContainText('Brak komentarza.')

    expect(updates(state.requests).at(-1)?.postDataJSON()).toEqual({
        paymentStatus: 'paid',
        paymentAmount: '5000.00',
        paymentCurrency: 'PLN',
        paymentComment: null,
    })

    await capture(page, `paid-${info.project.name}`)
})

test('owner retries payment save without losing input and pending save blocks dismissal', async ({
    page,
}, info) => {
    const state = await mockPayment(page)

    await page.goto('/main/clients/7')

    const card = page.getByRole('region', {
        name: 'Płatność klienta',
        exact: true,
    })

    await card
        .getByRole('button', { name: 'Edytuj płatność', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Edytuj płatność',
        exact: true,
    })

    await selectOption(
        dialog.getByLabel('Status płatności', { exact: true }),
        'paid',
    )

    await dialog
        .getByLabel('Komentarz do płatności', { exact: true })
        .fill('Potwierdzono płatność.')

    state.failSave = 1

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(card).toHaveAttribute('data-payment-status', 'unpaid')

    await expect(
        dialog.getByLabel('Komentarz do płatności', { exact: true }),
    ).toHaveValue('Potwierdzono płatność.')

    await capture(page, `retry-${info.project.name}`)

    let release = () => {}

    state.gate = new Promise<void>((resolve) => {
        release = resolve
    })

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno', exact: true }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    release()

    await expect(dialog).toBeHidden()

    await expect(card).toHaveAttribute('data-payment-status', 'paid')

    expect(updates(state.requests)).toHaveLength(2)
})

test('foreign shared and archived clients have a read-only payment card; private denied client has no payment data', async ({
    page,
}) => {
    const state = await mockPayment(page, { foreign: true })

    state.client.paymentStatus = 'partial'

    state.client.paymentComment = 'Komentarz opiekuna'

    await page.goto('/main/clients/7')

    const card = page.getByRole('region', {
        name: 'Płatność klienta',
        exact: true,
    })

    await expect(card).toContainText('Komentarz opiekuna')

    await expect(
        card.getByRole('button', { name: 'Edytuj płatność', exact: true }),
    ).toHaveCount(0)

    expect(updates(state.requests)).toHaveLength(0)

    await page.unroute('**:4201/**')

    await mockPayment(page, { archived: true })

    await page.reload()

    await expect(card).toContainText('Nieopłacone')

    await expect(
        card.getByRole('button', { name: 'Edytuj płatność', exact: true }),
    ).toHaveCount(0)

    await page.unroute('**:4201/**')

    await mockPayment(page, { privateDenied: true })

    await page.reload()

    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Nie można otworzyć tego klienta' }),
    ).toBeVisible()

    await expect(card).toHaveCount(0)
})

test('service amount supports another ISO currency, amount clearing and no inference from a partial-payment comment', async ({
    page,
}) => {
    const state = await mockPayment(page)

    state.client.paymentStatus = 'partial'

    state.client.paymentAmount = '5000.00'

    state.client.paymentCurrency = 'CHF'

    state.client.paymentComment = 'Wpłacono 2000 gotówką.'

    await page.goto('/main/clients/7')

    const card = page.getByRole('region', {
        name: 'Płatność klienta',
        exact: true,
    })

    await expect(card).toContainText('5000,00 CHF')

    await card
        .getByRole('button', { name: 'Edytuj płatność', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Edytuj płatność',
        exact: true,
    })

    await expect(dialog.getByLabel('Waluta', { exact: true })).toHaveValue(
        'CHF',
    )

    await dialog.getByLabel('Kwota usługi', { exact: true }).fill('')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    await expect(card).toHaveAttribute('data-payment-status', 'partial')

    await expect(card).toContainText('Nie podano kwoty')

    await expect(card).toContainText('Wpłacono 2000 gotówką.')

    expect(updates(state.requests).at(-1)?.postDataJSON()).toEqual({
        paymentStatus: 'partial',
        paymentAmount: null,
        paymentCurrency: 'CHF',
        paymentComment: 'Wpłacono 2000 gotówką.',
    })
})

test('client list shows colored payment indicators and filters payment status through the server query', async ({
    page,
}, info) => {
    const state = await mockPayment(page)

    state.client.paymentStatus = 'partial'

    state.client.paymentAmount = '5000.00'

    state.clients.push({
        ...state.client,
        id: 8,
        name: 'Maria',
        paymentStatus: 'paid',
        paymentAmount: '100.00',
        paymentCurrency: 'EUR',
    })

    await page.goto('/main/clients')

    const list = page.getByRole('table', { name: 'Lista klientów' })

    await expect(list).toContainText('Płatność: Częściowo opłacone')

    await expect(list).toContainText('5000,00 zł')

    await expect(list).toContainText('100,00 EUR')

    await selectOption(page.getByLabel('Płatność', { exact: true }), 'partial')

    await expect
        .poll(() =>
            state.requests
                .filter(
                    (request) => new URL(request.url()).pathname === '/clients',
                )
                .at(-1)
                ?.url(),
        )
        .toContain('paymentStatus=partial')

    await expect(list).not.toContainText('Maria')

    await expect(list).toContainText('Jan Nowak')

    await capture(page, `list-filter-${info.project.name}`)

    await page
        .getByRole('button', { name: 'Wyczyść filtry', exact: true })
        .click()

    await expect(list).toContainText('Maria')
})
