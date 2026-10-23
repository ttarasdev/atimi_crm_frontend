import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { Client } from '../src/api/clients/clients.types'
import type { LegalizationProfile } from '../src/api/legalization/legalization.types'

const timestamps = {
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
}

async function mockConsent(
    page: Page,
    options: {
        admin?: boolean
        foreign?: boolean
        archived?: boolean
        sender?: boolean
        denied?: boolean
        enabled?: boolean
    } = {},
) {
    const client: Client = {
        id: 7,
        name: 'Jan',
        surname: 'Nowak',
        managerId: options.foreign ? 2 : 1,
        isPrivate: !options.foreign,
        sourceId: null,
        language: 'pl',
        address: null,
        preferredContactTime: null,
        status: 'active',
        priority: 'normal',
        paymentStatus: 'unpaid',
        paymentComment: null,
        archivedAt: options.archived ? timestamps.createdAt : null,
        ...timestamps,
        manager: {
            id: options.foreign ? 2 : 1,
            name: 'Opiekun',
            surname: 'Klienta',
            email: 'owner@example.test',
        },
    }

    const state: {
        profile: LegalizationProfile
        requests: Request[]
        failSave: boolean
        failRead: boolean
        gate?: Promise<void>
    } = {
        profile: {
            citizenship: 'ukraińskie',
            emailMarketingConsent: options.enabled ?? false,
            emailAutomationConsent: true,
        },
        requests: [],
        failSave: false,
        failRead: false,
    }

    const list = (rows: unknown[]) => ({
        rows,
        total: rows.length,
        page: 1,
        limit: 20,
        offset: 0,
    })

    await page.addInitScript(() =>
        localStorage.setItem(
            'atimi:access_token',
            'client-consent-test-session',
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
                    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
                    'access-control-allow-headers':
                        'Authorization,Content-Type',
                },
            })

        state.requests.push(request)

        if (path === '/managers/me')
            return send({
                id: 1,
                name: 'Anna',
                surname: 'Nowak',
                email: 'anna@example.test',
                status: 'active',
                remindersEnabled: false,
                roles: [
                    {
                        id: options.admin ? 1 : options.sender ? 3 : 2,
                        name: options.admin
                            ? 'admin'
                            : options.sender
                              ? 'sender'
                              : 'manager',
                    },
                ],
                ...timestamps,
            })

        if (path === '/clients/7')
            return options.denied
                ? send({ message: 'Client not found' }, 404)
                : send(client)

        if (path === '/clients/7/legalization') {
            if (method === 'GET')
                return state.failRead
                    ? send({ message: 'Access unavailable' }, 403)
                    : send(state.profile)

            if (method === 'PATCH') {
                if (state.gate) await state.gate

                if (state.failSave) return send({ message: 'Unavailable' }, 503)

                state.profile = { ...state.profile, ...request.postDataJSON() }

                return send(state.profile)
            }
        }

        if (path.startsWith('/calendars/'))
            return send({
                id: 11,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        return send(list([]))
    })

    return state
}

function updates(requests: Request[]) {
    return requests.filter(
        (request) =>
            request.method() === 'PATCH' &&
            new URL(request.url()).pathname === '/clients/7/legalization',
    )
}

function consentCard(page: Page) {
    return page.getByRole('region', {
        name: 'Udział klienta w rozsyłkach',
        exact: true,
    })
}

test('owner toggles campaign inclusion only after server acknowledgement and shares current state with legalization form', async ({
    page,
}, info) => {
    const state = await mockConsent(page)

    await page.goto('/main/clients/7')

    const card = consentCard(page)

    const toggle = card.getByRole('switch', {
        name: 'Udział w rozsyłkach',
        exact: true,
    })

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(toggle).toBeEnabled()

    expect(updates(state.requests)).toHaveLength(0)

    const gate = Promise.withResolvers<void>()

    state.gate = gate.promise

    await toggle.click()

    await expect(toggle).toBeDisabled()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(card.getByRole('status')).toHaveText('Zapisywanie ustawienia…')

    expect(updates(state.requests).at(-1)?.postDataJSON()).toEqual({
        emailMarketingConsent: true,
    })

    gate.resolve()

    state.gate = undefined

    await expect(toggle).toBeEnabled()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await expect(card.getByRole('status')).toHaveText('Ustawienie zapisane.')

    expect(state.profile.emailAutomationConsent).toBe(true)

    expect(state.profile.citizenship).toBe('ukraińskie')

    await page.getByRole('button', { name: 'Legalizacja', exact: true }).click()

    await expect(
        page.getByText('Zgoda udzielona', { exact: true }),
    ).toBeVisible()

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(page.getByText('Brak zgody', { exact: true })).toBeVisible()

    expect(updates(state.requests).at(-1)?.postDataJSON()).toEqual({
        emailMarketingConsent: false,
    })

    await page.getByRole('button', { name: 'Edytuj dane', exact: true }).click()

    const dialog = page.getByRole('dialog', {
        name: 'Dane do legalizacji',
        exact: true,
    })

    await dialog
        .getByLabel('Zgoda na wiadomości marketingowe i oferty', {
            exact: true,
        })
        .check()

    await dialog
        .getByRole('button', { name: 'Zapisz dane', exact: true })
        .click()

    await expect(dialog).toBeHidden()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await page
        .getByRole('button', { name: 'Historia zmian', exact: true })
        .click()

    const historyReads = () =>
        state.requests.filter(
            (request) =>
                new URL(request.url()).pathname === '/clients/7/activity',
        ).length

    await expect.poll(historyReads).toBeGreaterThan(0)

    const beforeHistory = historyReads()

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect.poll(historyReads).toBeGreaterThan(beforeHistory)

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await page.reload()

    await expect(consentCard(page).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
    )

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)

    mkdirSync('/tmp/atimi-mail-consent-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-mail-consent-shots/consent-${info.project.name}.png`,
        fullPage: true,
    })
})

test('failed update preserves the confirmed state and requires explicit retry', async ({
    page,
}) => {
    const state = await mockConsent(page, { enabled: true })

    await page.goto('/main/clients/7')

    const card = consentCard(page)

    const toggle = card.getByRole('switch')

    state.failSave = true

    await expect(toggle).toBeEnabled()

    await toggle.click()

    await expect(card.getByRole('alert')).toBeVisible()

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    expect(updates(state.requests)).toHaveLength(1)

    state.failSave = false

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(card.getByRole('alert')).toHaveCount(0)

    expect(updates(state.requests)).toHaveLength(2)
})

test('administrator may change another client, while public foreign and archived clients remain read-only', async ({
    page,
}) => {
    let state = await mockConsent(page, { admin: true, foreign: true })

    await page.goto('/main/clients/7')

    await consentCard(page).getByRole('switch').click()

    await expect(consentCard(page).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
    )

    expect(updates(state.requests)).toHaveLength(1)

    await page.unroute('**:4201/**')

    state = await mockConsent(page, { foreign: true, enabled: true })

    await page.reload()

    await expect(consentCard(page).getByRole('switch')).toBeDisabled()

    await expect(consentCard(page).getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'true',
    )

    expect(updates(state.requests)).toHaveLength(0)

    await page.unroute('**:4201/**')

    state = await mockConsent(page, { archived: true })

    await page.reload()

    await expect(consentCard(page).getByRole('switch')).toBeDisabled()

    expect(updates(state.requests)).toHaveLength(0)
})

test('unavailable profile remains disabled until explicit reload without writing a default consent', async ({
    page,
}) => {
    const state = await mockConsent(page)

    state.failRead = true

    await page.goto('/main/clients/7')

    const card = consentCard(page)

    await expect(card.getByRole('alert')).toContainText('Nie udało się wczytać')

    await expect(card.getByRole('switch')).toBeDisabled()

    expect(updates(state.requests)).toHaveLength(0)

    state.failRead = false

    await card
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await expect(card.getByRole('switch')).toBeEnabled()

    await expect(card.getByRole('switch')).toHaveAttribute(
        'aria-checked',
        'false',
    )

    expect(updates(state.requests)).toHaveLength(0)
})

test('sender-only and denied private client never load or mutate marketing consent', async ({
    page,
}) => {
    let state = await mockConsent(page, { sender: true })

    await page.goto('/main/clients/7')

    await expect(
        page.getByRole('heading', { name: 'Brak uprawnień', exact: true }),
    ).toBeVisible()

    expect(
        state.requests.some((request) =>
            new URL(request.url()).pathname.startsWith('/clients/7'),
        ),
    ).toBe(false)

    await page.unroute('**:4201/**')

    state = await mockConsent(page, { denied: true })

    await page.reload()

    await expect(
        page.getByText('Nie można otworzyć tego klienta.', { exact: false }),
    ).toBeVisible()

    await expect(consentCard(page)).toHaveCount(0)

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname === '/clients/7/legalization',
        ),
    ).toBe(false)
})

test('a newly enabled client can opt out without changing automation or other profile fields', async ({
    page,
}) => {
    const state = await mockConsent(page, { enabled: true })

    await page.goto('/main/clients/7')

    const card = page.getByRole('region', {
        name: 'Udział klienta w rozsyłkach',
    })

    const toggle = card.getByRole('switch', { name: 'Udział w rozsyłkach' })

    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await toggle.click()

    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await expect(card.getByText('Ustawienie zapisane.')).toBeVisible()

    expect(updates(state.requests).at(-1)?.postDataJSON()).toEqual({
        emailMarketingConsent: false,
    })

    expect(state.profile.emailAutomationConsent).toBe(true)

    expect(state.profile.citizenship).toBe('ukraińskie')
})
