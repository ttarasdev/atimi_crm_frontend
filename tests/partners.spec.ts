import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { Partner } from '../src/api/partners/partners.types'
import { selectOption } from './helpers/select-option'

const stamps = {
    createdAt: '2026-10-07T09:00:00Z',
    updatedAt: '2026-10-07T09:00:00Z',
}

function partner(
    id: number,
    name: string,
    overrides: Partial<Partner> = {},
): Partner {
    return {
        id,
        name,
        category: 'notary',
        contactPerson: 'Anna Demo',
        phone: '+48 000 000 001',
        additionalPhone: '+48 000 000 002',
        email: 'contact@partners.example.test',
        website: 'https://partners.example.test',
        city: 'Wrocław',
        address: 'Adres demonstracyjny',
        notes: 'Umowy, pełnomocnictwa i szybki kontakt.\nWyłącznie dane demonstracyjne.',
        isFeatured: false,
        isActive: true,
        ...stamps,
        ...overrides,
    }
}

async function fixture(page: Page, admin = true, longList = false) {
    const state = {
        rows: [
            partner(1, 'Kancelaria Demo', { isFeatured: true }),
            partner(2, 'Foto Demo', {
                category: 'employment',
                contactPerson: 'Piotr Demo',
                city: 'Poznań',
            }),
            partner(3, 'Kredyty Demo', {
                category: 'translation',
                city: 'Kraków',
                isActive: false,
            }),
            ...(longList
                ? Array.from({ length: 35 }, (_, index) =>
                      partner(
                          index + 10,
                          `Partner Demo ${String(index).padStart(2, '0')}`,
                          { category: 'other' },
                      ),
                  )
                : []),
        ],
        requests: [] as Request[],
        unknown: [] as string[],
        failSave: false,
        failList: false,
        saveGate: undefined as Promise<void> | undefined,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'partners-test'),
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

        if (
            path === '/document-upload-notifications' ||
            path === '/note-mention-notifications'
        )
            return send({
                rows: [],
                total: 0,
                unreadCount: 0,
                page: 1,
                limit: 20,
                offset: 0,
            })

        if (path === '/managers/me')
            return send({
                id: 1,
                name: 'Anna',
                surname: 'Kowalska',
                email: 'anna@example.test',
                phone: null,
                position: 'Doradca nieruchomości',
                avatarId: null,
                status: 'active',
                remindersEnabled: false,
                lastLoginAt: null,
                roles: [
                    { id: admin ? 1 : 2, name: admin ? 'admin' : 'manager' },
                ],
                ...stamps,
            })

        if (path === '/partners' && method === 'GET') {
            if (state.failList) return send({ message: 'Unavailable' }, 503)

            const search = url.searchParams.get('search')?.toLowerCase()

            const category = url.searchParams.get('category')

            const featured = url.searchParams.get('isFeatured')

            const active = url.searchParams.get('isActive') !== 'false'

            const rows = state.rows
                .filter(
                    (row) =>
                        row.isActive === active &&
                        (!category || row.category === category) &&
                        (!featured ||
                            row.isFeatured === (featured === 'true')) &&
                        (!search ||
                            [
                                row.name,
                                row.contactPerson,
                                row.phone,
                                row.email,
                                row.city,
                            ].some((value) =>
                                value?.toLowerCase().includes(search),
                            )),
                )
                .sort(
                    (a, b) =>
                        Number(b.isFeatured) - Number(a.isFeatured) ||
                        a.name.localeCompare(b.name) ||
                        a.id - b.id,
                )

            const pageNo = Number(url.searchParams.get('page') ?? 1)

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const offset = Number(
                url.searchParams.get('offset') ?? (pageNo - 1) * limit,
            )

            return send({
                rows: rows.slice(offset, offset + limit),
                total: rows.length,
                page: pageNo,
                limit,
                offset,
            })
        }

        if (path === '/partners' && method === 'POST') {
            if (state.saveGate) await state.saveGate

            if (state.failSave) return send({ message: 'Failed' }, 400)

            const dto = request.postDataJSON()

            const saved = partner(100, dto.name, dto)

            state.rows.push(saved)

            return send(saved, 201)
        }

        const match = /^\/partners\/(\d+)$/.exec(path)

        if (match) {
            const row = state.rows.find((item) => item.id === Number(match[1]))

            if (!row) return send({ message: 'Not found' }, 404)

            if (method === 'PATCH') {
                if (state.saveGate) await state.saveGate

                if (state.failSave) return send({ message: 'Failed' }, 400)

                Object.assign(row, request.postDataJSON())
            }

            return send(row)
        }

        state.unknown.push(`${method} ${path}`)

        return send({ message: 'Unexpected request' }, 404)
    })

    return state
}

test('directory fits desktop and mobile, features contacts first and filters real fields', async ({
    page,
}, testInfo) => {
    const state = await fixture(page)

    await page.goto('/main/partners')

    await expect(page.getByRole('article').first()).toHaveAccessibleName(
        'Partner: Kancelaria Demo',
    )

    await expect(page.getByRole('article')).toHaveCount(2)

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((element) => element.clientWidth),
    )

    mkdirSync('/tmp/ivan-partners-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-partners-qa/partners-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await selectOption(page.getByLabel('Specjalizacja'), 'employment')

    await expect(page.getByRole('article')).toHaveCount(1)

    await expect(page.getByRole('article')).toHaveAccessibleName(
        'Partner: Foto Demo',
    )

    await selectOption(page.getByLabel('Specjalizacja'), '')

    await page.getByLabel('Szukaj partnera').fill('Anna')

    await expect(page.getByRole('article')).toHaveCount(1)

    await page.getByLabel('Szukaj partnera').fill('')

    await selectOption(page.getByLabel('Polecenia'), 'featured')

    await expect(page.getByRole('article')).toHaveCount(1)

    expect(state.unknown).toEqual([])
})

test('manager can view full contacts and has no editing or archived controls', async ({
    page,
}) => {
    const state = await fixture(page, false)

    await page.goto('/main/partners')

    await expect(
        page.getByRole('button', { name: 'Dodaj partnera' }),
    ).toHaveCount(0)

    await expect(page.getByLabel('Lista kontaktów')).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: /Opcje partnera/ }),
    ).toHaveCount(0)

    await page
        .getByRole('button', { name: 'Kancelaria Demo', exact: true })
        .click()

    const popup = page.getByRole('dialog', { name: 'Kontakt partnera' })

    await expect(
        popup.getByText('Adres demonstracyjny', { exact: false }),
    ).toBeVisible()

    await expect(popup.getByRole('link', { name: /Zadzwoń/ })).toHaveAttribute(
        'href',
        'tel:+48000000001',
    )

    await expect(
        popup.getByRole('link', { name: /Drugi telefon/ }),
    ).toHaveAttribute('href', 'tel:+48000000002')

    await expect(
        popup.getByRole('link', { name: /Napisz e-mail/ }),
    ).toHaveAttribute('href', 'mailto:contact%40partners.example.test')

    await expect(
        popup.getByRole('link', { name: /Strona internetowa/ }),
    ).toHaveAttribute('rel', 'noopener noreferrer')

    await expect(
        popup.getByRole('button', { name: 'Edytuj dane partnera' }),
    ).toHaveCount(0)

    expect(
        state.requests.filter((request) => request.method() !== 'GET'),
    ).toEqual([])
})

test('admin creates a partner through reusable fields, preserves input on failure and clears empty fields', async ({
    page,
}, testInfo) => {
    const state = await fixture(page)

    await page.goto('/main/partners')

    await page.getByRole('button', { name: 'Dodaj partnera' }).click()

    const form = page.getByRole('form', { name: 'Dane partnera' })

    await form.getByLabel('Nazwa partnera').fill('  Energetyka Demo  ')

    await selectOption(form.getByLabel('Specjalizacja'), 'accounting')

    await form.getByLabel('Osoba kontaktowa').fill('Ewa Demo')

    await form.getByLabel('Telefon', { exact: true }).fill('+48 000 000 005')

    await form
        .getByLabel('E-mail', { exact: true })
        .fill('energia@partners.example.test')

    await form.getByLabel('Miasto').fill('Wrocław')

    await form
        .getByLabel('Informacje dla zespołu')
        .fill('Świadectwa energetyczne. Dane demonstracyjne.')

    await form.getByRole('switch', { name: 'Polecany partner' }).click()

    await page.screenshot({
        path: `/tmp/ivan-partners-qa/partner-form-${testInfo.project.name}.png`,
        fullPage: true,
    })

    state.failSave = true

    await form.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(form.getByRole('alert')).toContainText(
        'Wpisane dane zostały zachowane',
    )

    await expect(form.getByLabel('Nazwa partnera')).toHaveValue(
        '  Energetyka Demo  ',
    )

    expect(state.rows.some((row) => row.name === 'Energetyka Demo')).toBe(false)

    state.failSave = false

    await form.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(
        page.getByRole('article', { name: 'Partner: Energetyka Demo' }),
    ).toBeVisible()

    const dto = state.requests
        .filter((request) => request.method() === 'POST')
        .at(-1)
        ?.postDataJSON()

    expect(dto).toMatchObject({
        name: 'Energetyka Demo',
        category: 'accounting',
        additionalPhone: null,
        website: null,
        address: null,
        isFeatured: true,
    })

    await page
        .getByRole('button', { name: 'Energetyka Demo', exact: true })
        .click()

    await page.getByRole('button', { name: 'Edytuj dane partnera' }).click()

    await page.getByLabel('Telefon', { exact: true }).fill('')

    await page.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)

    expect(state.rows.find((row) => row.id === 100)?.phone).toBeNull()

    expect(state.unknown).toEqual([])
})

test('archival is confirmed, can be restored and pending saves block popup dismissal', async ({
    page,
}) => {
    const state = await fixture(page)

    await page.goto('/main/partners')

    await page
        .getByRole('button', { name: 'Opcje partnera Kancelaria Demo' })
        .click()

    await page.getByRole('button', { name: 'Archiwizuj', exact: true }).click()

    expect(state.rows.find((row) => row.id === 1)?.isActive).toBe(true)

    let release: () => void = () => {}

    state.saveGate = new Promise<void>((resolve) => {
        release = resolve
    })

    await page.getByRole('button', { name: 'Archiwizuj', exact: true }).click()

    await expect(
        page.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog')).toBeVisible()

    release()

    state.saveGate = undefined

    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(
        page.getByRole('article', { name: 'Partner: Kancelaria Demo' }),
    ).toHaveCount(0)

    await selectOption(page.getByLabel('Lista kontaktów'), 'archived')

    await expect(page.getByRole('article')).toHaveCount(2)

    await page
        .getByRole('button', { name: 'Opcje partnera Kancelaria Demo' })
        .click()

    await page.getByRole('button', { name: 'Przywróć', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Przywróć', exact: true })
        .click()

    await expect(page.getByRole('dialog')).toHaveCount(0)

    await expect(page.getByRole('article')).toHaveCount(1)

    await selectOption(page.getByLabel('Lista kontaktów'), 'active')

    await expect(
        page.getByRole('article', { name: 'Partner: Kancelaria Demo' }),
    ).toBeVisible()
})

test('feature changes invalidate ordering, pagination loads next page without duplicates', async ({
    page,
}) => {
    const state = await fixture(page, true, true)

    await page.goto('/main/partners')

    await expect(page.getByRole('article')).toHaveCount(30)

    await page.getByRole('button', { name: 'Wczytaj więcej' }).click()

    await expect(page.getByRole('article')).toHaveCount(37)

    await expect(
        page.getByRole('button', { name: 'Wczytaj więcej' }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Opcje partnera Foto Demo' }).click()

    await page
        .getByRole('button', { name: 'Poleć partnera', exact: true })
        .click()

    await expect(page.getByRole('article').first()).toHaveAccessibleName(
        'Partner: Foto Demo',
    )

    expect(state.rows.find((row) => row.id === 2)?.isFeatured).toBe(true)

    expect(
        state.requests.filter(
            (request) =>
                request.url().includes('/partners?') &&
                new URL(request.url()).searchParams.get('page') === '2',
        ).length,
    ).toBeGreaterThan(0)
})

test('malformed links are suppressed and request errors can be retried', async ({
    page,
}) => {
    const state = await fixture(page, false)

    state.rows[0] = partner(1, 'Kontakt bezpieczny', {
        website: 'javascript:alert(1)',
        email: 'bad\n@example.test',
        phone: 'javascript:alert(1)',
        additionalPhone: null,
    })

    state.failList = true

    await page.goto('/main/partners')

    await expect(
        page.getByRole('region', { name: 'Partnerzy' }).getByRole('alert'),
    ).toContainText('Nie udało się wczytać partnerów')

    state.failList = false

    await page.getByRole('button', { name: 'Spróbuj ponownie' }).click()

    await expect(
        page.getByRole('article', { name: 'Partner: Kontakt bezpieczny' }),
    ).toBeVisible()

    const card = page.getByRole('article', {
        name: 'Partner: Kontakt bezpieczny',
    })

    await expect(card.getByRole('link')).toHaveCount(0)

    await page
        .getByRole('button', { name: 'Kontakt bezpieczny', exact: true })
        .click()

    await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(0)

    await expect(
        page.getByRole('dialog').getByText('Brak danych kontaktowych.'),
    ).toBeVisible()
})
