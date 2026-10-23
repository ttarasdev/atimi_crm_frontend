import { selectOption } from './helpers/select-option'
import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'

const stamps = {
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-02T09:00:00Z',
}

const roles: Manager['roles'] = [
    { id: 1, name: 'admin' },
    { id: 2, name: 'manager' },
    { id: 3, name: 'sender' },
]

function worker(
    id: number,
    name: string,
    status: Manager['status'] = 'active',
    roleIds = [2],
): Manager {
    return {
        id,
        name,
        surname: 'Kowalska',
        email: `${name.toLowerCase()}@example.test`,
        phone: '+48123456789',
        position: 'Doradca nieruchomości',
        avatarId: null,
        status,
        remindersEnabled: false,
        lastLoginAt: null,
        roles: roles.filter((role) => roleIds.includes(role.id)),
        ...stamps,
    }
}

async function mock(page: Page, admin = true) {
    const state = {
        rows: [
            worker(1, 'Anna', 'active', admin ? [1] : [2]),
            worker(2, 'Marta'),
            worker(3, 'Piotr', 'blocked'),
            worker(4, 'Ola', 'pending'),
            worker(5, 'Karol', 'archived'),
        ],
        requests: [] as Request[],
        statusGate: undefined as Promise<void> | undefined,
        failUpdate: false,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'managers-test'),
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

        const list = <T>(rows: T[]) => {
            const pageNo = Number(url.searchParams.get('page') ?? 1)

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const offset = (pageNo - 1) * limit

            return {
                rows: rows.slice(offset, offset + limit),
                total: rows.length,
                page: pageNo,
                limit,
                offset,
            }
        }

        if (path === '/managers/me') return send(state.rows[0])

        if (path === '/roles') return send(list(roles))

        if (path === '/managers') {
            const query = url.searchParams

            return send(
                list(
                    state.rows.filter(
                        (row) =>
                            (!query.get('search') ||
                                `${row.name} ${row.surname} ${row.email}`
                                    .toLowerCase()
                                    .includes(
                                        query.get('search')!.toLowerCase(),
                                    )) &&
                            (!query.get('status') ||
                                row.status === query.get('status')) &&
                            (!query.get('roleId') ||
                                row.roles.some(
                                    (role) =>
                                        role.id === Number(query.get('roleId')),
                                )),
                    ),
                ),
            )
        }

        if (path === '/manager-auth/managers') {
            const dto = request.postDataJSON()

            const saved = {
                ...worker(10, dto.name, 'pending'),
                surname: dto.surname,
                email: dto.email,
            }

            state.rows.unshift(saved)

            return send(
                { id: saved.id, email: saved.email, status: saved.status },
                201,
            )
        }

        if (path === '/manager-auth/resend-confirmation')
            return send({ success: true })

        const match = /^\/managers\/(\d+)(?:\/(status|roles))?$/.exec(path)

        if (match) {
            const saved = state.rows.find((row) => row.id === Number(match[1]))

            if (!saved) return send({ message: 'Not found' }, 404)

            if (method === 'PATCH') {
                if (state.failUpdate) return send({ message: 'Failed' }, 500)

                if (match[2] === 'status' && state.statusGate)
                    await state.statusGate

                if (match[2] === 'roles')
                    saved.roles = roles.filter((role) =>
                        request.postDataJSON().roleIds.includes(role.id),
                    )
                else Object.assign(saved, request.postDataJSON())
            }

            return send(saved)
        }

        const calendar = /^\/calendars\/manager\/(\d+)$/.exec(path)

        if (calendar)
            return send({
                id: 20,
                managerId: Number(calendar[1]),
                timeZone: 'Europe/Warsaw',
                ...stamps,
            })

        if (path === '/calendars/20/entries') return send(list([]))

        return send(list([]))
    })

    return state
}

test('workers list filters statuses and roles, shows avatars and fits each viewport', async ({
    page,
}, testInfo) => {
    await mock(page)

    await page.goto('/main/managers')

    await expect(
        page.getByRole('button', { name: 'Otwórz pracownika Marta Kowalska' }),
    ).toBeVisible()

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((element) => element.clientWidth),
    )

    mkdirSync('/tmp/ivan-workers-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-workers-shots/workers-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await selectOption(page.getByLabel('Status konta'), 'blocked')

    await expect(
        page.getByRole('button', { name: 'Otwórz pracownika Piotr Kowalska' }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Otwórz pracownika Marta Kowalska' }),
    ).toHaveCount(0)

    await selectOption(page.getByLabel('Status konta'), '')

    await selectOption(page.getByLabel('Rola', { exact: true }), '1')

    await expect(
        page.getByRole('button', { name: 'Otwórz pracownika Anna Kowalska' }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Otwórz pracownika Marta Kowalska' }),
    ).toHaveCount(0)
})

test('admin edits worker data, clears nullable fields and keeps inputs after failure', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/managers')

    await page
        .getByRole('button', { name: 'Otwórz pracownika Marta Kowalska' })
        .click()

    await page.getByRole('button', { name: 'Edytuj dane' }).click()

    await page.getByLabel('Imię', { exact: true }).fill('  Maria  ')

    await page.getByLabel('Telefon').fill('')

    state.failUpdate = true

    await page.getByRole('button', { name: 'Zapisz dane' }).click()

    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
        'Nie udało się zapisać',
    )

    await expect(page.getByLabel('Imię', { exact: true })).toHaveValue(
        '  Maria  ',
    )

    state.failUpdate = false

    await page.getByRole('button', { name: 'Zapisz dane' }).click()

    await expect(page.getByRole('dialog')).toContainText('Maria Kowalska')

    expect(
        state.requests
            .findLast((request) => request.method() === 'PATCH')
            ?.postDataJSON(),
    ).toEqual({ name: 'Maria', phone: null })
})

test('roles and status changes require an explicit save, and pending saves block closing', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/managers')

    await page
        .getByRole('button', { name: 'Otwórz pracownika Marta Kowalska' })
        .click()

    await page.getByRole('button', { name: 'Zmień role' }).click()

    await page.getByRole('checkbox', { name: /Administrator/ }).check()

    expect(state.rows.find((row) => row.id === 2)?.roles).toHaveLength(1)

    await page.getByRole('button', { name: 'Zapisz role' }).click()

    await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Zmień role' }),
    ).toBeVisible()

    expect(state.rows.find((row) => row.id === 2)?.roles).toHaveLength(2)

    await page.getByRole('button', { name: 'Zablokuj konto' }).click()

    expect(state.rows.find((row) => row.id === 2)?.status).toBe('active')

    let release: () => void = () => {}

    state.statusGate = new Promise<void>((resolve) => {
        release = resolve
    })

    await page.getByRole('button', { name: 'Zablokuj konto' }).click()

    await expect(
        page.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog')).toBeVisible()

    release()

    await expect(page.getByRole('dialog')).toContainText('Zablokowany')
})

test('self protections and pending activation are enforced in the UI', async ({
    page,
}) => {
    await mock(page)

    await page.goto('/main/managers')

    await page
        .getByRole('button', { name: 'Otwórz pracownika Anna Kowalska' })
        .click()

    await expect(
        page.getByRole('button', { name: 'Zmień role' }),
    ).toBeDisabled()

    await expect(
        page.getByRole('button', { name: 'Zablokuj konto' }),
    ).toBeDisabled()

    await page.getByRole('button', { name: 'Zamknij okno' }).click()

    await page
        .getByRole('button', { name: 'Otwórz pracownika Ola Kowalska' })
        .click()

    await expect(
        page.getByRole('button', { name: 'Przywróć dostęp' }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Wyślij potwierdzenie' }).click()

    await expect(page.getByRole('dialog').getByRole('status')).toContainText(
        'Prośba o potwierdzenie',
    )
})

test('admin creates a pending employee without a secret creation key', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/managers')

    await page.getByRole('button', { name: 'Dodaj pracownika' }).click()

    await page.getByLabel('Imię', { exact: true }).fill('  Ewa  ')

    await page.getByLabel('Nazwisko', { exact: true }).fill('Nowak')

    await page.getByLabel('Email', { exact: true }).fill('EWA@example.test')

    await page
        .getByLabel('Hasło początkowe', { exact: true })
        .fill('Initial-password-2026!')

    await page
        .getByLabel('Powtórz hasło', { exact: true })
        .fill('Initial-password-2026!')

    await page.getByRole('button', { name: 'Utwórz konto' }).click()

    await expect(page.getByRole('dialog')).toContainText('Ewa Nowak')

    await expect(page.getByRole('dialog')).toContainText(
        'Oczekuje na potwierdzenie',
    )

    const request = state.requests.find(
        (request) =>
            new URL(request.url()).pathname === '/manager-auth/managers',
    )

    expect(request?.headers()).not.toHaveProperty('x-manager-creation-key')

    expect(request?.postDataJSON()).toEqual({
        name: 'Ewa',
        surname: 'Nowak',
        email: 'ewa@example.test',
        password: 'Initial-password-2026!',
        roleNames: ['manager', 'sender'],
    })
})

test('employee calendar keeps worker context for all tabs and uses the worker API', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/managers')

    await page
        .getByRole('button', { name: 'Otwórz pracownika Marta Kowalska' })
        .click()

    await page.getByRole('link', { name: /Kalendarz pracownika/ }).click()

    await expect(
        page.getByRole('region', { name: 'Kalendarz pracownika' }),
    ).toContainText('Marta Kowalska')

    await expect(
        page
            .getByRole('navigation', { name: 'Widoki kalendarza' })
            .getByRole('link', { name: 'Przypomnienia' }),
    ).toHaveAttribute('href', /\/main\/managers\/2\/calendar\/reminders/)

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname === '/calendars/manager/2',
        ),
    ).toBe(true)

    expect(
        state.requests.some(
            (request) => new URL(request.url()).pathname === '/calendars/me',
        ),
    ).toBe(false)
})

test('manager role cannot mount employee data or trigger protected requests', async ({
    page,
}) => {
    const state = await mock(page, false)

    await page.goto('/main/managers')

    await expect(page.getByText('Brak uprawnień')).toBeVisible()

    expect(
        state.requests.some(
            (request) => new URL(request.url()).pathname === '/managers',
        ),
    ).toBe(false)

    await expect(
        page.getByRole('button', { name: 'Dodaj pracownika' }),
    ).toHaveCount(0)
})
