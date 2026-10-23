import { selectOption } from './helpers/select-option'
import { test, expect, type Page, type Request } from '@playwright/test'
import type { MailTemplate } from '../src/api/mail/mail.types'
import type { Manager } from '../src/api/managers/managers.types'

const timestamps = {
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-06T08:00:00.000Z',
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
    roles: [{ id: 1, name: 'admin' }],
    ...timestamps,
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

const preset = {
    id: 1,
    name: 'Potwierdzenie spotkania',
    subject: 'Potwierdzenie spotkania',
    text: 'Dzień dobry, potwierdzam nasze spotkanie.',
    managerId: null,
    ...timestamps,
}

const libraryDocument = {
    id: 8,
    bucket: 'manager_documents',
    relPath: 'unused.pdf',
    originalName: 'Umowa.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 20000,
    createdByManagerId: 1,
    visibility: 'author',
    ...timestamps,
}

const escape = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')

async function mock(page: Page, admin = true, path = '/main/mail') {
    const state = { requests: [] as Request[], sendFails: false }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'mail-test-session'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const method = request.method()

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

        if (url.pathname === '/managers/me')
            return route.fulfill({
                json: {
                    ...manager,
                    roles: admin ? manager.roles : [{ id: 2, name: 'manager' }],
                },
            })

        if (url.pathname === '/company-settings')
            return route.fulfill({
                json: {
                    id: 1,
                    name: 'Tsehenko Real Estate',
                    legalName: null,
                    taxId: null,
                    address: 'Wrocław',
                    phone: null,
                    email: null,
                    website: null,
                    logoPublicAssetId: null,
                    ...timestamps,
                },
            })

        if (url.pathname === '/mail-presets')
            return route.fulfill({
                json: {
                    rows: [preset],
                    total: 1,
                    page: 1,
                    limit: 30,
                    offset: 0,
                },
            })

        if (url.pathname === '/mail-presets/1')
            return route.fulfill({ json: preset })

        if (url.pathname === '/mail/accounts')
            return route.fulfill({
                json: [
                    {
                        id: 'default',
                        name: 'Tsehenko CRM',
                        email: 'app@example.test',
                    },
                    {
                        id: 'contact',
                        name: 'Tsehenko Real Estate',
                        email: 'contact@example.test',
                    },
                ],
            })

        if (url.pathname === '/mail/templates')
            return route.fulfill({ json: templates })

        if (url.pathname === '/mail/preview') {
            const dto: { subject: string; text: string; template: string } =
                request.postDataJSON()

            const template =
                templates.find((value) => value.id === dto.template) ??
                templates[0]

            return route.fulfill({
                json: {
                    html: `<!doctype html><html lang="${template.language === 'ua' ? 'uk' : template.language}"><body style="margin:0;padding:28px;background:#f1f4f9;font-family:Arial;color:#172944"><div data-layout="classic" data-language="${template.language}" style="background:#fff;padding:28px;border-top:5px solid #2563eb;border-radius:12px"><strong>TSEHENKO REAL ESTATE</strong><h1 style="font-size:24px">${escape(dto.subject)}</h1><p style="white-space:pre-line;line-height:1.8">${escape(dto.text)}</p><hr><small>Tsehenko Real Estate · Wrocław</small></div></body></html>`,
                },
            })
        }

        if (url.pathname === '/mail/send')
            return route.fulfill({
                status: state.sendFails ? 503 : 201,
                json: state.sendFails
                    ? { message: 'SMTP unavailable' }
                    : { success: true },
            })

        if (url.pathname === '/private-assets')
            return route.fulfill({
                json: {
                    rows: [libraryDocument],
                    total: 1,
                    page: 1,
                    limit: 100,
                    offset: 0,
                },
            })

        if (url.pathname === '/private-assets/8')
            return route.fulfill({ json: libraryDocument })

        return route.fulfill({
            status: 404,
            json: { message: 'Mock endpoint unavailable' },
        })
    })

    await page.goto(path)

    return state
}

test('visual sender/templates and sandboxed live preview work on desktop and mobile', async ({
    page,
}, testInfo) => {
    const state = await mock(page)

    await selectOption(
        page.getByLabel('Zapisana wiadomość', { exact: true }),
        '1',
    )

    await expect(
        page.getByRole('heading', { name: 'Napisz wiadomość', exact: true }),
    ).toBeVisible()

    await page
        .getByRole('button', {
            name: 'Wybierz szablon Українська',
            exact: true,
        })
        .click()

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        'Potwierdzenie spotkania',
    )

    await selectOption(page.getByLabel('Nadawca', { exact: true }), 'contact')

    await page
        .getByLabel('Adres odbiorcy', { exact: true })
        .fill('jan@example.test')

    await expect(
        page
            .frameLocator('iframe[title="Podgląd e-maila"]')
            .getByRole('heading', {
                name: 'Potwierdzenie spotkania',
                exact: true,
            }),
    ).toBeVisible()

    await expect(
        page.locator('iframe[title="Podgląd e-maila"]'),
    ).toHaveAttribute('sandbox', '')

    expect(
        state.requests.filter(
            (request) => new URL(request.url()).pathname === '/mail/send',
        ),
    ).toHaveLength(0)

    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        )
        .toBe(true)

    await page
        .locator('iframe[title="Podgląd e-maila"]')
        .scrollIntoViewIfNeeded()

    await page.locator('iframe[title="Podgląd e-maila"]').screenshot({
        path: `/tmp/ivan-mail-preview-${testInfo.project.name}.png`,
    })

    await page.evaluate(() => window.scrollTo(0, 0))

    await page.screenshot({
        path: `/tmp/ivan-mail-${testInfo.project.name}.png`,
        fullPage: true,
    })
})

test('switching template keeps custom subject/body and escaped markup is only previewed', async ({
    page,
}) => {
    await mock(page)

    await page.getByLabel('Temat', { exact: true }).fill('Własny temat <b>')

    await page
        .getByLabel('Treść wiadomości', { exact: true })
        .fill('Treść <script>alert(1)</script>')

    await page
        .getByRole('button', {
            name: 'Wybierz szablon English',
            exact: true,
        })
        .click()

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        'Własny temat <b>',
    )

    await expect(
        page.getByLabel('Treść wiadomości', { exact: true }),
    ).toHaveValue('Treść <script>alert(1)</script>')

    const frame = page.frameLocator('iframe[title="Podgląd e-maila"]')

    await expect(
        frame.getByRole('heading', { name: 'Własny temat <b>', exact: true }),
    ).toBeVisible()

    await expect(frame.locator('script')).toHaveCount(0)
})

test('send failure retains body and computer/library attachments then explicit retry succeeds', async ({
    page,
}) => {
    const state = await mock(page)

    await page
        .getByLabel('Adres odbiorcy', { exact: true })
        .fill('jan@example.test')

    await page
        .getByLabel('Temat', { exact: true })
        .fill('Materiały do spotkania')

    await page
        .getByLabel('Treść wiadomości', { exact: true })
        .fill('Dzień dobry, przesyłam dokumenty.')

    await page
        .getByLabel('Dodaj plik z komputera', { exact: true })
        .setInputFiles('tests/fixtures/icons/house.png')

    await expect(
        page.getByRole('button', {
            name: 'Usuń załącznik house.png',
            exact: true,
        }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Wybierz z biblioteki' }).click()

    await page.getByRole('button', { name: /Umowa.pdf.*Prywatny/ }).click()

    state.sendFails = true

    await page
        .getByRole('button', { name: 'Wyślij wiadomość', exact: true })
        .click()

    await expect(
        page
            .getByRole('form', { name: 'Wysyłanie wiadomości' })
            .getByRole('alert'),
    ).toContainText('Treść i załączniki zostały zachowane')

    await expect(
        page.getByLabel('Treść wiadomości', { exact: true }),
    ).toHaveValue('Dzień dobry, przesyłam dokumenty.')

    await expect(
        page.getByRole('button', {
            name: 'Usuń załącznik house.png',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Odłącz dokument 8', exact: true }),
    ).toBeVisible()

    const library = state.requests.find(
        (request) => new URL(request.url()).pathname === '/private-assets',
    )

    expect(new URL(library!.url()).searchParams.get('ownOnly')).toBe('true')

    state.sendFails = false

    await page
        .getByRole('button', { name: 'Wyślij wiadomość', exact: true })
        .click()

    await expect(page.getByRole('status')).toContainText('Wiadomość wysłana')

    const sends = state.requests.filter(
        (request) => new URL(request.url()).pathname === '/mail/send',
    )

    expect(sends).toHaveLength(2)

    const multipart = sends[1].postDataBuffer()!.toString()

    expect(multipart).toContain('name="privateAssetIds"')

    expect(multipart).toContain('[8]')

    expect(multipart).toContain('filename="house.png"')

    await page
        .getByRole('button', { name: 'Napisz kolejną', exact: true })
        .click()

    await expect(
        page.getByLabel('Adres odbiorcy', { exact: true }),
    ).toHaveValue('')
})

test('file types and total size are validated without submitting anything', async ({
    page,
}) => {
    const state = await mock(page)

    await page
        .getByLabel('Dodaj plik z komputera', { exact: true })
        .setInputFiles({
            name: 'unsafe.html',
            mimeType: 'text/html',
            buffer: Buffer.from('<html>Unsafe</html>'),
        })

    await expect(
        page
            .getByRole('form', { name: 'Wysyłanie wiadomości' })
            .getByRole('alert'),
    ).toContainText('Wybierz PDF')

    await page
        .getByLabel('Dodaj plik z komputera', { exact: true })
        .setInputFiles({
            name: 'large.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.alloc(21 * 1024 * 1024),
        })

    await expect(
        page
            .getByRole('form', { name: 'Wysyłanie wiadomości' })
            .getByRole('alert'),
    ).toContainText('maksymalnie 20 MB')

    expect(
        state.requests.filter(
            (request) => new URL(request.url()).pathname === '/mail/send',
        ),
    ).toHaveLength(0)
})

test('management library opens template preview and uses selected template in composer', async ({
    page,
}) => {
    await mock(page, true, '/main/management/email-templates')

    await page
        .getByRole('button', {
            name: 'Podgląd szablonu English',
            exact: true,
        })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'English',
        exact: true,
    })

    await expect(
        dialog
            .frameLocator('iframe[title="Podgląd e-maila"]')
            .getByRole('heading', {
                name: 'Conversation summary',
                exact: true,
            }),
    ).toBeVisible()

    await dialog
        .getByRole('link', { name: 'Użyj tego języka', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/mail\?template=en$/)

    await selectOption(
        page.getByLabel('Zapisana wiadomość', { exact: true }),
        '1',
    )

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        'Potwierdzenie spotkania',
    )
})

test('regular managers send individual mail from configured accounts while campaigns and shared templates stay protected', async ({
    page,
}) => {
    const state = await mock(page, false)

    await expect(
        page.getByRole('heading', { name: 'Napisz wiadomość', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'Rozsyłki do klientów' }),
    ).toHaveCount(0)

    await page
        .getByLabel('Adres odbiorcy', { exact: true })
        .fill('recipient@example.test')

    await page
        .getByLabel('Temat', { exact: true })
        .fill('Individual manager message')

    await page
        .getByLabel('Treść wiadomości', { exact: true })
        .fill('Content from shared mailbox')

    await page
        .getByRole('button', { name: 'Wyślij wiadomość', exact: true })
        .click()

    await expect(
        page.getByText('Wiadomość wysłana', { exact: true }),
    ).toBeVisible()

    expect(
        state.requests.some(
            (request) => new URL(request.url()).pathname === '/mail/send',
        ),
    ).toBe(true)

    await page.goto('/main/management/email-templates')

    await expect(
        page.getByRole('heading', { name: 'Brak uprawnień', exact: true }),
    ).toBeVisible()

    expect(
        state.requests.some((request) =>
            new URL(request.url()).pathname.startsWith('/mail-campaigns'),
        ),
    ).toBe(false)
})

test('language changes keep manual fields and presets; empty preview uses localized catalogue samples only', async ({
    page,
}) => {
    const state = await mock(page)

    const english = page.getByRole('button', {
        name: 'Wybierz szablon English',
        exact: true,
    })

    const ukrainian = page.getByRole('button', {
        name: 'Wybierz szablon Українська',
        exact: true,
    })

    await english.click()

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue('')

    await expect(
        page.getByLabel('Treść wiadomości', { exact: true }),
    ).toHaveValue('')

    await expect(
        page
            .frameLocator('iframe[title="Podgląd e-maila"]')
            .getByRole('heading', {
                name: 'Conversation summary',
                exact: true,
            }),
    ).toBeVisible()

    await page.getByLabel('Temat', { exact: true }).fill('   ')

    await page.getByLabel('Treść wiadomości', { exact: true }).fill('   ')

    await expect(
        page
            .frameLocator('iframe[title="Podgląd e-maila"]')
            .getByRole('heading', {
                name: 'Conversation summary',
                exact: true,
            }),
    ).toBeVisible()

    await selectOption(
        page.getByLabel('Zapisana wiadomość', { exact: true }),
        '1',
    )

    await ukrainian.click()

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        preset.subject,
    )

    await expect(
        page.getByLabel('Treść wiadomości', { exact: true }),
    ).toHaveValue(preset.text)

    await expect(
        page.getByLabel('Zapisana wiadomość', { exact: true }),
    ).toContainText(preset.name)

    await page
        .getByLabel('Temat', { exact: true })
        .fill('My hand-written subject')

    await page
        .getByLabel('Treść wiadomości', { exact: true })
        .fill('My hand-written body')

    await english.click()

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        'My hand-written subject',
    )

    await expect(
        page.getByLabel('Treść wiadomości', { exact: true }),
    ).toHaveValue('My hand-written body')

    await page
        .getByLabel('Adres odbiorcy', { exact: true })
        .fill('recipient@example.test')

    await page
        .getByRole('button', { name: 'Wyślij wiadomość', exact: true })
        .click()

    await expect(
        page.getByText('Wiadomość wysłana', { exact: true }),
    ).toBeVisible()

    const sent =
        state.requests
            .find((request) => new URL(request.url()).pathname === '/mail/send')
            ?.postData() ?? ''

    expect(sent).toContain('name="template"\r\n\r\nen')

    expect(sent).toContain('My hand-written subject')

    expect(sent).toContain('My hand-written body')
})

test('canonical ua and legacy uk deep links select Ukrainian and submit canonical ua', async ({
    page,
}) => {
    const state = await mock(page)

    for (const requested of ['ua', 'ua-photo', 'uk', 'uk-photo', 'uk-plain']) {
        await page.goto(`/main/mail?template=${requested}`)

        const ukrainian = page.getByRole('button', {
            name: 'Wybierz szablon Українська',
            exact: true,
        })

        await expect(ukrainian).toHaveAttribute('aria-pressed', 'true')

        await expect(ukrainian.locator('[lang]')).toHaveAttribute('lang', 'uk')

        await expect(
            page
                .frameLocator('iframe[title="Podgląd e-maila"]')
                .locator('html'),
        ).toHaveAttribute('lang', 'uk')

        await expect
            .poll(
                () =>
                    state.requests
                        .filter(
                            (request) =>
                                new URL(request.url()).pathname ===
                                '/mail/preview',
                        )
                        .at(-1)
                        ?.postDataJSON().template,
            )
            .toBe('ua')
    }

    await page
        .getByLabel('Adres odbiorcy', { exact: true })
        .fill('recipient@example.test')

    await page.getByLabel('Temat', { exact: true }).fill('Наш лист')

    await page
        .getByLabel('Treść wiadomości', { exact: true })
        .fill('Текст листа.')

    await page
        .getByRole('button', { name: 'Wyślij wiadomość', exact: true })
        .click()

    await expect(
        page.getByText('Wiadomość wysłana', { exact: true }),
    ).toBeVisible()

    expect(
        state.requests
            .findLast(
                (request) => new URL(request.url()).pathname === '/mail/send',
            )
            ?.postData(),
    ).toContain('name="template"\r\n\r\nua')
})
