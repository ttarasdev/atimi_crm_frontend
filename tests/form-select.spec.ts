import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { selectOption } from './helpers/select-option'

async function fixture(page: Page) {
    const requests: URL[] = []

    const mutations: string[] = []

    let gate: Promise<void> | undefined

    const dates = {
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
    }

    const manager = {
        id: 1,
        name: 'Anna',
        surname: 'Kowalska',
        email: 'anna@example.test',
        phone: null,
        position: null,
        avatarId: null,
        remindersEnabled: false,
        status: 'active',
        lastLoginAt: null,
        roles: [
            { id: 1, name: 'admin' },
            { id: 2, name: 'manager' },
        ],
        ...dates,
    }

    const sources = Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        name: `Oddział ${String(index + 1).padStart(2, '0')}`,
        isActive: true,
    }))

    const rows = [
        { id: 1, name: 'Ewa', surname: 'Nowak', status: 'active', sourceId: 1 },
        { id: 2, name: 'Piotr', surname: 'Nowak', status: 'new', sourceId: 19 },
    ].map((row) => ({
        ...row,
        managerId: 1,
        address: null,
        language: 'pl',
        preferredContactTime: null,
        priority: 'normal',
        archivedAt: null,
        manager,
        ...dates,
    }))

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'custom-select-test'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        if (request.method() === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods':
                        'GET, POST, PATCH, DELETE, OPTIONS',
                    'access-control-allow-headers':
                        'Authorization, Content-Type',
                },
            })

        requests.push(url)

        if (request.method() !== 'GET') mutations.push(url.pathname)

        const json = (data: unknown) =>
            route.fulfill({
                json: data,
                headers: { 'access-control-allow-origin': '*' },
            })

        const list = (items: unknown[]) => ({
            rows: items,
            total: items.length,
            page: 1,
            limit: 100,
            offset: 0,
        })

        if (url.pathname === '/managers/me') return json(manager)

        if (url.pathname === '/managers') return json(list([manager]))

        if (url.pathname === '/client-sources') return json(list(sources))

        if (request.method() === 'POST') {
            if (gate) await gate

            return json({ ...rows[0], ...request.postDataJSON(), id: 3 })
        }

        if (url.pathname === '/clients')
            return json(
                list(
                    rows.filter(
                        (row) =>
                            (!url.searchParams.get('status') ||
                                row.status ===
                                    url.searchParams.get('status')) &&
                            (!url.searchParams.get('sourceId') ||
                                row.sourceId ===
                                    Number(url.searchParams.get('sourceId'))),
                    ),
                ),
            )

        return json(list([]))
    })

    await page.goto('/main/clients')

    await expect(
        page.getByRole('heading', { name: 'Klienci', exact: true }),
    ).toBeVisible()

    await expect(page.getByLabel('Status', { exact: true })).toBeVisible()

    return {
        requests,
        mutations,
        pauseMutation: () => {
            let release = () => {}

            gate = new Promise<void>((resolve) => {
                release = resolve
            })

            return release
        },
    }
}

test('custom selects navigate with arrows Home End Enter and keep focus without native controls', async ({
    page,
}) => {
    const mock = await fixture(page)

    const control = page.getByRole('combobox', { name: 'Status', exact: true })

    await control.focus()

    await control.press('End')

    await expect(
        page.getByRole('option', { name: 'Utracony', exact: true }),
    ).toBeVisible()

    await control.press('Enter')

    await expect(control).toHaveText('Utracony')

    await expect(control).toBeFocused()

    await control.press('Home')

    await control.press('Enter')

    await expect(control).toHaveText('Status: Wszystkie')

    await control.press('ArrowDown')

    await control.press('ArrowDown')

    await control.press('Enter')

    await expect(control).toHaveText('Nowy')

    await expect
        .poll(() =>
            mock.requests.some(
                (url) =>
                    url.pathname === '/clients' &&
                    url.searchParams.get('status') === 'new',
            ),
        )
        .toBe(true)

    await control.click()

    await control.press('Escape')

    await expect(control).toHaveAttribute('aria-expanded', 'false')

    await expect(control).toBeFocused()

    await expect(control).toHaveText('Nowy')

    await control.click()

    await control.press('Tab')

    const payment = page.getByLabel('Płatność', { exact: true })

    await expect(payment).toBeFocused()

    await payment.press('Tab')

    await expect(page.getByLabel('Priorytet', { exact: true })).toBeFocused()

    expect(await page.locator('select').count()).toBe(0)

    expect(mock.mutations).toHaveLength(0)
})

test('long selects search real options and stay within the mobile viewport without width jumps', async ({
    page,
}, info) => {
    const mock = await fixture(page)

    const control = page.getByLabel('Źródło', { exact: true })

    const beforeWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
    )

    await control.click()

    const search = page.getByRole('searchbox', {
        name: 'Szukaj: Źródło',
        exact: true,
    })

    await search.fill('nieistniejąca')

    await expect(
        page.getByText('Brak pasujących opcji.', { exact: true }),
    ).toBeVisible()

    await search.fill('Oddział 19')

    await expect(page.getByRole('option')).toHaveCount(1)

    const box = await page.getByRole('listbox').boundingBox()

    const viewport = page.viewportSize()

    expect(box).not.toBeNull()

    expect(box?.x).toBeGreaterThanOrEqual(0)

    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
        viewport?.width ?? 0,
    )

    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
        viewport?.height ?? 0,
    )

    expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(beforeWidth)

    mkdirSync('/tmp/ivan-select-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-select-qa/search-${info.project.name}.png`,
        fullPage: true,
    })

    await search.press('Enter')

    await expect(control).toHaveText('Oddział 19')

    await expect(control).toBeFocused()

    await expect
        .poll(() =>
            mock.requests.some(
                (url) =>
                    url.pathname === '/clients' &&
                    url.searchParams.get('sourceId') === '19',
            ),
        )
        .toBe(true)

    expect(mock.mutations).toHaveLength(0)
})

test('dialog selects use its top layer and first Escape only dismisses their list', async ({
    page,
}, info) => {
    const mock = await fixture(page)

    await page
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    const control = dialog.getByLabel('Priorytet', { exact: true })

    await control.click()

    await expect(
        dialog.getByRole('option', { name: 'VIP', exact: true }),
    ).toBeVisible()

    await control.press('Escape')

    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole('listbox')).toHaveCount(0)

    await selectOption(control, 'vip')

    await expect(control).toHaveText('VIP')

    await control.click()

    mkdirSync('/tmp/ivan-select-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-select-qa/dialog-${info.project.name}.png`,
        fullPage: true,
    })

    await dialog
        .getByRole('heading', { name: 'Nowy klient', exact: true })
        .click()

    await expect(control).toHaveAttribute('aria-expanded', 'false')

    await expect(dialog).toBeVisible()

    await expect(dialog.getByLabel('Opiekun klienta')).toHaveAttribute(
        'aria-required',
        'true',
    )

    await control.focus()

    await control.press('Escape')

    await expect(dialog).toBeHidden()

    expect(mock.mutations).toHaveLength(0)
})

test('selects follow a pending fieldset and resume after its request', async ({
    page,
}) => {
    const mock = await fixture(page)

    const release = mock.pauseMutation()

    await page
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    await dialog.getByLabel('Imię / nazwa').fill('Testowa Ewa')

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect.poll(() => mock.mutations.length).toBe(1)

    await expect(
        dialog.getByRole('combobox', { name: 'Priorytet', exact: true }),
    ).toBeDisabled()

    await expect(
        dialog.getByRole('combobox', { name: 'Status klienta', exact: true }),
    ).toBeDisabled()

    await expect(dialog.getByRole('listbox')).toHaveCount(0)

    release()

    await expect(dialog).toBeHidden()
})
