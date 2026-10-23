import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { selectOption } from './helpers/select-option'
import type {
    CreateCampaignDto,
    MailCampaign,
} from '../src/api/mail-campaigns/mail-campaigns.types'

async function mock(page: Page, role = 'admin') {
    const state = {
        requests: [] as Request[],
        created: [] as CreateCampaignDto[],
        campaigns: [] as MailCampaign[],
        eligible: 2,
        failCreate: false,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'campaign-test-session'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        if (request.method() === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'GET,POST,OPTIONS',
                    'access-control-allow-headers':
                        'Authorization,Content-Type',
                },
            })

        state.requests.push(request)

        if (path === '/managers/me')
            return route.fulfill({
                json: {
                    id: 1,
                    name: 'Anna',
                    surname: 'Nowak',
                    email: 'anna@example.test',
                    status: 'active',
                    remindersEnabled: false,
                    roles: [{ id: 1, name: role }],
                },
            })

        if (path === '/company-settings')
            return route.fulfill({
                json: {
                    id: 1,
                    name: 'Atlantis',
                    updatedAt: '2026-10-23T08:00:00Z',
                },
            })

        if (path === '/mail-campaigns/filter-options') {
            const kind = url.searchParams.get('kind')

            const rows =
                kind === 'stage'
                    ? [{ id: 3, label: 'Wniosek' }]
                    : kind === 'source'
                      ? [{ id: 2, label: 'Polecenie' }]
                      : [{ id: 1, label: 'Anna Nowak' }]

            return route.fulfill({
                json: {
                    rows,
                    total: rows.length,
                    page: 1,
                    limit: 100,
                    offset: 0,
                },
            })
        }

        if (path.endsWith('/accounts'))
            return route.fulfill({
                json: [
                    {
                        id: 'default',
                        name: 'Atlantis',
                        email: 'app@atlantis.info.pl',
                    },
                    {
                        id: 'contact',
                        name: 'App mailbox (display name only)',
                        email: 'contact@atlantis.info.pl',
                    },
                ],
            })

        if (path.endsWith('/templates'))
            return route.fulfill({
                json: [
                    {
                        id: 'pl',
                        name: 'Polski',
                        description: 'Firmowy',
                        language: 'pl',
                        previewSubject: 'Podsumowanie rozmowy',
                        previewText: 'Dzień dobry, przesyłam informacje.',
                    },
                    {
                        id: 'ua',
                        name: 'Українська',
                        description: 'Лист українською.',
                        language: 'ua',
                        previewSubject: 'Підсумок розмови',
                        previewText: 'Добрий день! Надсилаю інформацію.',
                    },
                ],
            })

        if (path.endsWith('/preview'))
            return route.fulfill({
                json: {
                    html: `<html lang="${request.postDataJSON().template === 'ua' ? 'uk' : 'pl'}"><body>Podgląd</body></html>`,
                },
            })

        if (path === '/mail-campaigns/audience')
            return route.fulfill({
                json: {
                    matchedClients: 5,
                    eligibleRecipients: state.eligible,
                    excluded: {
                        missingEmail: 1,
                        invalidEmail: 0,
                        missingConsent: 1,
                        duplicateEmail: 1,
                    },
                    sample: state.eligible
                        ? [
                              {
                                  clientId: 11,
                                  name: 'Jan',
                                  surname: 'Nowak',
                                  email: 'jan@example.test',
                              },
                          ]
                        : [],
                },
            })

        if (path === '/mail-campaigns' && request.method() === 'POST') {
            const dto = request.postDataJSON() as CreateCampaignDto

            state.created.push(dto)

            if (state.failCreate) {
                state.failCreate = false

                return route.fulfill({
                    status: 503,
                    json: { message: 'Temporary failure' },
                })
            }

            const campaign: MailCampaign = {
                id: 1,
                name: dto.name,
                subject: dto.subject,
                text: dto.text,
                status: 'queued',
                scheduledAt: dto.scheduledAt ?? '2026-10-23T08:00:00Z',
                isScheduled: Boolean(dto.scheduledAt),
                createdAt: '2026-10-23T08:00:00Z',
                counts: {
                    total: 2,
                    pending: 2,
                    sending: 0,
                    sent: 0,
                    failed: 0,
                    skipped: 0,
                    cancelled: 0,
                    uncertain: 0,
                },
            }

            state.campaigns = [campaign]

            return route.fulfill({ status: 201, json: campaign })
        }

        if (path === '/mail-campaigns/1/cancel') {
            state.campaigns[0] = {
                ...state.campaigns[0],
                status: 'cancelled',
                counts: {
                    ...state.campaigns[0].counts,
                    pending: 0,
                    cancelled: 2,
                },
            }

            return route.fulfill({ json: state.campaigns[0] })
        }

        if (path === '/mail-campaigns/1')
            return route.fulfill({ json: state.campaigns[0] })

        if (path === '/mail-campaigns/1/recipients')
            return route.fulfill({
                json: {
                    rows: [
                        {
                            id: 1,
                            clientId: 11,
                            email: 'jan@example.test',
                            status:
                                state.campaigns[0]?.status === 'cancelled'
                                    ? 'cancelled'
                                    : 'pending',
                        },
                    ],
                    total: 1,
                    page: 1,
                    limit: 20,
                    offset: 0,
                },
            })

        const rows =
            path === '/mail-campaigns'
                ? state.campaigns
                : path === '/stage-templates'
                  ? [{ id: 3, title: 'Wniosek', isActive: true }]
                  : []

        return route.fulfill({
            json: { rows, total: rows.length, page: 1, limit: 20, offset: 0 },
        })
    })

    await page.goto('/main/mail/campaigns')

    return state
}

async function fill(page: Page) {
    await page
        .getByRole('button', { name: 'Nowa rozsyłka', exact: true })
        .click()

    await page
        .getByLabel('Nazwa rozsyłki', { exact: true })
        .fill('Informacja o dokumentach')

    await page.getByLabel('Temat', { exact: true }).fill('Dokumenty do sprawy')

    await page
        .getByLabel('Treść wiadomości', { exact: true })
        .fill('Dzień dobry, prosimy przygotować dokumenty.')
}

test('filters require a fresh audience preview, Warsaw schedule queues campaign and cancellation updates progress', async ({
    page,
}, testInfo) => {
    const state = await mock(page)

    await fill(page)

    await expect(
        page.getByRole('button', { name: 'Uruchom rozsyłkę', exact: true }),
    ).toBeDisabled()

    await page
        .getByRole('button', { name: 'Sprawdź odbiorców', exact: true })
        .click()

    await expect(page.getByText('Odbiorcy: 2', { exact: true })).toBeVisible()

    await selectOption(
        page.getByRole('combobox', { name: 'Status klienta', exact: true }),
        'active',
    )

    await expect(
        page.getByRole('button', { name: 'Uruchom rozsyłkę', exact: true }),
    ).toBeDisabled()

    await selectOption(
        page.getByRole('combobox', { name: 'Aktywny etap', exact: true }),
        '3',
    )

    await selectOption(
        page.getByRole('combobox', { name: 'Status płatności', exact: true }),
        'partial',
    )

    await page
        .getByRole('button', { name: 'Sprawdź odbiorców', exact: true })
        .click()

    await selectOption(
        page.getByRole('combobox', { name: 'Termin wysyłki', exact: true }),
        'scheduled',
    )

    await page.getByLabel('Data wysyłki', { exact: true }).fill('2099-01-15')

    await page.getByLabel('Godzina wysyłki', { exact: true }).fill('09:30')

    mkdirSync('/tmp/atimi-frontend-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/mail-campaign-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await page
        .getByRole('button', { name: 'Zaplanuj rozsyłkę', exact: true })
        .click()

    await expect(
        page.getByText('Rozsyłka została zapisana.', { exact: false }),
    ).toBeVisible()

    expect(state.created).toHaveLength(1)

    expect(state.created[0].filters).toEqual({
        status: 'active',
        stageTemplateId: 3,
        paymentStatus: 'partial',
    })

    expect(state.created[0].scheduledAt).toBe('2099-01-15T08:30:00.000Z')

    expect(
        state.requests.some((request) => request.url().endsWith('/mail/send')),
    ).toBe(false)

    await page.getByRole('button', { name: 'Szczegóły rozsyłki' }).click()

    await expect(
        page.getByText('jan@example.test', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Anuluj pozostałą wysyłkę' }).click()

    await expect(page.getByText('Anulowano: 2', { exact: true })).toBeVisible()
})

test('no consenting recipients blocks creation and failures preserve content and request id', async ({
    page,
}) => {
    const state = await mock(page)

    await fill(page)

    state.eligible = 0

    await page
        .getByRole('button', { name: 'Sprawdź odbiorców', exact: true })
        .click()

    await expect(
        page.getByText('Brak odbiorców spełniających warunki rozsyłki.'),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Uruchom rozsyłkę', exact: true }),
    ).toBeDisabled()

    state.eligible = 2

    await page
        .getByRole('button', { name: 'Sprawdź odbiorców', exact: true })
        .click()

    state.failCreate = true

    await page
        .getByRole('button', { name: 'Uruchom rozsyłkę', exact: true })
        .click()

    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Nie udało się zapisać rozsyłki' }),
    ).toContainText('Nie udało się zapisać rozsyłki')

    await expect(page.getByLabel('Temat', { exact: true })).toHaveValue(
        'Dokumenty do sprawy',
    )

    await page
        .getByRole('button', { name: 'Uruchom rozsyłkę', exact: true })
        .click()

    await expect(
        page.getByText('Rozsyłka została zapisana.', { exact: false }),
    ).toBeVisible()

    expect(state.created).toHaveLength(2)

    expect(state.created[0].requestId).toBe(state.created[1].requestId)
})

test('sender has campaigns using only scoped filter options and can open individual mail', async ({
    page,
}) => {
    const state = await mock(page, 'sender')

    await fill(page)

    await expect(
        page.getByRole('combobox', { name: 'Opiekun', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('link', { name: 'Pojedyncza wiadomość' }),
    ).toBeVisible()

    await page
        .getByRole('button', { name: 'Sprawdź odbiorców', exact: true })
        .click()

    await page
        .getByRole('button', { name: 'Uruchom rozsyłkę', exact: true })
        .click()

    await expect(
        page.getByText('Rozsyłka została zapisana.', { exact: false }),
    ).toBeVisible()

    expect(
        state.requests.some((request) =>
            /\/mail\/(accounts|templates|preview|send)$/.test(
                new URL(request.url()).pathname,
            ),
        ),
    ).toBe(false)

    expect(
        state.requests.some((request) =>
            [
                '/clients',
                '/client-sources',
                '/stage-templates',
                '/managers',
            ].includes(new URL(request.url()).pathname),
        ),
    ).toBe(false)

    expect(
        state.requests.some(
            (request) =>
                new URL(request.url()).pathname ===
                '/mail-campaigns/filter-options',
        ),
    ).toBe(true)
})

test('manager without sender cannot open campaigns', async ({ page }) => {
    const state = await mock(page, 'manager')

    await expect(
        page.getByText('Nie masz dostępu do tej sekcji.'),
    ).toBeVisible()

    expect(
        state.requests.some((request) =>
            new URL(request.url()).pathname.startsWith('/mail-campaigns'),
        ),
    ).toBe(false)
})

test('campaigns offer only the app mailbox and include its ID in preview', async ({
    page,
}) => {
    const state = await mock(page)

    await fill(page)

    const account = page.getByRole('combobox', { name: 'Nadawca', exact: true })

    await expect(account).toContainText('app@atlantis.info.pl')

    await account.click()

    await expect(
        page.getByRole('option', { name: /contact@atlantis/ }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('option', { name: /app@atlantis.info.pl/ }),
    ).toHaveCount(1)

    await page.keyboard.press('Escape')

    await expect
        .poll(
            () =>
                state.requests
                    .filter(
                        (request) =>
                            new URL(request.url()).pathname ===
                            '/mail-campaigns/preview',
                    )
                    .at(-1)
                    ?.postDataJSON()?.account,
        )
        .toBe('default')
})

test('a contact mailbox cannot substitute for missing app campaign configuration', async ({
    page,
}) => {
    const state = await mock(page)

    await page.route('**:4201/mail-campaigns/accounts', (route) =>
        route.fulfill({
            json: [
                {
                    id: 'contact',
                    name: 'app@atlantis.info.pl',
                    email: 'contact@atlantis.info.pl',
                },
            ],
        }),
    )

    await page
        .getByRole('button', { name: 'Nowa rozsyłka', exact: true })
        .click()

    await expect(
        page.getByText(
            'Rozsyłki wymagają skonfigurowanej skrzynki app@atlantis.info.pl.',
        ),
    ).toBeVisible()

    await expect(
        page.getByRole('combobox', { name: 'Nadawca', exact: true }),
    ).toHaveCount(0)

    expect(
        state.requests.filter(
            (request) =>
                new URL(request.url()).pathname === '/mail-campaigns' &&
                request.method() === 'POST',
        ),
    ).toHaveLength(0)
})

test('Ukrainian campaign uses canonical ua in preview and creation while HTML uses uk', async ({
    page,
}) => {
    const state = await mock(page)

    await fill(page)

    await page
        .getByRole('button', {
            name: 'Wybierz szablon Українська',
            exact: true,
        })
        .click()

    await expect(
        page.frameLocator('iframe[title="Podgląd e-maila"]').locator('html'),
    ).toHaveAttribute('lang', 'uk')

    await expect
        .poll(
            () =>
                state.requests
                    .filter(
                        (request) =>
                            new URL(request.url()).pathname ===
                            '/mail-campaigns/preview',
                    )
                    .at(-1)
                    ?.postDataJSON().template,
        )
        .toBe('ua')

    await page
        .getByRole('button', { name: 'Sprawdź odbiorców', exact: true })
        .click()

    await page
        .getByRole('button', { name: 'Uruchom rozsyłkę', exact: true })
        .click()

    await expect.poll(() => state.created.length).toBe(1)

    expect(state.created[0].template).toBe('ua')
})
