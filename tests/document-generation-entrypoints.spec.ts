import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const time = {
    createdAt: '2026-10-17T08:00:00Z',
    updatedAt: '2026-10-17T08:00:00Z',
}

const mime =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function mockGeneration(
    page: Page,
    options: { clientFields?: boolean; stage?: boolean } = {},
) {
    const person = {
        id: 7,
        name: 'Jan',
        surname: 'Nowak',
        address: null as string | null,
        managerId: 1,
        sourceId: null,
        language: 'pl',
        status: 'active',
        priority: 'normal',
        preferredContactTime: null,
        archivedAt: null,
        ...time,
    }

    const manager = {
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
        ...time,
    }

    const template = {
        id: 2,
        name: 'Podsumowanie spotkania',
        description: 'Ustalenia i następne kroki',
        privateAssetId: 10,
        typeId: null,
        fields: options.clientFields
            ? ['client_name', 'client_address', 'meeting_summary']
            : ['company_name', 'meeting_summary'],
        isActive: true,
        ...time,
    }

    const process = {
        id: 8,
        clientId: 7,
        managerId: 1,
        title: 'Zakup mieszkania',
        status: 'active',
        completedAt: null,
        ...time,
    }

    const stage = {
        id: 9,
        clientProcessId: 8,
        stageTemplateId: null,
        title: 'Konsultacja',
        iconId: null,
        color: '#4676B4',
        assignedManagerId: null,
        sortKey: 1000,
        status: 'active',
        plannedAt: null,
        completedAt: null,
        ...time,
    }

    const generated: {
        id: number
        originalName: string
        bucket: string
        mimeType: string
        sizeBytes: number
        visibility: string
        createdByManagerId: number
        relPath: string
        createdAt: string
        updatedAt: string
    }[] = []

    const requests: Request[] = []

    const rows = (items: unknown[]) => ({
        rows: items,
        total: items.length,
        page: 1,
        limit: 20,
        offset: 0,
    })

    await page.addInitScript(() =>
        localStorage.setItem(
            'atimi:access_token',
            'document-generation-entrypoints-session',
        ),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        const method = request.method()

        const send = (body: unknown, status = 200) =>
            route.fulfill({
                json: body,
                status,
                headers: { 'access-control-allow-origin': '*' },
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

        requests.push(request)

        if (path === '/managers/me') return send(manager)

        if (path === '/document-upload-notifications' && method === 'GET')
            return send({ ...rows([]), unreadCount: 0 })

        if (path === '/clients/7/document-requests' && method === 'GET')
            return send(rows([]))

        if (path === '/managers') return send(rows([manager]))

        if (path === '/clients/7') {
            if (method === 'PATCH')
                Object.assign(person, request.postDataJSON())

            return send(person)
        }

        if (path === '/clients') return send(rows([person]))

        if (path === '/client-sources') return send(rows([]))

        if (path.startsWith('/calendars/'))
            return send({
                id: 11,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...time,
            })

        if (path === '/clients/7/processes')
            return send(rows(options.stage ? [process] : []))

        if (path === '/clients/7/processes/8/stages') return send(rows([stage]))

        if (path === '/document-templates') return send(rows([template]))

        if (path === '/document-templates/2') return send(template)

        if (
            path === '/document-templates/types' ||
            path === '/stage-templates' ||
            path === '/public-assets' ||
            path === '/task-types'
        )
            return send(rows([]))

        if (path === '/document-templates/fields')
            return send(
                rows([
                    {
                        id: 1,
                        key: 'meeting_summary',
                        label: 'Ustalenia ze spotkania',
                        defaultValue: 'Omówiono wymagania klienta.',
                    },
                ]),
            )

        if (path === '/document-templates/variables')
            return send([
                {
                    key: 'client_name',
                    label: 'Imię i nazwisko klienta',
                    clientField: 'name',
                },
                {
                    key: 'client_address',
                    label: 'Adres klienta',
                    clientField: 'address',
                },
                { key: 'company_name', label: 'Nazwa firmy' },
            ])

        if (path === '/document-templates/2/preview') {
            const dto: { clientId?: number; values?: Record<string, string> } =
                request.postDataJSON()

            const automatic: Record<string, string> = {
                company_name: 'Firma testowa',
                client_name: dto.clientId ? 'Jan Nowak' : '',
                client_address: dto.clientId ? (person.address ?? '') : '',
            }

            const fields = template.fields.map((key) => {
                const isClient = key.startsWith('client_')

                const custom = key === 'meeting_summary'

                const missing = isClient && !automatic[key]

                const value =
                    dto.values?.[key] ??
                    (custom ? 'Omówiono wymagania klienta.' : automatic[key]) ??
                    ''

                return {
                    key,
                    label:
                        key === 'meeting_summary'
                            ? 'Ustalenia ze spotkania'
                            : key === 'client_address'
                              ? 'Adres klienta'
                              : key === 'client_name'
                                ? 'Imię i nazwisko klienta'
                                : 'Nazwa firmy',
                    value,
                    source: custom ? 'custom' : 'system',
                    required: custom || isClient,
                    missing: !value.trim(),
                    editable: custom || missing,
                    profileMissing: missing,
                    ...(isClient
                        ? {
                              clientField:
                                  key === 'client_address' ? 'address' : 'name',
                          }
                        : {}),
                }
            })

            const missingKeys = fields
                .filter((f) => f.required && f.missing)
                .map((f) => f.key)

            return send(
                {
                    templateId: 2,
                    requiresClient: !!options.clientFields,
                    canGenerate:
                        !missingKeys.length &&
                        (!options.clientFields || !!dto.clientId),
                    fields,
                    missingKeys,
                    missingClientKeys: fields
                        .filter((f) => f.profileMissing)
                        .map((f) => f.key),
                },
                201,
            )
        }

        if (path === '/document-templates/2/generate') {
            const dto: {
                originalName: string
                clientId?: number
                clientStageId?: number
                values: Record<string, string>
            } = request.postDataJSON()

            const result = {
                id: 100 + generated.length,
                originalName: dto.originalName,
                bucket: dto.clientId ? 'client_documents' : 'manager_documents',
                mimeType: mime,
                sizeBytes: 2048,
                visibility: dto.clientId ? 'team' : 'author',
                createdByManagerId: 1,
                relPath: 'generated.docx',
                ...time,
            }

            generated.push(result)

            return send(result, 201)
        }

        if (path === '/private-assets') return send(rows(generated))

        if (
            path === '/clients/7/documents' ||
            path === '/clients/7/processes/8/stages/9/documents'
        )
            return send(
                rows(
                    generated.map((asset) => ({
                        id: asset.id,
                        clientId: 7,
                        clientStageId: 9,
                        privateAssetId: asset.id,
                        title: asset.originalName,
                        category: null,
                        asset,
                        ...time,
                    })),
                ),
            )

        if (
            /^\/clients\/7\/(contacts|notes|preferences)$/.test(path) ||
            /^\/clients\/7\/processes\/8\/stages\/9\/(tasks|notes|reminders|deadlines)$/.test(
                path,
            )
        )
            return send(rows([]))

        return send({ message: `Unexpected endpoint ${method} ${path}` }, 404)
    })

    return { person, requests, generated }
}

async function chooseTemplate(page: Page) {
    await page
        .getByRole('button', { name: 'Generuj z szablonu', exact: true })
        .click()

    await page.getByRole('button', { name: /Podsumowanie spotkania/ }).click()
}

async function capture(page: Page, name: string) {
    mkdirSync('/tmp/atimi-document-generation-shots', { recursive: true })

    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
        )
        .toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-document-generation-shots/${name}.png`,
        fullPage: true,
    })
}

test('client generation asks about missing data and inline value changes only the document', async ({
    page,
}, info) => {
    const state = await mockGeneration(page, { clientFields: true })

    await page.goto('/main/clients/7')

    await page.getByRole('button', { name: 'Dokumenty', exact: true }).click()

    await page
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await chooseTemplate(page)

    await expect(
        page.getByRole('region', { name: 'Brakujące dane automatyczne' }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Generuj dokument', exact: true }),
    ).toBeDisabled()

    await page
        .getByLabel('Adres klienta', { exact: true })
        .fill('ul. Testowa 12, Warszawa')

    await page
        .getByLabel('Ustalenia ze spotkania', { exact: true })
        .fill('Przygotować dokumenty do piątku.')

    await capture(page, `client-missing-${info.project.name}`)

    await page
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        page.getByRole('dialog', { name: 'Dokument gotowy', exact: true }),
    ).toBeVisible()

    const dto = state.requests
        .find((r) => new URL(r.url()).pathname.endsWith('/generate'))
        ?.postDataJSON()

    expect(dto.clientId).toBe(7)

    expect(dto.values).toEqual({
        meeting_summary: 'Przygotować dokumenty do piątku.',
    })

    expect(dto.systemValues).toEqual({
        client_address: 'ul. Testowa 12, Warszawa',
    })

    expect(state.person.address).toBeNull()

    expect(state.requests.some((r) => r.method() === 'PATCH')).toBe(false)

    await page.getByRole('button', { name: 'Gotowe', exact: true }).click()

    await expect(
        page
            .getByRole('region', { name: 'Dokumenty klienta' })
            .getByText(state.generated[0].originalName, { exact: true }),
    ).toBeVisible()
})

test('missing client data stays inline without navigation or changes to the client record', async ({
    page,
}) => {
    const state = await mockGeneration(page, { clientFields: true })

    await page.goto('/main/clients/7')

    await page.getByRole('button', { name: 'Dokumenty', exact: true }).click()

    await page
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await chooseTemplate(page)

    await expect(
        page.getByRole('button', { name: 'Uzupełnij kartę klienta' }),
    ).toHaveCount(0)

    await page
        .getByLabel('Ustalenia ze spotkania', { exact: true })
        .fill('Zachowane ustalenia')

    await page
        .getByLabel('Nazwa dokumentu', { exact: true })
        .fill('Dokument po uzupełnieniu')

    await page.getByLabel('Adres klienta', { exact: true }).fill('   ')

    await expect(
        page.getByRole('button', { name: 'Generuj dokument', exact: true }),
    ).toBeDisabled()

    await page
        .getByLabel('Adres klienta', { exact: true })
        .fill('Adres tylko w dokumencie')

    await page
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        page.getByRole('dialog', { name: 'Dokument gotowy', exact: true }),
    ).toBeVisible()

    await expect(page).toHaveURL(/\/main\/clients\/7$/)

    const dto = state.requests
        .find((r) => new URL(r.url()).pathname.endsWith('/generate'))
        ?.postDataJSON()

    expect(dto.values).toEqual({ meeting_summary: 'Zachowane ustalenia' })

    expect(dto.systemValues).toEqual({
        client_address: 'Adres tylko w dokumencie',
    })

    expect(state.person.address).toBeNull()

    expect(
        state.requests.some((r) => ['PATCH', 'PUT'].includes(r.method())),
    ).toBe(false)
})
