import { test, expect, type Page, type Request } from '@playwright/test'
import { selectOption } from './helpers/select-option'

const time = {
    createdAt: '2026-10-24T10:00:00Z',
    updatedAt: '2026-10-24T10:00:00Z',
}

const manager = {
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
        { id: 1, name: 'admin' },
        { id: 2, name: 'manager' },
    ],
    ...time,
}

function client(id = 1, name = 'Anna', managerId = 1) {
    return {
        id,
        name,
        surname: 'Nowak',
        managerId,
        isPrivate: true,
        sourceId: null,
        language: 'pl',
        address: null,
        preferredContactTime: null,
        status: 'new',
        priority: 'normal',
        paymentStatus: 'unpaid',
        paymentAmount: null,
        paymentCurrency: 'PLN',
        paymentComment: null,
        emailMarketingConsent: false,
        archivedAt: null,
        ...time,
    }
}

const duplicate = {
    id: 99,
    name: 'Wspólny',
    surname: 'Kontakt',
    managerId: 1,
    archivedAt: null as string | null,
    canEdit: true,
    matchedFields: ['email', 'phone'],
}

async function fixture(page: Page, unassigned = false) {
    const state = {
        requests: [] as Request[],
        duplicateErrors: 0,
        saveErrors: 0,
        delay: 0,
        rows: [duplicate],
        contacts: [] as {
            id: number
            type: string
            value: string
            label: null
            isPrimary: boolean
        }[],
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'duplicate-tests'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        const method = request.method()

        state.requests.push(request)

        const send = (body: unknown, status = 200) =>
            route.fulfill({
                status,
                contentType: 'application/json',
                body: JSON.stringify(body),
            })

        const list = <T>(rows: T[]) => ({
            rows,
            total: rows.length,
            page: 1,
            limit: 30,
            offset: 0,
        })

        if (path === '/managers/me') return send(manager)

        if (path === '/managers')
            return send(list([manager, { ...manager, id: 2, name: 'Adam' }]))

        if (path === '/clients/duplicates') {
            const rows = [...state.rows]

            if (state.delay)
                await new Promise((resolve) => setTimeout(resolve, state.delay))

            if (state.duplicateErrors > 0) {
                state.duplicateErrors--

                return send({ message: 'Unavailable' }, 503)
            }

            return send(list(rows))
        }

        if (path === '/clients' && method === 'POST') {
            if (state.saveErrors > 0) {
                state.saveErrors--

                return send({ message: 'Unavailable' }, 503)
            }

            return send({ ...client(50), ...request.postDataJSON() }, 201)
        }

        if (path === '/clients')
            return send(
                list(
                    url.searchParams.get('search')
                        ? []
                        : [client(8, 'Pierwsza strona')],
                ),
            )

        if (/^\/clients\/\d+$/.test(path))
            return send(
                client(
                    Number(path.split('/')[2]),
                    path === '/clients/99' ? 'Wspólny' : 'Anna',
                ),
            )

        if (path === '/clients/1/contacts') {
            if (method === 'POST') {
                state.contacts.push({
                    id: 5,
                    label: null,
                    isPrimary: false,
                    ...request.postDataJSON(),
                })

                return send(state.contacts.at(-1), 201)
            }

            return send(list(state.contacts))
        }

        const lead = {
            id: 2,
            name: 'Jan Nowak',
            email: ' JAN@example.test ',
            phone: '0048 (123) 456-789',
            message: 'Proszę o kontakt.',
            language: 'pl',
            source: 'website',
            status: 'new',
            managerId: unassigned ? null : 1,
            clientId: null,
            internalNote: null,
            externalId: null,
            consentedAt: time.createdAt,
            convertedAt: null,
            ...time,
        }

        if (path === '/leads') return send(list([lead]))

        if (path === '/leads/2') return send(lead)

        if (path === '/leads/2/convert')
            return send({
                lead: { ...lead, status: 'converted', clientId: 99 },
                clientId: 99,
            })

        if (path === '/company-settings')
            return send({ id: 1, name: 'Test', ...time })

        return send(list([]))
    })

    return state
}

async function openConversion(page: Page) {
    await page.goto('/main/leads')

    await page
        .getByRole('button', { name: 'Otwórz zgłoszenie Jan Nowak' })
        .click()

    await page.getByRole('button', { name: 'Przenieś do klientów' }).click()

    return page.getByRole('dialog')
}

test('duplicate advisory normalizes contacts, allows family sharing and preserves fields after save retry', async ({
    page,
}, info) => {
    const state = await fixture(page)

    await page.goto('/main/clients?create=1')

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    await dialog.getByLabel('Imię / nazwa', { exact: true }).fill('Maria')

    await dialog.getByLabel('E-mail (opcjonalnie)').fill('FAMILY@example.test')

    await dialog
        .getByLabel('Telefon (opcjonalnie)')
        .fill('0048\u00a0(123) 456-789')

    await expect(dialog.getByText('Możliwy duplikat klienta')).toBeVisible()

    await expect(
        dialog.getByRole('link', { name: 'Wspólny Kontakt' }),
    ).toHaveAttribute('href', '/main/clients/99')

    await expect(
        dialog.getByText('E-mail / Telefon', { exact: true }),
    ).toBeVisible()

    expect(
        state.requests
            .filter((r) => new URL(r.url()).pathname === '/clients/duplicates')
            .at(-1)
            ?.url(),
    ).toContain('phone=48123456789')

    expect(
        state.requests
            .filter((r) => new URL(r.url()).pathname === '/clients/duplicates')
            .at(-1)
            ?.url(),
    ).toContain('email=family%40example.test')

    if (info.project.name === 'mobile') {
        await dialog
            .getByText('Możliwy duplikat klienta')
            .scrollIntoViewIfNeeded()

        await page.screenshot({
            path: `/tmp/atimi-duplicates-create-mobile.png`,
            fullPage: true,
        })
    }

    state.saveErrors = 1

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('Nie udało się')

    await expect(dialog.getByLabel('Telefon (opcjonalnie)')).toHaveValue(
        '0048\u00a0(123) 456-789',
    )

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/clients\/50$/)

    expect(
        state.requests
            .filter(
                (r) =>
                    new URL(r.url()).pathname === '/clients' &&
                    r.method() === 'POST',
            )
            .at(-1)
            ?.postDataJSON(),
    ).toMatchObject({
        email: 'family@example.test',
        phone: '0048\u00a0(123) 456-789',
    })

    expect(
        state.requests.some(
            (r) => /\/contacts$/.test(r.url()) && r.method() === 'POST',
        ),
    ).toBe(false)
})

test('duplicate lookup rejects invalid phones, hides stale results immediately, recovers after query errors and never blocks save', async ({
    page,
}) => {
    const state = await fixture(page)

    await page.goto('/main/clients?create=1')

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    const phone = dialog.getByLabel('Telefon (opcjonalnie)')

    await phone.fill('123456')

    await page.waitForTimeout(500)

    await phone.fill('1234567890123456')

    await page.waitForTimeout(500)

    await phone.fill('1234567 ext 2')

    await page.waitForTimeout(500)

    expect(
        state.requests.some(
            (r) => new URL(r.url()).pathname === '/clients/duplicates',
        ),
    ).toBe(false)

    await phone.fill('+48123456789')

    await expect(dialog.getByText('Możliwy duplikat klienta')).toBeVisible()

    state.delay = 700

    await phone.fill('+48987654321')

    await expect(dialog.getByText('Możliwy duplikat klienta')).toHaveCount(0)

    await expect
        .poll(
            () =>
                state.requests.filter(
                    (r) => new URL(r.url()).pathname === '/clients/duplicates',
                ).length,
        )
        .toBe(2)

    await phone.fill('')

    await page.waitForTimeout(800)

    await expect(dialog.getByText('Możliwy duplikat klienta')).toHaveCount(0)

    state.delay = 0

    state.duplicateErrors = 1

    await phone.fill('+48777777777')

    await expect(dialog.getByRole('alert')).toContainText('dostępnych kart')

    await expect(
        dialog.getByRole('button', { name: 'Dodaj klienta', exact: true }),
    ).toBeEnabled()

    await dialog
        .getByRole('button', { name: 'Ponów sprawdzanie duplikatów' })
        .click()

    await expect(dialog.getByText('Możliwy duplikat klienta')).toBeVisible()
})

test('duplicate conversion selects an exact off-page client and keeps it after searching another page', async ({
    page,
}, info) => {
    const state = await fixture(page)

    state.rows = [
        duplicate,
        { ...duplicate, id: 100, name: 'Inny opiekun', managerId: 2 },
        {
            ...duplicate,
            id: 101,
            name: 'Archiwalny',
            archivedAt: time.createdAt,
        },
        { ...duplicate, id: 102, name: 'Podgląd', canEdit: false },
    ]

    const dialog = await openConversion(page)

    await expect(
        dialog.getByRole('button', { name: 'Połącz z tym klientem' }),
    ).toHaveCount(1)

    await expect(
        dialog.getByRole('link', { name: 'Inny opiekun Kontakt' }),
    ).toBeVisible()

    await expect(
        dialog.getByRole('link', { name: 'Archiwalny Kontakt' }),
    ).toBeVisible()

    const query = new URL(
        state.requests
            .find((r) => new URL(r.url()).pathname === '/clients/duplicates')!
            .url(),
    )

    expect(query.searchParams.get('email')).toBe('jan@example.test')

    expect(query.searchParams.get('phone')).toBe('48123456789')

    expect(
        state.requests.some((r) => new URL(r.url()).pathname === '/clients'),
    ).toBe(false)

    await dialog.getByRole('button', { name: 'Połącz z tym klientem' }).click()

    await expect(
        dialog.getByRole('button', { name: 'Połącz z klientem', exact: true }),
    ).toBeEnabled()

    expect(
        state.requests.some((r) => new URL(r.url()).pathname === '/clients/99'),
    ).toBe(true)

    await dialog.getByLabel('Szukaj klienta').fill('Nie istnieje')

    await expect
        .poll(() =>
            state.requests.some(
                (r) =>
                    new URL(r.url()).searchParams.get('search') ===
                    'Nie istnieje',
            ),
        )
        .toBe(true)

    await expect(
        dialog.getByRole('combobox', { name: 'Istniejący klient' }),
    ).toContainText('Wspólny Nowak')

    if (info.project.name === 'mobile')
        await page.screenshot({
            path: `/tmp/atimi-duplicates-convert-mobile.png`,
            fullPage: true,
        })

    expect(state.requests.some((r) => r.method() === 'POST')).toBe(false)

    await dialog
        .getByRole('button', { name: 'Połącz z klientem', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/clients\/99$/)

    expect(
        state.requests
            .find((r) => new URL(r.url()).pathname === '/leads/2/convert')
            ?.postDataJSON(),
    ).toEqual({ clientId: 99 })
})

test('duplicate conversion requires an explicit owner and clears the chosen client when the owner changes', async ({
    page,
}) => {
    await fixture(page, true)

    const dialog = await openConversion(page)

    await expect(dialog.getByText('Możliwy duplikat klienta')).toBeVisible()

    await expect(
        dialog.getByRole('button', { name: 'Połącz z tym klientem' }),
    ).toHaveCount(0)

    await selectOption(
        dialog.getByRole('combobox', { name: 'Opiekun zgłoszenia i klienta' }),
        '1',
    )

    await dialog.getByRole('button', { name: 'Połącz z tym klientem' }).click()

    await expect(
        dialog.getByRole('button', { name: 'Połącz z klientem', exact: true }),
    ).toBeEnabled()

    await selectOption(
        dialog.getByRole('combobox', { name: 'Opiekun zgłoszenia i klienta' }),
        '2',
    )

    await expect(
        dialog.getByRole('combobox', { name: 'Istniejący klient' }),
    ).toContainText('Wybierz klienta')

    await expect(
        dialog.getByRole('button', { name: 'Połącz z klientem', exact: true }),
    ).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Połącz z tym klientem' }),
    ).toHaveCount(0)
})

test('duplicate contact edit excludes the current card and checks WhatsApp as a full phone number', async ({
    page,
}) => {
    const state = await fixture(page)

    state.contacts.push({
        id: 4,
        type: 'whatsapp',
        value: '+48123456789',
        label: null,
        isPrimary: true,
    })

    await page.goto('/main/clients/1')

    await page
        .getByRole('button', { name: 'Dane i kontakt', exact: true })
        .click()

    await page.getByRole('button', { name: 'Edytuj +48123456789' }).click()

    const dialog = page.getByRole('dialog', { name: 'Edytuj kontakt' })

    await expect(dialog.getByText('Możliwy duplikat klienta')).toBeVisible()

    const query = new URL(
        state.requests
            .find((r) => new URL(r.url()).pathname === '/clients/duplicates')!
            .url(),
    )

    expect(query.searchParams.get('excludeClientId')).toBe('1')

    expect(query.searchParams.get('phone')).toBe('48123456789')

    await dialog.getByLabel('Numer telefonu').fill('')

    await expect(dialog.getByText('Możliwy duplikat klienta')).toHaveCount(0)
})

test('duplicate phone lookup accepts exact seven and fifteen digit boundaries', async ({
    page,
}) => {
    const state = await fixture(page)

    await page.goto('/main/clients?create=1')

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    const phone = dialog.getByLabel('Telefon (opcjonalnie)')

    await phone.fill('1234567')

    await expect(
        dialog.getByText('Sprawdzanie podobnych klientów…'),
    ).toBeVisible()

    await expect(dialog.getByText('Możliwy duplikat klienta')).toBeVisible()

    await phone.fill('+123456789012345')

    await expect
        .poll(() =>
            state.requests
                .filter(
                    (r) => new URL(r.url()).pathname === '/clients/duplicates',
                )
                .map((r) => new URL(r.url()).searchParams.get('phone')),
        )
        .toEqual(['1234567', '123456789012345'])
})
