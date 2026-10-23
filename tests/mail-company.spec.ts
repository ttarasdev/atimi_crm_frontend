import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type { CompanySettings } from '../src/api/company-settings/company-settings.types'
import type { MailPreset, MailTemplate } from '../src/api/mail/mail.types'
import { selectOption } from './helpers/select-option'

const dates = {
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-06T08:00:00.000Z',
}

const templates: MailTemplate[] = [
    {
        id: 'pl',
        name: 'Polski',
        description: 'Wiadomość po polsku.',
        language: 'pl',
        previewSubject: 'Podsumowanie rozmowy',
        previewText: 'Dzień dobry, przesyłam informacje dotyczące sprawy.',
    },
    {
        id: 'en',
        name: 'English',
        description: 'An English message.',
        language: 'en',
        previewSubject: 'Conversation summary',
        previewText: 'Hello, here is the information about your case.',
    },
    {
        id: 'ua',
        name: 'Українська',
        description: 'Лист українською.',
        language: 'ua',
        previewSubject: 'Підсумок розмови',
        previewText: 'Добрий день! Надсилаю інформацію щодо Вашої справи.',
    },
]

const escape = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')

async function fixture(page: Page, admin = true, withEmail = true) {
    const manager = {
        id: 1,
        name: 'Anna',
        surname: 'Kowalska',
        email: 'anna@example.test',
        phone: '+48 123 456 789',
        position: 'Doradca nieruchomości',
        avatarId: null,
        status: 'active',
        remindersEnabled: false,
        lastLoginAt: null,
        roles: [{ id: admin ? 1 : 2, name: admin ? 'admin' : 'manager' }],
        ...dates,
    }

    const client = {
        id: 7,
        name: 'Ewa',
        surname: 'Nowak',
        managerId: 1,
        sourceId: null,
        language: 'pl',
        address: 'Wrocław',
        preferredContactTime: null,
        status: 'active',
        priority: 'normal',
        archivedAt: null,
        manager,
        ...dates,
    }

    const emailContacts = [
        {
            id: 71,
            clientId: 7,
            type: 'email',
            value: 'ewa@example.test',
            label: 'Osobisty',
            isPrimary: true,
            ...dates,
        },
        {
            id: 72,
            clientId: 7,
            type: 'email',
            value: 'ewa.office@example.test',
            label: 'Praca',
            isPrimary: false,
            ...dates,
        },
    ]

    const contacts = [
        ...(withEmail ? emailContacts : []),
        {
            id: 73,
            clientId: 7,
            type: 'phone',
            value: '+48 987 654 321',
            label: null,
            isPrimary: true,
            ...dates,
        },
    ]

    const state = {
        requests: [] as Request[],
        unknown: [] as string[],
        failPreset: false,
        failCompany: false,
        failUpload: false,
        failDelete: false,
        uploads: 0,
        company: {
            id: 1,
            name: 'Tsehenko Real Estate',
            legalName: null,
            taxId: null,
            address: 'Wrocław',
            phone: null,
            email: null,
            website: null,
            logoPublicAssetId: null,
            ...dates,
        } as CompanySettings,
        presets: [
            {
                id: 1,
                name: 'Powitanie klienta',
                subject: 'Dziękujemy za kontakt',
                text: 'Dzień dobry, chętnie pomożemy znaleźć nieruchomość.',
                managerId: null,
                ...dates,
            },
        ] as MailPreset[],
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'mail-company-test'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        const method = request.method()

        const json = (data: unknown, status = 200) =>
            route.fulfill({
                json: data,
                status,
                headers: { 'access-control-allow-origin': '*' },
            })

        const list = (rows: unknown[]) => ({
            rows,
            total: rows.length,
            page: 1,
            limit: 30,
            offset: 0,
        })

        if (method === 'OPTIONS')
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

        state.requests.push(request)

        if (path === '/managers/me') return json(manager)

        if (
            path === '/document-upload-notifications' ||
            path === '/note-mention-notifications'
        )
            return json({ ...list([]), unreadCount: 0 })

        if (path === '/clients/7/legalization')
            return json({
                emailMarketingConsent: false,
                emailAutomationConsent: false,
            })

        if (path.endsWith('/mail/history')) return json(list([]))

        if (path === '/company-settings') {
            if (method === 'PATCH' && state.failCompany)
                return json({ message: 'Unavailable' }, 503)

            if (method === 'PATCH')
                state.company = {
                    ...state.company,
                    ...request.postDataJSON(),
                    updatedAt: '2026-10-06T08:01:00.000Z',
                }

            return json(state.company)
        }

        if (path === '/public-assets' && method === 'POST') {
            state.uploads += 1

            if (state.failUpload) return json({ message: 'Unavailable' }, 503)

            return json(
                {
                    id: 75 + state.uploads,
                    bucket: 'system_files',
                    originalName:
                        request
                            .postData()
                            ?.match(
                                /name="originalName"\r\n\r\n([^\r\n]*)/,
                            )?.[1] ?? '',
                    relPath: 'uuid.png',
                    mimeType: 'image/png',
                    sizeBytes: 100,
                    isPopular: false,
                    createdByManagerId: 1,
                    ...dates,
                },
                201,
            )
        }

        if (/^\/public-assets\/\d+$/.test(path) && method === 'DELETE')
            return json(
                state.failDelete
                    ? { message: 'Asset referenced' }
                    : { success: true },
                state.failDelete ? 409 : 200,
            )

        if (/^\/public-assets\/\d+\/file$/.test(path))
            return route.fulfill({
                body: readFileSync('tests/fixtures/icons/house.png'),
                contentType: 'image/png',
                headers: { 'access-control-allow-origin': '*' },
            })

        if (path === '/mail-presets') {
            if (method === 'POST') {
                if (state.failPreset)
                    return json({ message: 'Temporarily unavailable' }, 503)

                const dto = request.postDataJSON()

                const preset: MailPreset = {
                    id: Math.max(0, ...state.presets.map((row) => row.id)) + 1,
                    name: dto.name,
                    subject: dto.subject,
                    text: dto.text,
                    managerId: dto.scope === 'shared' ? null : manager.id,
                    ...dates,
                }

                state.presets.push(preset)

                return json(preset, 201)
            }

            const scope = url.searchParams.get('scope')

            const search = url.searchParams.get('search')?.toLowerCase()

            return json(
                list(
                    state.presets.filter(
                        (row) =>
                            (scope !== 'shared' || row.managerId === null) &&
                            (scope !== 'personal' ||
                                row.managerId === manager.id) &&
                            (!search ||
                                `${row.name} ${row.subject} ${row.text}`
                                    .toLowerCase()
                                    .includes(search)),
                    ),
                ),
            )
        }

        if (/^\/mail-presets\/\d+$/.test(path)) {
            const id = Number(path.split('/').at(-1))

            if (method === 'DELETE') {
                state.presets = state.presets.filter((row) => row.id !== id)

                return json({ success: true })
            }

            const index = state.presets.findIndex((row) => row.id === id)

            if (index < 0) return json({ message: 'Not found' }, 404)

            if (method === 'PATCH')
                state.presets[index] = {
                    ...state.presets[index],
                    ...request.postDataJSON(),
                    updatedAt: '2026-10-06T08:01:00.000Z',
                }

            return json(state.presets[index])
        }

        if (/^\/(?:clients\/7\/)?mail\/accounts$/.test(path))
            return json([
                {
                    id: 'default',
                    name: 'Biuro',
                    email: 'biuro@example.test',
                },
                {
                    id: 'contact',
                    name: 'Kontakt',
                    email: 'kontakt@example.test',
                },
            ])

        if (/^\/(?:clients\/7\/)?mail\/templates$/.test(path))
            return json(templates)

        if (/^\/(?:clients\/7\/)?mail\/preview$/.test(path)) {
            const dto = request.postDataJSON()

            return json({
                html: `<html><body><header>${escape(state.company.name)}</header><h1>${escape(dto.subject)}</h1><p>${escape(dto.text)}</p><footer>${escape(state.company.address ?? '')} ${escape(state.company.email ?? '')}<br>${manager.name} ${manager.surname} · ${manager.position}</footer></body></html>`,
            })
        }

        if (/^\/(?:clients\/7\/)?mail\/send$/.test(path))
            return json({ success: true })

        if (path === '/clients/7') return json(client)

        if (path === '/clients/7/contacts') return json(list(contacts))

        if (path === '/calendars/manager/1')
            return json({ id: 1, managerId: 1, timeZone: 'Europe/Warsaw' })

        if (
            path === '/client-sources' ||
            /^\/clients\/7\/(?:processes|preferences|notes|documents)$/.test(
                path,
            ) ||
            path === '/private-assets' ||
            path === '/public-assets'
        )
            return json(list([]))

        state.unknown.push(`${method} ${path}`)

        return json({ message: 'Unmocked endpoint' }, 404)
    })

    return state
}

async function screenshot(page: Page, name: string, project: string) {
    mkdirSync('/tmp/ivan-mail-company-qa', { recursive: true })

    await page.evaluate(() => window.scrollTo(0, 0))

    await page.screenshot({
        path: `/tmp/ivan-mail-company-qa/${name}-${project}.png`,
        fullPage: !name.startsWith('client-mail'),
    })
}

const matching = (requests: Request[], path: string, method: string) =>
    requests.filter(
        (request) =>
            new URL(request.url()).pathname === path &&
            request.method() === method,
    )

test('company save updates the signature and new live mail preview', async ({
    page,
}, info) => {
    const state = await fixture(page)

    await page.goto('/main/company')

    const form = page.getByRole('form', { name: 'Edycja danych firmy' })

    await form.getByLabel('Nazwa firmy').fill('Tsehenko Wrocław')

    await form.getByLabel('Pełna nazwa prawna').fill('Tsehenko Sp. z o.o.')

    await form.getByLabel('NIP / numer podatkowy').fill('1234567890')

    await form.getByLabel('Adres', { exact: true }).fill('Rynek 12, Wrocław')

    await form.getByLabel('Telefon firmy').fill('+48 111 222 333')

    await form.getByLabel('E-mail kontaktowy').fill('wroclaw@example.test')

    await form.getByLabel('Strona internetowa').fill('https://example.test')

    await form.getByRole('button', { name: 'Zapisz dane firmy' }).click()

    await expect(form.getByRole('status')).toHaveText('Dane firmy zapisane.')

    const summary = page.getByRole('complementary', { name: 'Firmowy podpis' })

    await expect(summary).toContainText('Tsehenko Wrocław')

    await expect(summary).toContainText('wroclaw@example.test')

    expect(matching(state.requests, '/company-settings', 'PATCH')).toHaveLength(
        1,
    )

    expect(
        matching(
            state.requests,
            '/company-settings',
            'PATCH',
        )[0].postDataJSON(),
    ).toEqual({
        name: 'Tsehenko Wrocław',
        legalName: 'Tsehenko Sp. z o.o.',
        taxId: '1234567890',
        address: 'Rynek 12, Wrocław',
        phone: '+48 111 222 333',
        email: 'wroclaw@example.test',
        website: 'https://example.test',
        logoPublicAssetId: null,
    })

    await screenshot(page, 'company', info.project.name)

    await page.goto('/main/mail')

    await page.getByLabel('Temat', { exact: true }).fill('Nowa oferta')

    await page
        .getByLabel('Treść wiadomości')
        .fill('Przesyłam szczegóły oferty.')

    const preview = page.frameLocator('iframe[title="Podgląd e-maila"]')

    await expect(preview.locator('body')).toContainText('Tsehenko Wrocław')

    await expect(preview.locator('body')).toContainText('wroclaw@example.test')

    await expect(preview.locator('h1')).toHaveText('Nowa oferta')

    await page.getByLabel('Temat', { exact: true }).fill('Zmieniony temat')

    await expect(preview.locator('h1')).toHaveText('Zmieniony temat')

    expect(matching(state.requests, '/mail/send', 'POST')).toHaveLength(0)

    expect(state.unknown).toEqual([])
})

test('logo original name survives replacement and retry with safe failed-binding cleanup', async ({
    page,
}, info) => {
    const state = await fixture(page)

    await page.goto('/main/company')

    const form = page.getByRole('form', { name: 'Edycja danych firmy' })

    const input = form.getByLabel('Logo firmy', { exact: true })

    await input.setInputFiles('tests/fixtures/icons/house.png')

    const name = form.getByLabel('Nazwa pliku logo')

    await expect(name).toHaveValue('house.png')

    await input.setInputFiles({
        name: 'new-logo.png',
        mimeType: 'image/png',
        buffer: readFileSync('tests/fixtures/icons/house.png'),
    })

    await expect(name).toHaveValue('new-logo.png')

    await name.fill('  Logo Wrocław  ')

    await input.setInputFiles('tests/fixtures/icons/house.png')

    await expect(name).toHaveValue('  Logo Wrocław  ')

    await screenshot(page, 'logo-name', info.project.name)

    state.failUpload = true

    const save = form.getByRole('button', { name: 'Zapisz dane firmy' })

    await save.click()

    await expect(form.getByRole('alert')).toContainText(
        'Nie udało się zapisać danych firmy.',
    )

    await expect(name).toHaveValue('  Logo Wrocław  ')

    await expect(input).toHaveValue(/house\.png$/)

    state.failUpload = false

    state.failCompany = true

    await save.click()

    await expect(form.getByRole('alert')).toContainText(
        'Nie udało się zapisać danych firmy.',
    )

    expect(state.uploads).toBe(2)

    await name.fill('  Logo biura  ')

    state.failDelete = true

    await save.click()

    await expect(form.getByRole('alert')).toContainText(
        'Nie udało się zapisać danych firmy.',
    )

    expect(state.uploads).toBe(2)

    expect(
        matching(state.requests, '/public-assets/77', 'DELETE'),
    ).toHaveLength(1)

    state.failDelete = false

    await save.click()

    await expect(form.getByRole('alert')).toContainText(
        'Nie udało się zapisać danych firmy.',
    )

    expect(state.uploads).toBe(3)

    expect(
        matching(state.requests, '/public-assets/77', 'DELETE'),
    ).toHaveLength(2)

    state.failCompany = false

    await save.click()

    await expect(form.getByRole('status')).toContainText('Dane firmy zapisane.')

    expect(state.uploads).toBe(3)

    expect(state.company.logoPublicAssetId).toBe(78)

    const uploads = matching(state.requests, '/public-assets', 'POST')

    expect(uploads[0].postData()).toContain(
        'name="originalName"\r\n\r\nLogo Wrocław',
    )

    expect(uploads[2].postData()).toContain(
        'name="originalName"\r\n\r\nLogo biura',
    )

    expect(uploads[2].postData()).toContain('filename="house.png"')

    await expect(name).toHaveCount(0)

    expect(state.unknown).toEqual([])
})

test('manager reads company data and sends only to a selected client contact', async ({
    page,
}, info) => {
    const state = await fixture(page, false)

    await page.goto('/main/company')

    await expect(
        page.getByText('Dane firmy aktualizuje administrator.'),
    ).toBeVisible()

    await expect(
        page.getByRole('form', { name: 'Edycja danych firmy' }),
    ).toHaveCount(0)

    await page.goto('/main/clients/7')

    await page.getByRole('button', { name: 'Napisz', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Wiadomość do Ewa Nowak' })

    const recipient = dialog.getByRole('combobox', { name: 'Adres odbiorcy' })

    await expect(recipient).toContainText('ewa@example.test')

    await recipient.click()

    await expect(page.getByRole('option')).toHaveCount(2)

    await page
        .getByRole('option', { name: 'ewa.office@example.test · Praca' })
        .click()

    await expect(dialog.locator('input[name="to"]')).toHaveCount(0)

    await selectOption(
        dialog.getByRole('combobox', { name: 'Nadawca' }),
        'contact',
    )

    await dialog
        .getByLabel('Temat', { exact: true })
        .fill('Potwierdzenie wizyty')

    await dialog
        .getByLabel('Treść wiadomości')
        .fill('Spotkajmy się jutro o 12:00.')

    await dialog
        .getByRole('button', { name: 'Wybierz szablon English' })
        .click()

    await expect(dialog.getByLabel('Temat', { exact: true })).toHaveValue(
        'Potwierdzenie wizyty',
    )

    await expect(
        page.frameLocator('iframe[title="Podgląd e-maila"]').locator('h1'),
    ).toHaveText('Potwierdzenie wizyty')

    await screenshot(page, 'client-mail', info.project.name)

    if (info.project.name === 'mobile') {
        await page.setViewportSize({ width: 320, height: 844 })

        const accent = dialog.getByRole('button', {
            name: 'Wybierz szablon Українська',
        })

        await accent.click()

        await expect(accent).toHaveAttribute('aria-pressed', 'true')

        const name = accent.locator('span').first()

        const geometry = await name.evaluate((element) => {
            const card = element.closest('button')?.parentElement

            const box = card?.getBoundingClientRect()

            const check = element
                .querySelector('svg:last-child')
                ?.getBoundingClientRect()

            return {
                nameOverflow: element.scrollWidth > element.clientWidth,
                checkWithinCard:
                    !!box &&
                    !!check &&
                    check.right <= box.right &&
                    check.left >= box.left,
                bodyOverflow: document.documentElement.scrollWidth > innerWidth,
            }
        })

        await screenshot(page, 'client-mail-320', info.project.name)

        expect(geometry).toEqual({
            nameOverflow: false,
            checkWithinCard: true,
            bodyOverflow: false,
        })

        await dialog
            .getByRole('button', { name: 'Wybierz szablon English' })
            .click()
    }

    await dialog.getByRole('button', { name: 'Wyślij wiadomość' }).click()

    await expect(dialog.getByRole('status')).toContainText('Wiadomość wysłana')

    const sends = matching(state.requests, '/clients/7/mail/send', 'POST')

    expect(sends).toHaveLength(1)

    const body = sends[0].postData() ?? ''

    expect(body).toContain('name="contactId"\r\n\r\n72')

    expect(body).toContain('name="account"\r\n\r\ncontact')

    expect(body).toContain('name="template"\r\n\r\nen')

    expect(body).not.toContain('name="to"')

    expect(matching(state.requests, '/mail/send', 'POST')).toHaveLength(0)

    expect(matching(state.requests, '/company-settings', 'PATCH')).toHaveLength(
        0,
    )

    expect(state.unknown).toEqual([])
})

test('shared message presets support create, edit and confirmed delete', async ({
    page,
}) => {
    const state = await fixture(page)

    await page.goto('/main/management/email-templates')

    await page
        .getByRole('button', { name: 'Dodaj szablon', exact: true })
        .click()

    let dialog = page.getByRole('dialog', { name: 'Nowy szablon wiadomości' })

    await dialog.getByLabel('Nazwa szablonu').fill('Potwierdzenie oglądania')

    await dialog.getByLabel('Temat', { exact: true }).fill('Termin oglądania')

    await dialog
        .getByLabel('Treść wiadomości')
        .fill('Potwierdzamy termin oglądania.')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toHaveCount(0)

    const created = state.presets.find(
        (row) => row.name === 'Potwierdzenie oglądania',
    )

    expect(created?.managerId).toBeNull()

    expect(
        matching(state.requests, '/mail-presets', 'POST')[0].postDataJSON(),
    ).toEqual({
        name: 'Potwierdzenie oglądania',
        subject: 'Termin oglądania',
        text: 'Potwierdzamy termin oglądania.',
        scope: 'shared',
    })

    await page
        .getByRole('button', { name: 'Opcje szablonu Potwierdzenie oglądania' })
        .click()

    await page.getByRole('button', { name: 'Edytuj', exact: true }).click()

    dialog = page.getByRole('dialog', { name: 'Edytuj szablon wiadomości' })

    await expect(dialog.getByLabel('Temat', { exact: true })).toHaveValue(
        'Termin oglądania',
    )

    await dialog
        .getByLabel('Temat', { exact: true })
        .fill('Zmieniony termin oglądania')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toHaveCount(0)

    await expect(
        page.getByText('Zmieniony termin oglądania', { exact: true }),
    ).toBeVisible()

    expect(
        matching(
            state.requests,
            `/mail-presets/${created?.id}`,
            'PATCH',
        )[0].postDataJSON(),
    ).toEqual({
        name: 'Potwierdzenie oglądania',
        subject: 'Zmieniony termin oglądania',
        text: 'Potwierdzamy termin oglądania.',
    })

    await page
        .getByRole('button', { name: 'Opcje szablonu Potwierdzenie oglądania' })
        .click()

    await page.getByRole('button', { name: 'Usuń', exact: true }).click()

    dialog = page.getByRole('dialog', { name: 'Usuń szablon wiadomości' })

    expect(
        matching(state.requests, `/mail-presets/${created?.id}`, 'DELETE'),
    ).toHaveLength(0)

    await dialog
        .getByRole('button', { name: 'Usuń szablon', exact: true })
        .click()

    await expect(dialog).toHaveCount(0)

    await expect(
        page.getByRole('button', {
            name: 'Opcje szablonu Potwierdzenie oglądania',
        }),
    ).toHaveCount(0)

    expect(
        matching(state.requests, `/mail-presets/${created?.id}`, 'DELETE'),
    ).toHaveLength(1)

    expect(state.unknown).toEqual([])
})

test('saving a personal preset preserves the receiver, draft and selected appearance', async ({
    page,
}) => {
    const state = await fixture(page)

    await page.goto('/main/mail')

    await page
        .getByLabel('Adres odbiorcy', { exact: true })
        .fill('ewa@example.test')

    await page.getByLabel('Temat', { exact: true }).fill('Moja oferta')

    await page
        .getByLabel('Treść wiadomości')
        .fill('Dzień dobry, przesyłam moją ofertę.')

    await page
        .getByRole('button', { name: 'Wybierz szablon Українська' })
        .click()

    await page.getByRole('button', { name: 'Zapisz jako mój szablon' }).click()

    const dialog = page.getByRole('dialog', { name: 'Zapisz mój szablon' })

    await expect(dialog.getByLabel('Temat', { exact: true })).toHaveValue(
        'Moja oferta',
    )

    await expect(dialog.getByLabel('Treść wiadomości')).toHaveValue(
        'Dzień dobry, przesyłam moją ofertę.',
    )

    await dialog.getByLabel('Nazwa szablonu').fill('Moja oferta klienta')

    state.failPreset = true

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toContainText(
        'Wpisana treść została zachowana.',
    )

    await expect(dialog.getByLabel('Temat', { exact: true })).toHaveValue(
        'Moja oferta',
    )

    state.failPreset = false

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toHaveCount(0)

    await expect(
        page.getByLabel('Adres odbiorcy', { exact: true }),
    ).toHaveValue('ewa@example.test')

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        'Moja oferta',
    )

    await expect(page.getByLabel('Treść wiadomości')).toHaveValue(
        'Dzień dobry, przesyłam moją ofertę.',
    )

    await expect(
        page.getByRole('button', { name: 'Wybierz szablon Українська' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await expect(
        page.getByRole('combobox', { name: 'Zapisana wiadomość' }),
    ).toHaveText('Moja oferta klienta · Mój')

    await expect(
        page.getByRole('button', { name: 'Edytuj mój szablon' }),
    ).toBeVisible()

    const personal = state.presets.find(
        (row) => row.name === 'Moja oferta klienta',
    )

    expect(personal?.managerId).toBe(1)

    expect(
        matching(state.requests, '/mail-presets', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toEqual({
        name: 'Moja oferta klienta',
        subject: 'Moja oferta',
        text: 'Dzień dobry, przesyłam moją ofertę.',
        scope: 'personal',
    })

    expect(matching(state.requests, '/mail/send', 'POST')).toHaveLength(0)

    expect(state.unknown).toEqual([])
})

test('client without email cannot send or enter an arbitrary recipient', async ({
    page,
}) => {
    const state = await fixture(page, false, false)

    await page.goto('/main/clients/7')

    await page.getByRole('button', { name: 'Napisz', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Wiadomość do Ewa Nowak' })

    await expect(
        dialog.getByRole('combobox', { name: 'Adres odbiorcy' }),
    ).toBeDisabled()

    await expect(
        dialog.getByText(
            'Dodaj adres e-mail w kontaktach klienta, aby wysłać wiadomość.',
        ),
    ).toBeVisible()

    await expect(
        dialog.getByRole('button', { name: 'Wyślij wiadomość' }),
    ).toBeDisabled()

    await expect(dialog.locator('input[name="to"]')).toHaveCount(0)

    expect(
        matching(state.requests, '/clients/7/mail/send', 'POST'),
    ).toHaveLength(0)

    expect(state.unknown).toEqual([])
})
