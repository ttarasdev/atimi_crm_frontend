import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type {
    Lead,
    CreateLeadDto,
    UpdateLeadDto,
} from '../src/api/leads/leads.types'
import type { Manager } from '../src/api/managers/managers.types'
import { selectOption } from './helpers/select-option'

const time = {
    createdAt: '2026-10-06T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
}

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
        { id: 1, name: 'admin' },
        { id: 2, name: 'manager' },
    ],
    ...time,
}

function lead(id: number, changes: Partial<Lead> = {}): Lead {
    return {
        id,
        name: 'Jan Nowak',
        email: 'jan@example.test',
        phone: '+48123456789',
        message:
            'Szukam mieszkania we Wrocławiu. Chciałbym umówić konsultację.',
        language: 'pl',
        source: 'website',
        status: 'new',
        managerId: null,
        clientId: null,
        internalNote: null,
        externalId: null,
        consentedAt: time.createdAt,
        convertedAt: null,
        ...time,
        ...changes,
    }
}

async function mock(page: Page, admin = true) {
    const state = {
        rows: [
            lead(1),
            lead(2, {
                name: 'Olena Bondar',
                source: 'instagram',
                managerId: 1,
                status: 'qualified',
                language: 'ua',
                manager: {
                    id: 1,
                    name: 'Anna',
                    surname: 'Kowalska',
                    email: manager.email,
                },
            }),
            lead(3, {
                name: 'Piotr Zieliński',
                source: 'facebook',
                managerId: 2,
                status: 'contacted',
            }),
        ],
        requests: [] as Request[],
        failSave: false,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'leads-test'),
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

        if (path === '/managers/me')
            return send({
                ...manager,
                roles: admin ? manager.roles : [{ id: 2, name: 'manager' }],
            })

        if (path === '/managers')
            return send(
                list([
                    manager,
                    {
                        ...manager,
                        id: 2,
                        name: 'Adam',
                        surname: 'Nowicki',
                        email: 'adam@example.test',
                    },
                ]),
            )

        if (path === '/leads' && method === 'GET') {
            let rows = state.rows.filter(
                (item) => admin || item.managerId === 1,
            )

            const search = url.searchParams.get('search')?.toLowerCase()

            const source = url.searchParams.get('source')

            const status = url.searchParams.get('status')

            const owner = url.searchParams.get('managerId')

            if (search)
                rows = rows.filter((item) =>
                    item.name.toLowerCase().includes(search),
                )

            if (source) rows = rows.filter((item) => item.source === source)

            if (status) rows = rows.filter((item) => item.status === status)

            if (owner)
                rows = rows.filter((item) => item.managerId === Number(owner))

            if (url.searchParams.get('unassigned') === 'true')
                rows = rows.filter((item) => item.managerId === null)

            return send(list(rows))
        }

        if (path === '/leads' && method === 'POST') {
            const dto = request.postDataJSON() as CreateLeadDto

            const created = lead(10, {
                ...dto,
                email: dto.email ?? null,
                phone: dto.phone ?? null,
                managerId: admin ? (dto.managerId ?? null) : 1,
                consentedAt: null,
            })

            state.rows.push(created)

            return send(created, 201)
        }

        const detail = /^\/leads\/(\d+)$/.exec(path)

        if (detail) {
            const item = state.rows.find((row) => row.id === Number(detail[1]))

            if (!item) return send({ message: 'Not found' }, 404)

            if (method === 'GET') return send(item)

            if (method === 'PATCH') {
                if (state.failSave) return send({ message: 'Conflict' }, 409)

                Object.assign(item, request.postDataJSON() as UpdateLeadDto, {
                    updatedAt: '2026-10-07T12:00:00Z',
                })

                return send(item)
            }
        }

        const convert = /^\/leads\/(\d+)\/convert$/.exec(path)

        if (convert) {
            const item = state.rows.find(
                (row) => row.id === Number(convert[1]),
            )!

            const dto = request.postDataJSON() as {
                clientId?: number
                managerId?: number
            }

            item.status = 'converted'

            item.clientId = dto.clientId ?? 15

            item.managerId ??= dto.managerId ?? null

            return send({ lead: item, clientId: item.clientId })
        }

        const client = (id: number, owner: number, name: string) => ({
            id,
            name,
            surname: 'Nowak',
            managerId: owner,
            sourceId: null,
            language: 'pl',
            address: null,
            preferredContactTime: null,
            status: 'new',
            priority: 'normal',
            archivedAt: null,
            ...time,
        })

        if (path === '/clients')
            return send(list([client(8, 1, 'Własny'), client(9, 2, 'Cudzy')]))

        if (/^\/clients\/\d+$/.test(path))
            return send(client(Number(path.split('/')[2]), 1, 'Jan'))

        if (path === '/client-sources' || path.includes('/clients/'))
            return send(list([]))

        if (path === '/company-settings')
            return send({ id: 1, name: 'Tsehenko', ...time })

        return send(list([]))
    })

    return state
}

test('admin filters, assigns and changes a lead; failed save keeps the fields', async ({
    page,
}, info) => {
    const state = await mock(page)

    await page.goto('/main/leads')

    await expect(
        page.getByRole('button', { name: 'Otwórz zgłoszenie Jan Nowak' }),
    ).toBeVisible()

    await selectOption(
        page.getByRole('combobox', { name: 'Opiekun zgłoszenia' }),
        'unassigned',
    )

    await expect(
        page.getByRole('button', { name: 'Otwórz zgłoszenie Olena Bondar' }),
    ).toHaveCount(0)

    await page
        .getByRole('button', { name: 'Otwórz zgłoszenie Jan Nowak' })
        .click()

    const dialog = page.getByRole('dialog')

    await expect(
        dialog.getByText('Szukam mieszkania we Wrocławiu.', { exact: false }),
    ).toBeVisible()

    await selectOption(
        dialog.getByRole('combobox', { name: 'Status zgłoszenia' }),
        'contacted',
    )

    await selectOption(
        dialog.getByRole('combobox', { name: 'Przydzielenie' }),
        'assigned',
    )

    await selectOption(
        dialog.getByRole('combobox', { name: 'Opiekun zgłoszenia' }),
        '1',
    )

    await dialog.getByLabel('Notatka wewnętrzna').fill('Zadzwonić w piątek')

    state.failSave = true

    await dialog.getByRole('button', { name: 'Zapisz zgłoszenie' }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(dialog.getByLabel('Notatka wewnętrzna')).toHaveValue(
        'Zadzwonić w piątek',
    )

    state.failSave = false

    await dialog.getByRole('button', { name: 'Zapisz zgłoszenie' }).click()

    await expect(dialog).toHaveCount(0)

    expect(state.rows[0]).toMatchObject({
        managerId: 1,
        status: 'contacted',
        internalNote: 'Zadzwonić w piątek',
    })

    await selectOption(
        page.getByRole('combobox', { name: 'Opiekun zgłoszenia' }),
        'all',
    )

    await expect(
        page.getByRole('button', { name: 'Otwórz zgłoszenie Jan Nowak' }),
    ).toBeVisible()

    mkdirSync('/tmp/ivan-leads-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-leads-qa/leads-${info.project.name}.png`,
        fullPage: true,
    })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
    ).toBe(true)
})

test('manual social lead accepts phone only and manager has no assignment controls', async ({
    page,
}) => {
    const state = await mock(page, false)

    await page.goto('/main/leads')

    await expect(
        page.getByRole('combobox', { name: 'Opiekun zgłoszenia' }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Dodaj zgłoszenie' }).click()

    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Imię i nazwisko / nazwa').fill('Maria Kowal')

    await dialog.getByLabel('Telefon', { exact: true }).fill('+48123456789')

    await dialog.getByLabel('Treść zgłoszenia').fill('Kontakt z Instagrama')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Język', exact: true }),
        'ua',
    )

    await selectOption(
        dialog.getByRole('combobox', { name: 'Źródło' }),
        'instagram',
    )

    await dialog
        .getByRole('button', { name: 'Dodaj zgłoszenie', exact: true })
        .click()

    await expect(dialog).toHaveCount(0)

    const created = state.requests.find(
        (request) =>
            request.url().endsWith('/leads') && request.method() === 'POST',
    )!

    expect(created.postDataJSON()).toMatchObject({
        name: 'Maria Kowal',
        phone: '+48123456789',
        source: 'instagram',
        language: 'ua',
    })

    expect(created.postDataJSON()).not.toHaveProperty('managerId')

    expect(created.postDataJSON()).not.toHaveProperty('email')

    expect(
        state.requests.some(
            (request) => new URL(request.url()).pathname === '/managers',
        ),
    ).toBe(false)
})

test('unassigned website lead converts to a new client after choosing its owner', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/leads')

    await page
        .getByRole('button', { name: 'Otwórz zgłoszenie Jan Nowak' })
        .click()

    await page.getByRole('button', { name: 'Przenieś do klientów' }).click()

    const dialog = page.getByRole('dialog')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Opiekun zgłoszenia i klienta' }),
        '1',
    )

    await expect(dialog.getByLabel('Imię / nazwa klienta')).toHaveValue('Jan')

    await expect(dialog.getByLabel('Nazwisko klienta')).toHaveValue('Nowak')

    await dialog
        .getByRole('button', { name: 'Utwórz klienta', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/clients\/15$/)

    const conversion = state.requests.find(
        (request) => new URL(request.url()).pathname === '/leads/1/convert',
    )!

    expect(conversion.postDataJSON()).toEqual({
        managerId: 1,
        name: 'Jan',
        surname: 'Nowak',
    })

    expect(
        state.requests.some(
            (request) =>
                request.url().includes('/mail/') && request.method() === 'POST',
        ),
    ).toBe(false)
})

test('existing client conversion displays only clients with the assigned manager', async ({
    page,
}) => {
    const state = await mock(page, false)

    await page.goto('/main/leads')

    await page
        .getByRole('button', { name: 'Otwórz zgłoszenie Olena Bondar' })
        .click()

    await expect(
        page.getByRole('combobox', { name: 'Przydzielenie' }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Przenieś do klientów' }).click()

    const dialog = page.getByRole('dialog')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Klient', exact: true }),
        'existing',
    )

    await dialog.getByRole('combobox', { name: 'Istniejący klient' }).click()

    await expect(page.getByRole('option', { name: 'Cudzy Nowak' })).toHaveCount(
        0,
    )

    await page.getByRole('option', { name: 'Własny Nowak' }).click()

    await dialog
        .getByRole('button', { name: 'Połącz z klientem', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/clients\/8$/)

    const conversion = state.requests.find(
        (request) => new URL(request.url()).pathname === '/leads/2/convert',
    )!

    expect(conversion.postDataJSON()).toEqual({ clientId: 8 })
})
