import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { DocumentRequest } from '../src/api/document-requests/document-requests.types'
import { selectOption } from './helpers/select-option'

const token = 'a'.repeat(43)

const timestamps = {
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
}

const expiry = '2026-11-06T08:00:00Z'

const placeholder: DocumentRequest = {
    id: 12,
    clientId: 7,
    title: 'Skan paszportu',
    instructions: 'Wszystkie strony.\nWyraźne zdjęcia.',
    status: 'pending',
    expiresAt: expiry,
    ...timestamps,
}

async function mockRequests(
    page: Page,
    options: {
        foreign?: boolean
        archived?: boolean
        denied?: boolean
        initial?: DocumentRequest[]
    } = {},
) {
    const state: {
        rows: DocumentRequest[]
        requests: Request[]
        fail: boolean
        gate?: Promise<void>
    } = { rows: options.initial ?? [], requests: [], fail: false }

    const rows = (items: unknown[]) => ({
        rows: items,
        total: items.length,
        page: 1,
        limit: 20,
        offset: 0,
    })

    await page.addInitScript(() => {
        localStorage.setItem(
            'atimi:access_token',
            'document-request-test-session',
        )

        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: async (text: string) =>
                    localStorage.setItem('test:copied-link', text),
            },
        })
    })

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

        if (path === '/managers/me')
            return send({
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
                roles: [{ id: 2, name: 'manager' }],
                ...timestamps,
            })

        if (path === '/clients/7')
            return options.denied
                ? send({ message: 'Client not found' }, 404)
                : send({
                      id: 7,
                      name: 'Jan',
                      surname: 'Nowak',
                      managerId: options.foreign ? 2 : 1,
                      isPrivate: !options.foreign,
                      sourceId: null,
                      status: 'active',
                      priority: 'normal',
                      paymentStatus: 'unpaid',
                      paymentAmount: null,
                      paymentCurrency: 'PLN',
                      paymentComment: null,
                      archivedAt: options.archived
                          ? timestamps.createdAt
                          : null,
                      manager: { id: 1, name: 'Anna', surname: 'Kowalska' },
                      ...timestamps,
                  })

        if (path === '/document-upload-notifications')
            return send({ ...rows([]), unreadCount: 0 })

        if (path.startsWith('/calendars/'))
            return send({
                id: 11,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        if (path === '/clients/7/document-requests') {
            if (method === 'GET') return send(rows(state.rows))

            if (state.gate) await state.gate

            if (state.fail) {
                state.fail = false

                return send({ message: 'Unavailable' }, 503)
            }

            const dto = request.postDataJSON()

            const created = {
                ...placeholder,
                title: dto.title,
                instructions: dto.instructions,
            }

            state.rows = [created]

            return send(
                {
                    ...created,
                    uploadUrl: `http://localhost:4200/upload-document#${token}`,
                },
                201,
            )
        }

        if (path === '/clients/7/document-requests/12/revoke') {
            state.rows[0].status = 'revoked'

            return send(state.rows[0])
        }

        if (path === '/clients/7/document-requests/12/link') {
            state.rows[0].status = 'pending'

            return send({
                ...state.rows[0],
                uploadUrl: `http://localhost:4200/upload-document#${'b'.repeat(43)}`,
            })
        }

        return send(rows([]))
    })

    return state
}

async function capture(page: Page, name: string) {
    mkdirSync('/tmp/atimi-document-upload-shots', { recursive: true })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-document-upload-shots/${name}.png`,
        fullPage: true,
    })
}

test('manager creates a placeholder without file, copies secure fragment link and revokes it', async ({
    page,
}, info) => {
    const state = await mockRequests(page)

    await page.goto('/main/clients/7?tab=documents')

    const panel = page.getByRole('region', {
        name: 'Dokumenty oczekiwane',
        exact: true,
    })

    await panel
        .getByRole('button', { name: 'Poproś o dokument', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Poproś o dokument',
        exact: true,
    })

    await expect(dialog.locator('input[type=file]')).toHaveCount(0)

    await expect(dialog.getByLabel('Instrukcje dla klienta')).toHaveAttribute(
        'maxlength',
        '2000',
    )

    await dialog
        .getByLabel('Nazwa oczekiwanego dokumentu')
        .fill('  Skan paszportu  ')

    const text = 'Wszystkie strony.\n<img src=x onerror=alert(1)>'

    await dialog.getByLabel('Instrukcje dla klienta').fill(`  ${text}  `)

    await selectOption(dialog.getByLabel('Ważność linku'), '14')

    await dialog
        .getByRole('button', { name: 'Utwórz prośbę', exact: true })
        .click()

    await expect(dialog).toBeHidden()

    await expect(panel).toContainText('Oczekuje na plik')

    await expect(panel).toContainText(text)

    await expect(panel.locator('img')).toHaveCount(0)

    const link = `http://localhost:4200/upload-document#${token}`

    await expect(
        panel.getByLabel('Link do dokumentu Skan paszportu'),
    ).toHaveValue(link)

    await panel
        .getByRole('button', { name: 'Kopiuj link', exact: true })
        .click()

    await expect(panel).toContainText('Skopiowano link: Skan paszportu.')

    expect(
        await page.evaluate(() => localStorage.getItem('test:copied-link')),
    ).toBe(link)

    const create = state.requests.find(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/clients/7/document-requests',
    )

    expect(create?.postDataJSON()).toEqual({
        title: 'Skan paszportu',
        instructions: text,
        expiresInDays: 14,
    })

    expect(
        state.requests.some(
            (request) =>
                request.method() === 'POST' &&
                /private-assets|\/documents$/.test(request.url()),
        ),
    ).toBe(false)

    await capture(page, `request-created-${info.project.name}`)

    await panel
        .getByRole('button', { name: 'Unieważnij link', exact: true })
        .click()

    const confirm = page.getByRole('dialog', {
        name: 'Unieważnij link',
        exact: true,
    })

    await confirm
        .getByRole('button', { name: 'Unieważnij link', exact: true })
        .click()

    await expect(confirm).toBeHidden()

    await expect(panel).toContainText('Link unieważniony')

    await expect(
        panel.getByLabel('Link do dokumentu Skan paszportu'),
    ).toHaveCount(0)

    await capture(page, `request-revoked-${info.project.name}`)
})

test('reloaded and expired placeholders renew a link; old secret is not fetched from server', async ({
    page,
}, info) => {
    const state = await mockRequests(page, {
        initial: [{ ...placeholder, status: 'expired' }],
    })

    await page.goto('/main/clients/7?tab=documents')

    const panel = page.getByRole('region', {
        name: 'Dokumenty oczekiwane',
        exact: true,
    })

    await expect(panel).toContainText('Link wygasł')

    await expect(
        panel.getByLabel('Link do dokumentu Skan paszportu'),
    ).toHaveCount(0)

    await panel
        .getByRole('button', { name: 'Utwórz nowy link', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Nowy link do dokumentu',
        exact: true,
    })

    await expect(dialog).toContainText('Poprzedni link przestanie działać.')

    await dialog
        .getByRole('button', { name: 'Utwórz nowy link', exact: true })
        .click()

    await expect(dialog).toBeHidden()

    await expect(
        panel.getByLabel('Link do dokumentu Skan paszportu'),
    ).toHaveValue(`http://localhost:4200/upload-document#${'b'.repeat(43)}`)

    expect(
        state.requests
            .find((request) =>
                new URL(request.url()).pathname.endsWith('/12/link'),
            )
            ?.postDataJSON(),
    ).toEqual({ expiresInDays: 7 })

    await page.reload()

    await expect(panel).toContainText('Oczekuje na plik')

    await expect(
        panel.getByLabel('Link do dokumentu Skan paszportu'),
    ).toHaveCount(0)

    await capture(page, `request-renew-${info.project.name}`)
})

test('failed create retains form values and pending save blocks dismissing the popup', async ({
    page,
}, info) => {
    const state = await mockRequests(page)

    await page.goto('/main/clients/7?tab=documents')

    await page
        .getByRole('button', { name: 'Poproś o dokument', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Poproś o dokument',
        exact: true,
    })

    await dialog
        .getByLabel('Nazwa oczekiwanego dokumentu')
        .fill('Potwierdzenie')

    await dialog.getByLabel('Instrukcje dla klienta').fill('Wyraźne zdjęcie.')

    state.fail = true

    await dialog
        .getByRole('button', { name: 'Utwórz prośbę', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(dialog.getByLabel('Nazwa oczekiwanego dokumentu')).toHaveValue(
        'Potwierdzenie',
    )

    await capture(page, `request-retry-${info.project.name}`)

    let release = () => {}

    state.gate = new Promise<void>((resolve) => {
        release = resolve
    })

    await dialog
        .getByRole('button', { name: 'Utwórz prośbę', exact: true })
        .click()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno', exact: true }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    release()

    await expect(dialog).toBeHidden()
})

test('shared foreign and archived client requests are read-only; denied private client reveals none', async ({
    page,
}) => {
    await mockRequests(page, { foreign: true, initial: [{ ...placeholder }] })

    await page.goto('/main/clients/7?tab=documents')

    const panel = page.getByRole('region', {
        name: 'Dokumenty oczekiwane',
        exact: true,
    })

    await expect(panel).toContainText('Skan paszportu')

    await expect(panel.getByRole('button')).toHaveCount(0)

    await page.unroute('**:4201/**')

    await mockRequests(page, { archived: true, initial: [{ ...placeholder }] })

    await page.reload()

    await expect(panel).toContainText('Skan paszportu')

    await expect(panel.getByRole('button')).toHaveCount(0)

    await page.unroute('**:4201/**')

    await mockRequests(page, { denied: true })

    await page.reload()

    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Nie można otworzyć tego klienta' }),
    ).toBeVisible()

    await expect(panel).toHaveCount(0)
})
