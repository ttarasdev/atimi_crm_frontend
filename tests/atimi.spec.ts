import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { selectOption } from './helpers/select-option'
import type { Manager } from '../src/api/managers/managers.types'
import type { Client } from '../src/api/clients/clients.types'
import type {
    LegalizationProfile,
    DocumentCard,
    DocumentCardType,
} from '../src/api/legalization/legalization.types'

const timestamps = {
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
}

const manager: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Nowak',
    email: 'anna@example.test',
    phone: null,
    position: null,
    avatarId: null,
    status: 'active',
    remindersEnabled: true,
    lastLoginAt: null,
    roles: [
        { id: 2, name: 'manager' },
        { id: 3, name: 'sender' },
    ],
    ...timestamps,
}

const customer: Client = {
    id: 1,
    name: 'Olena',
    surname: 'Koval',
    isPrivate: true,
    managerId: 1,
    sourceId: null,
    language: 'ua',
    address: 'Warszawa',
    preferredContactTime: null,
    status: 'active',
    priority: 'normal',
    paymentStatus: 'unpaid',
    archivedAt: null,
    manager: {
        id: 1,
        name: 'Anna',
        surname: 'Nowak',
        email: 'anna@example.test',
    },
    ...timestamps,
}

const cardType: DocumentCardType = {
    id: 1,
    code: 'temporary_residence',
    title: 'Karta pobytu czasowego',
    requiresExpiry: true,
    reminderMonths: [3, 2, 1],
    reminderTime: '09:00',
    color: '#4676B4',
}

async function setup(
    page: Page,
    options: {
        publicOther?: boolean
        senderOnly?: boolean
        admin?: boolean
    } = {},
) {
    const writes: { path: string; body: Record<string, unknown> }[] = []

    let profile: LegalizationProfile = {
        emailMarketingConsent: false,
        emailAutomationConsent: false,
        citizenship: 'Ukraina',
        pesel: '90010112345',
    }

    const cards: DocumentCard[] = []

    const currentManager = {
        ...manager,
        roles: options.senderOnly
            ? [{ id: 3, name: 'sender' }]
            : options.admin
              ? [{ id: 1, name: 'admin' }]
              : manager.roles,
    }

    const currentClient = options.publicOther
        ? {
              ...customer,
              isPrivate: false,
              managerId: 2,
              manager: {
                  id: 2,
                  name: 'Piotr',
                  surname: 'Nowak',
                  email: 'piotr@example.test',
              },
          }
        : customer

    function list(rows: unknown[]) {
        return { rows, total: rows.length, page: 1, limit: 100, offset: 0 }
    }

    await page.addInitScript(() =>
        window.localStorage.setItem('atimi:access_token', 'atimi-test-token'),
    )

    await page.route('http://localhost:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        if (request.method() === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': '*',
                },
            })

        const method = request.method()

        const body =
            method === 'GET'
                ? {}
                : (request.postDataJSON() as Record<string, unknown>)

        if (method !== 'GET') writes.push({ path, body })

        let data: unknown = list([])

        if (path === '/managers/me') data = currentManager
        else if (
            (path === '/document-upload-notifications' ||
                path === '/note-mention-notifications') &&
            method === 'GET'
        )
            data = { ...list([]), unreadCount: 0 }
        else if (
            /^\/clients\/\d+\/document-requests$/.test(path) &&
            method === 'GET'
        )
            data = list([])
        else if (path === '/clients/1') data = currentClient
        else if (path === '/clients')
            data =
                method === 'POST'
                    ? { ...customer, ...body }
                    : list([
                          currentClient,
                          { ...customer, id: 2, name: 'Andrii' },
                      ])
        else if (path === '/clients/1/legalization') {
            if (method === 'PATCH') profile = { ...profile, ...body }

            data = profile
        } else if (path === '/document-card-types') data = list([cardType])
        else if (path === '/clients/1/document-cards') {
            if (method === 'POST')
                cards.push({
                    id: 1,
                    clientId: 1,
                    type: cardType,
                    ...timestamps,
                    ...body,
                } as DocumentCard)

            data = method === 'POST' ? cards[0] : list(cards)
        } else if (path === '/clients/1/relations')
            data =
                method === 'POST'
                    ? { id: 1, ...body }
                    : list([
                          {
                              id: 3,
                              clientId: 1,
                              relatedClientId: 2,
                              type: 'parent',
                              direction: 'child',
                              relatedClient: {
                                  id: 2,
                                  name: 'Andrii',
                                  surname: 'Koval',
                              },
                          },
                      ])
        else if (path === '/calendars/manager/1')
            data = {
                id: 1,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            }
        else if (path === '/company-settings')
            data = { id: 1, name: 'Atlantis', logoPublicAssetId: null }
        else if (path === '/mail/accounts')
            data = [
                {
                    id: 'default',
                    name: 'Atlantis',
                    email: 'app@atlantis.info.pl',
                },
            ]
        else if (path === '/mail/templates')
            data = [
                {
                    id: 'pl',
                    name: 'Polski',
                    description: 'Wiadomość Atlantis',
                    language: 'pl',
                    previewSubject: 'Podsumowanie rozmowy',
                    previewText:
                        'Dzień dobry, przesyłam informacje o Państwa sprawie.',
                },
            ]
        else if (path === '/mail/preview')
            data = { html: '<p>Podgląd wiadomości</p>' }
        else if (path === '/process-templates')
            data = list([
                {
                    id: 1,
                    title: 'Pobyt czasowy',
                    description: 'Obsługa legalizacji',
                    stageTemplateIds: [2, 3],
                    isActive: true,
                    ...timestamps,
                },
            ])
        else if (path === '/stage-templates')
            data = list([
                {
                    id: 2,
                    title: 'Dokumenty',
                    isActive: true,
                    color: '#4676B4',
                    iconId: 1,
                },
                {
                    id: 3,
                    title: 'Wniosek',
                    isActive: true,
                    color: '#4676B4',
                    iconId: 1,
                },
            ])
        else if (path === '/clients/1/processes' && method === 'POST')
            data = {
                id: 1,
                clientId: 1,
                managerId: 1,
                status: 'active',
                ...timestamps,
                ...body,
            }
        else if (path === '/manager-auth/managers')
            data = { id: 2, email: body.email, status: 'pending' }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(data),
        })
    })

    return writes
}

test('other managers can read public client but cannot mutate or access owner calendar', async ({
    page,
}) => {
    const writes = await setup(page, { publicOther: true })

    const calendarRequests: string[] = []

    page.on('request', (request) => {
        if (request.url().includes('/calendars/manager/2'))
            calendarRequests.push(request.url())
    })

    await page.goto('/main/clients/1')

    await expect(page.getByText('Podgląd klienta zespołu.')).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Edytuj klienta', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Archiwizuj', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Napisz', exact: true }),
    ).toBeDisabled()

    await page
        .getByRole('button', { name: 'Karty dokumentów', exact: true })
        .click()

    await expect(page.getByRole('button', { name: 'Dodaj kartę' })).toHaveCount(
        0,
    )

    expect(calendarRequests).toEqual([])

    expect(writes).toEqual([])
})

test('new clients are private by default', async ({ page }) => {
    const writes = await setup(page)

    await page.goto('/main/clients')

    await page
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    const dialog = page.getByRole('dialog')

    await expect(
        dialog.getByRole('checkbox', { name: /Klient prywatny/ }),
    ).toBeChecked()

    await dialog.getByLabel('Imię / nazwa', { exact: true }).fill('Mariia')

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect
        .poll(
            () =>
                writes.find((item) => item.path === '/clients')?.body.isPrivate,
        )
        .toBe(true)
})

test('legalization data and consent are saved without sending mail', async ({
    page,
}) => {
    const writes = await setup(page)

    await page.goto('/main/clients/1')

    await page.getByRole('button', { name: 'Legalizacja', exact: true }).click()

    await expect(page.getByText('Ukraina', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Edytuj dane', exact: true }).click()

    const dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Obywatelstwo', { exact: true })
        .fill('Ukraina, Polska')

    await dialog
        .getByRole('checkbox', {
            name: 'Zgoda na wiadomości marketingowe i oferty',
        })
        .check()

    await dialog
        .getByRole('button', { name: 'Zapisz dane', exact: true })
        .click()

    await expect
        .poll(
            () =>
                writes.find((item) => item.path.endsWith('/legalization'))?.body
                    .emailMarketingConsent,
        )
        .toBe(true)

    expect(writes.some((item) => item.path.includes('/mail/send'))).toBe(false)
})

test('document card stores selected expiry reminder months and displays card', async ({
    page,
}, testInfo) => {
    const writes = await setup(page)

    await page.goto('/main/clients/1')

    await page
        .getByRole('button', { name: 'Karty dokumentów', exact: true })
        .click()

    await page.getByRole('button', { name: 'Dodaj kartę', exact: true }).click()

    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Ważny do', { exact: true }).fill('2028-08-31')

    await expect(
        dialog.getByRole('checkbox', { name: '3 miesiące', exact: true }),
    ).toBeChecked()

    await dialog
        .getByRole('checkbox', { name: '1 miesiąc', exact: true })
        .uncheck()

    await dialog
        .getByRole('button', { name: 'Dodaj kartę', exact: true })
        .click()

    await expect(page.getByRole('dialog')).toBeHidden()

    await expect(page.getByText('31.08.2028', { exact: true })).toBeVisible()

    expect(
        writes.find((item) => item.path.endsWith('/document-cards'))?.body
            .reminderMonths,
    ).toEqual([3, 2])

    mkdirSync('/tmp/atimi-frontend-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/cards-${testInfo.project.name}.png`,
        fullPage: true,
    })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)
})

test('family displays inverse relation and prevents self selection', async ({
    page,
}) => {
    await setup(page)

    await page.goto('/main/clients/1')

    await page.getByRole('button', { name: 'Rodzina', exact: true }).click()

    await expect(page.getByText('Dziecko', { exact: true })).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'Andrii Koval' }),
    ).toHaveAttribute('href', '/main/clients/2')

    await page.getByRole('button', { name: 'Dodaj powiązanie' }).click()

    await page
        .getByRole('dialog')
        .getByRole('combobox', { name: 'Członek rodziny' })
        .click()

    await expect(page.getByRole('option', { name: 'Olena Koval' })).toHaveCount(
        0,
    )

    await expect(
        page.getByRole('option', { name: 'Andrii Koval' }),
    ).toBeVisible()
})

test('case creation sends chosen full process template', async ({ page }) => {
    const writes = await setup(page)

    await page.goto('/main/clients/1')

    await page
        .getByRole('button', { name: 'Dodaj sprawę', exact: true })
        .click()

    const dialog = page.getByRole('dialog')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Szablon sprawy', exact: true }),
        '1',
    )

    await expect(
        dialog.getByLabel('Nazwa sprawy', { exact: true }),
    ).toHaveValue('Pobyt czasowy')

    await dialog
        .locator('summary')
        .filter({ hasText: 'Dane sprawy i urzędu' })
        .click()

    await dialog
        .getByLabel('Urząd', { exact: true })
        .fill('Dolnośląski Urząd Wojewódzki')

    await dialog.getByLabel('Data złożenia', { exact: true }).fill('2026-10-16')

    await dialog
        .getByRole('button', { name: 'Dodaj sprawę', exact: true })
        .click()

    await expect
        .poll(
            () =>
                writes.find((item) => item.path === '/clients/1/processes')
                    ?.body.processTemplateId,
        )
        .toBe(1)

    expect(
        writes.find((item) => item.path === '/clients/1/processes')?.body
            .caseData,
    ).toEqual({
        office: 'Dolnośląski Urząd Wojewódzki',
        submittedAt: '2026-10-16',
    })
})

test('sender-only role opens mail and does not expose client navigation', async ({
    page,
}) => {
    await setup(page, { senderOnly: true })

    await page.goto('/main')

    await expect(page).toHaveURL('/main/mail')

    await expect(
        page.getByRole('heading', { name: 'Napisz wiadomość' }),
    ).toBeVisible()

    const menu = page.getByRole('button', { name: 'Otwórz menu', exact: true })

    if (await menu.isVisible()) await menu.click()

    await expect(
        page.getByRole('link', { name: 'Dodaj klienta', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('link', { name: 'Klienci', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('link', { name: 'Rozsyłki', exact: true }),
    ).toBeVisible()
})

test('administrator manages ordered case templates and document reminder defaults', async ({
    page,
}, testInfo) => {
    const writes = await setup(page, { admin: true })

    await page.goto('/main/management/processes')

    await expect(
        page.getByRole('heading', { name: 'Pobyt czasowy', exact: true }),
    ).toBeVisible()

    mkdirSync('/tmp/atimi-frontend-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/processes-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await page
        .getByRole('button', { name: 'Dodaj szablon', exact: true })
        .click()

    let dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Nazwa szablonu', { exact: true })
        .fill('Rezydent UE')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Dodaj etap', exact: true }),
        '2',
    )

    await dialog.getByRole('button', { name: 'Dodaj wybrany etap' }).click()

    await selectOption(
        dialog.getByRole('combobox', { name: 'Dodaj etap', exact: true }),
        '3',
    )

    await dialog.getByRole('button', { name: 'Dodaj wybrany etap' }).click()

    await dialog.getByRole('button', { name: 'Przesuń etap 2 w górę' }).click()

    await expect
        .poll(() =>
            dialog.evaluate(
                (element) => element.scrollWidth <= element.clientWidth,
            ),
        )
        .toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/process-editor-polished-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await dialog.getByRole('button', { name: 'Zapisz szablon' }).click()

    await expect
        .poll(
            () =>
                writes.find((item) => item.path === '/process-templates')?.body
                    .stageTemplateIds,
        )
        .toEqual([3, 2])

    await page.goto('/main/management/document-cards')

    await expect(
        page.getByRole('heading', { name: 'Karta pobytu czasowego' }),
    ).toBeVisible()

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/card-types-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await page.getByRole('button', { name: 'Ustaw przypomnienia' }).click()

    dialog = page.getByRole('dialog')

    await dialog.getByLabel('Inny termin (miesiące)').fill('6')

    await dialog.getByRole('button', { name: 'Dodaj termin' }).click()

    await dialog
        .getByLabel('Godzina przypomnienia (Europe/Warsaw)')
        .fill('10:30')

    await dialog
        .getByLabel('Dodatkowy adres e-mail')
        .fill('office@example.test')

    await dialog.getByRole('button', { name: 'Zapisz ustawienia' }).click()

    await expect
        .poll(
            () =>
                writes.find((item) => item.path === '/document-card-types/1')
                    ?.body,
        )
        .toEqual({
            reminderMonths: [6, 3, 2, 1],
            reminderTime: '10:30',
            notificationEmail: 'office@example.test',
        })
})

test('employee creation offers Doradca and Sender by default and supports Sender only', async ({
    page,
}) => {
    const writes = await setup(page, { admin: true })

    await page.goto('/main/managers')

    await page
        .getByRole('button', { name: /Dodaj pracownika|Nowy pracownik/ })
        .click()

    const dialog = page.getByRole('dialog')

    await expect(
        dialog.getByRole('checkbox', { name: 'Doradca' }),
    ).toBeChecked()

    await expect(dialog.getByRole('checkbox', { name: 'Sender' })).toBeChecked()

    await dialog.getByRole('checkbox', { name: 'Doradca' }).uncheck()

    await dialog.getByLabel('Imię', { exact: true }).fill('Mail')

    await dialog.getByLabel('Nazwisko', { exact: true }).fill('Sender')

    await dialog
        .getByLabel('Email', { exact: true })
        .fill('sender@example.test')

    await dialog
        .getByLabel('Hasło początkowe', { exact: true })
        .fill('TestPassword123!')

    await dialog
        .getByLabel('Powtórz hasło', { exact: true })
        .fill('TestPassword123!')

    await dialog
        .getByRole('button', { name: 'Utwórz konto', exact: true })
        .click()

    await expect
        .poll(
            () =>
                writes.find((item) => item.path === '/manager-auth/managers')
                    ?.body.roleNames,
        )
        .toEqual(['sender'])
})

test('legalization profile layout remains within mobile and desktop viewport', async ({
    page,
}, testInfo) => {
    await setup(page)

    await page.goto('/main/clients/1')

    await page.getByRole('button', { name: 'Legalizacja', exact: true }).click()

    await expect(
        page.getByRole('heading', { name: 'Dane do legalizacji', exact: true }),
    ).toBeVisible()

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/legalization-${testInfo.project.name}.png`,
        fullPage: true,
    })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)
})

test('duplicate warnings do not block saving and activity/mail histories remain readable', async ({
    page,
}) => {
    const writes = await setup(page)

    await page.route('**/clients/duplicates*', (route) =>
        route.fulfill({
            json: {
                rows: [
                    {
                        id: 2,
                        name: 'Andrii',
                        surname: 'Koval',
                        managerId: 1,
                        archivedAt: null,
                        canEdit: true,
                        matchedFields: ['pesel'],
                    },
                ],
                total: 1,
                limit: 20,
                page: 1,
                offset: 0,
            },
            headers: { 'Access-Control-Allow-Origin': '*' },
        }),
    )

    await page.route('**/clients/1/activity*', (route) =>
        route.fulfill({
            json: {
                rows: [
                    {
                        id: 1,
                        clientId: 1,
                        managerId: 1,
                        action: 'PATCH /clients/:id/legalization',
                        fields: ['pesel'],
                        createdAt: timestamps.createdAt,
                        manager: { id: 1, name: 'Anna', surname: 'Nowak' },
                    },
                ],
                total: 1,
                page: 1,
                limit: 20,
                offset: 0,
            },
            headers: { 'Access-Control-Allow-Origin': '*' },
        }),
    )

    await page.route('**/clients/1/mail/history*', (route) =>
        route.fulfill({
            json: {
                rows: [
                    {
                        id: 1,
                        clientId: 1,
                        managerId: 1,
                        to: 'olena@example.test',
                        fromEmail: 'app@atlantis.info.pl',
                        account: 'default',
                        template: 'classic',
                        subject: 'Dokumenty do wniosku',
                        text: 'Prosimy o dokumenty.',
                        status: 'sent',
                        attachments: [{ filename: 'Lista.pdf' }],
                        sentAt: timestamps.createdAt,
                        createdAt: timestamps.createdAt,
                    },
                ],
                total: 1,
                page: 1,
                limit: 20,
                offset: 0,
            },
            headers: { 'Access-Control-Allow-Origin': '*' },
        }),
    )

    await page.goto('/main/clients/1')

    await page.getByRole('button', { name: 'Legalizacja', exact: true }).click()

    await page.getByRole('button', { name: 'Edytuj dane', exact: true }).click()

    const dialog = page.getByRole('dialog')

    await expect(dialog.getByRole('status')).toContainText('Możliwy duplikat')

    await expect(
        dialog.getByRole('link', { name: 'Andrii Koval' }),
    ).toHaveAttribute('href', '/main/clients/2')

    await dialog
        .getByRole('button', { name: 'Zapisz dane', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    await page
        .getByRole('button', { name: 'Historia zmian', exact: true })
        .click()

    await expect(
        page.getByRole('heading', { name: 'Zmieniono dane legalizacji' }),
    ).toBeVisible()

    await expect(page.getByText('Pola: PESEL')).toBeVisible()

    await page
        .getByRole('button', { name: 'Historia poczty', exact: true })
        .click()

    await page.getByText('Dokumenty do wniosku', { exact: true }).click()

    await expect(
        page.getByText('Prosimy o dokumenty.', { exact: true }),
    ).toBeVisible()

    expect(writes.filter((item) => item.path.endsWith('/mail/send'))).toEqual(
        [],
    )
})

test('case templates show readable stages, filter archives and keep manager actions read only', async ({
    page,
}, testInfo) => {
    await setup(page)

    const templates = [
        {
            id: 1,
            title: 'Pobyt czasowy — praca',
            description: 'Od zebrania dokumentów do odbioru decyzji.',
            stageTemplateIds: [2, 3, 77],
            isActive: true,
            ...timestamps,
        },
        {
            id: 2,
            title: 'Obywatelstwo polskie',
            description: 'Przygotowanie i obsługa sprawy.',
            stageTemplateIds: [2, 3],
            isActive: true,
            ...timestamps,
        },
        {
            id: 3,
            title: 'Poprzednia procedura',
            description: 'Szablon zachowany dla zespołu.',
            stageTemplateIds: [2],
            isActive: false,
            ...timestamps,
        },
    ]

    const requests: string[] = []

    await page.route('**/process-templates*', (route) => {
        const url = new URL(route.request().url())

        requests.push(url.search)

        const active = url.searchParams.get('isActive')

        const rows = templates.filter(
            (item) => active === null || String(item.isActive) === active,
        )

        return route.fulfill({
            json: { rows, total: rows.length, page: 1, limit: 100, offset: 0 },
            headers: { 'Access-Control-Allow-Origin': '*' },
        })
    })

    await page.route('**/stage-templates/77', (route) =>
        route.fulfill({
            json: {
                id: 77,
                title: 'Odbiór decyzji',
                isActive: true,
                color: '#508B77',
                iconId: null,
            },
            headers: { 'Access-Control-Allow-Origin': '*' },
        }),
    )

    await page.goto('/main/management/processes')

    const first = page.getByRole('article', { name: 'Pobyt czasowy — praca' })

    await expect(
        first.getByText('Odbiór decyzji', { exact: true }),
    ).toBeVisible()

    await expect(
        first
            .getByRole('list', { name: 'Kolejność etapów' })
            .getByRole('listitem'),
    ).toHaveCount(3)

    await expect(
        page.getByRole('button', { name: 'Dodaj szablon', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Edytuj szablon', exact: true }),
    ).toHaveCount(0)

    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
        )
        .toBe(true)

    mkdirSync('/tmp/atimi-frontend-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/atimi-frontend-shots/processes-polished-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await selectOption(
        page.getByRole('combobox', { name: 'Status szablonu', exact: true }),
        'false',
    )

    await expect(page.getByRole('article')).toHaveCount(1)

    await expect(
        page.getByRole('article', { name: 'Poprzednia procedura' }),
    ).toBeVisible()

    expect(requests.some((query) => query.includes('isActive=false'))).toBe(
        true,
    )
})

test('mail history requests only explicit pages after opening and restarts pagination for filters', async ({
    page,
}) => {
    await setup(page, { senderOnly: true })

    const requests: URL[] = []

    await page.route('**/mail/history*', (route) => {
        const url = new URL(route.request().url())

        requests.push(url)

        const number = Number(url.searchParams.get('page') ?? 1)

        const filtered = Boolean(url.searchParams.get('search'))

        const count = filtered || number === 2 ? 1 : 20

        const rows = Array.from({ length: count }, (_, index) => ({
            id: (number - 1) * 20 + index + 1,
            managerId: 1,
            to: 'customer@example.test',
            fromEmail: 'app@atlantis.info.pl',
            account: 'default',
            template: 'classic',
            subject: `Wniosek ${(number - 1) * 20 + index + 1}`,
            text: 'Treść testowej wiadomości.',
            status: 'sent',
            attachments: [],
            sentAt: timestamps.createdAt,
            createdAt: timestamps.createdAt,
        }))

        return route.fulfill({
            json: {
                rows,
                total: filtered ? 1 : 21,
                page: number,
                limit: 20,
                offset: (number - 1) * 20,
            },
            headers: { 'Access-Control-Allow-Origin': '*' },
        })
    })

    await page.goto('/main/mail')

    await expect(
        page.getByRole('heading', { name: 'Napisz wiadomość' }),
    ).toBeVisible()

    const history = page.getByRole('region', { name: 'Historia poczty' })

    await expect(
        history.getByRole('button', { name: 'Pokaż historię', exact: true }),
    ).toHaveAttribute('aria-expanded', 'false')

    await expect(page.getByTitle('Podgląd e-maila')).toBeVisible()

    expect(requests).toHaveLength(0)

    await history
        .getByRole('button', { name: 'Pokaż historię', exact: true })
        .click()

    await expect(history.getByText('Wniosek 20', { exact: true })).toBeVisible()

    expect(requests).toHaveLength(1)

    expect(requests[0].searchParams.get('limit')).toBe('20')

    await expect(history.getByText('Wniosek 21', { exact: true })).toHaveCount(
        0,
    )

    await history
        .getByRole('button', { name: 'Pokaż starsze wiadomości', exact: true })
        .click()

    await expect(history.getByText('Wniosek 21', { exact: true })).toBeVisible()

    expect(requests.map((url) => url.searchParams.get('page'))).toEqual([
        '1',
        '2',
    ])

    await history
        .getByRole('searchbox', { name: 'Szukaj w historii', exact: true })
        .fill('Wniosek')

    await expect
        .poll(() => requests.at(-1)?.searchParams.get('search'))
        .toBe('Wniosek')

    expect(requests.at(-1)?.searchParams.get('page')).toBe('1')

    await expect(history.getByText('Wniosek 21', { exact: true })).toHaveCount(
        0,
    )

    await history
        .getByRole('button', { name: 'Ukryj historię', exact: true })
        .click()

    await expect(history.getByRole('searchbox')).toHaveCount(0)
})
