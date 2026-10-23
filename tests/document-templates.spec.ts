import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { selectOption } from './helpers/select-option'
import type { Manager } from '../src/api/managers/managers.types'
import type { Client } from '../src/api/clients/clients.types'
import {
    PrivateBucket,
    type PrivateAsset,
} from '../src/api/private-assets/private-assets.types'
import type {
    CreateDocumentTemplateDto,
    DocumentType,
    DocumentField,
    DocumentTemplate,
    DocumentTemplateVariable,
    GenerateDocumentDto,
    UpdateDocumentTemplateDto,
} from '../src/api/document-templates/document-templates.types'

const session = 'document-templates-test-session'

const mime =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const timestamps = {
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
}

const admin: Manager = {
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

const variables: DocumentTemplateVariable[] = [
    {
        source: 'system',
        group: 'company',
        key: 'company_name',
        label: 'Nazwa firmy',
    },
    {
        source: 'system',
        group: 'manager',
        key: 'manager_name',
        label: 'Imię i nazwisko pracownika',
    },
    {
        source: 'system',
        group: 'manager',
        key: 'manager_email',
        label: 'Email pracownika',
    },
    {
        source: 'system',
        group: 'client',
        key: 'client_name',
        label: 'Imię i nazwisko klienta',
    },
    { source: 'system', group: 'date', key: 'date', label: 'Dzisiejsza data' },
]

function asset(
    id: number,
    originalName: string,
    changes: Partial<PrivateAsset> = {},
): PrivateAsset {
    return {
        id,
        bucket: PrivateBucket.DOCUMENT_TEMPLATES,
        originalName,
        relPath: `2026/10/source-${id}.docx`,
        mimeType: mime,
        sizeBytes: 2000,
        visibility: 'team',
        createdByManagerId: 1,
        ...timestamps,
        ...changes,
    }
}

function template(
    id: number,
    name: string,
    changes: Partial<DocumentTemplate> = {},
): DocumentTemplate {
    return {
        id,
        name,
        description: 'Dokument z danymi firmy, pracownika i klienta.',
        privateAssetId: id,
        fields: [
            'company_name',
            'manager_name',
            'client_name',
            'property_address',
            'commission',
        ],
        isActive: true,
        ...timestamps,
        ...changes,
    }
}

function client(id: number, name: string, surname: string): Client {
    return {
        id,
        name,
        surname,
        managerId: 1,
        isPrivate: true,
        sourceId: null,
        language: 'pl',
        address: null,
        preferredContactTime: null,
        status: 'active',
        priority: 'normal',
        paymentStatus: 'unpaid',
        archivedAt: null,
        ...timestamps,
    }
}

interface DocumentTemplateMock {
    manager: Manager
    types: DocumentType[]
    fields: DocumentField[]
    templates: DocumentTemplate[]
    assets: PrivateAsset[]
    clients: Client[]
    generated: PrivateAsset[]
    requests: Request[]
    failList: boolean
    failCreate: number
    failUpload: number
    failGenerate: number
    failInspect: number
    sourceKeys: string[]
    protectCleanup: boolean
    missingAutomatic?: boolean
    generateGate?: Promise<void>
}

function list<T>(url: URL, rows: T[]) {
    const page = Number(url.searchParams.get('page') ?? 1)

    const limit = Number(url.searchParams.get('limit') ?? 20)

    const offset = Number(url.searchParams.get('offset') ?? (page - 1) * limit)

    return {
        rows: rows.slice(offset, offset + limit),
        total: rows.length,
        page,
        limit,
        offset,
    }
}

async function mockTemplates(page: Page): Promise<DocumentTemplateMock> {
    const state: DocumentTemplateMock = {
        manager: admin,
        types: [],
        fields: [
            {
                id: 1,
                key: 'property_address',
                label: 'property address',
                defaultValue: null,
            },
            {
                id: 2,
                key: 'commission',
                label: 'commission',
                defaultValue: null,
            },
        ],
        templates: [
            template(1, 'Umowa pośrednictwa'),
            template(2, 'Protokół prezentacji', {
                fields: ['company_name', 'date', 'property_address'],
            }),
            template(3, 'Stara umowa', { isActive: false }),
        ],
        assets: [
            asset(1, 'Umowa bazowa'),
            asset(2, 'Protokół bazowy.docx'),
            asset(3, 'Archiwum.docx'),
        ],
        clients: [client(11, 'Jan', 'Nowak'), client(12, 'Ewa', 'Wiśniewska')],
        generated: [],
        requests: [],
        failList: false,
        failCreate: 0,
        failUpload: 0,
        failGenerate: 0,
        failInspect: 0,
        sourceKeys: ['company_name', 'property_address'],
        protectCleanup: false,
    }

    await page.addInitScript((token) => {
        localStorage.setItem('atimi:access_token', token)
    }, session)

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        const method = request.method()

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

        const send = (body: unknown, status = 200) =>
            route.fulfill({ status, json: body })

        if (path === '/managers/me') return send(state.manager)

        if (path === '/document-templates/variables') return send(variables)

        if (path === '/document-templates/analyze') {
            if (state.failInspect > 0) {
                state.failInspect--

                return send({ message: 'Analysis unavailable' }, 503)
            }

            const fields = state.sourceKeys.map((key) => {
                const system = variables.find((field) => field.key === key)

                const custom = state.fields.find((field) => field.key === key)

                return {
                    key,
                    label: system?.label ?? custom?.label ?? key,
                    source: system ? 'system' : custom ? 'custom' : 'unknown',
                    group: system?.group ?? (custom ? 'custom' : 'unknown'),
                    ...(!system && !custom
                        ? {
                              suggestions:
                                  key === 'company_nam' ? [variables[0]] : [],
                          }
                        : {}),
                }
            })

            const unknownKeys = fields
                .filter((field) => field.source === 'unknown')
                .map((field) => field.key)

            return send({
                keys: state.sourceKeys,
                fields,
                unknownKeys,
                canCreate: !unknownKeys.length,
            })
        }

        if (path === '/document-templates/types') {
            if (method === 'GET') return send(list(url, state.types))

            const dto: { name: string; description?: string } =
                request.postDataJSON()

            const saved = {
                id: state.types.length + 1,
                name: dto.name,
                description: dto.description ?? null,
                isActive: true,
            }

            state.types.push(saved)

            return send(saved, 201)
        }

        if (path === '/document-templates/fields') {
            if (method === 'GET') return send(list(url, state.fields))

            const dto: { key: string; label: string; defaultValue?: string } =
                request.postDataJSON()

            const saved = {
                id: state.fields.length + 1,
                ...dto,
                defaultValue: dto.defaultValue ?? null,
            }

            state.fields.push(saved)

            return send(saved, 201)
        }

        const catalogRoute =
            /^\/document-templates\/(types|fields)\/(\d+)$/.exec(path)

        if (catalogRoute) {
            const rows =
                catalogRoute[1] === 'types' ? state.types : state.fields

            const row = rows.find((item) => item.id === Number(catalogRoute[2]))

            if (!row) return send({ message: 'Not found' }, 404)

            Object.assign(row, request.postDataJSON())

            return send(row)
        }

        const previewRoute = /^\/document-templates\/(\d+)\/preview$/.exec(path)

        if (previewRoute) {
            const saved = state.templates.find(
                (row) => row.id === Number(previewRoute[1]),
            )

            if (!saved) return send({ message: 'Not found' }, 404)

            const dto: { clientId?: number } = request.postDataJSON()

            const person = state.clients.find((row) => row.id === dto.clientId)

            const automatic: Record<string, string> = {
                company_name: state.missingAutomatic ? '' : 'Firma testowa',
                manager_name: `${state.manager.name} ${state.manager.surname}`,
                client_name: person ? `${person.name} ${person.surname}` : '',
                date: '16.10.2026',
            }

            return send(
                {
                    templateId: saved.id,
                    requiresClient: saved.fields.includes('client_name'),
                    canGenerate: false,
                    missingKeys: [],
                    fields: saved.fields.map((key) => ({
                        key,
                        label:
                            variables.find((field) => field.key === key)
                                ?.label ??
                            state.fields.find((field) => field.key === key)
                                ?.label ??
                            key.replace(/_/g, ' '),
                        value:
                            automatic[key] ??
                            state.fields.find((field) => field.key === key)
                                ?.defaultValue ??
                            '',
                        source: variables.some((field) => field.key === key)
                            ? 'system'
                            : 'custom',
                        group:
                            variables.find((field) => field.key === key)
                                ?.group ?? 'custom',
                        profileMissing:
                            variables.some((field) => field.key === key) &&
                            !automatic[key],
                        editable:
                            !variables.some((field) => field.key === key) ||
                            !automatic[key],
                        required: true,
                        missing: false,
                    })),
                },
                201,
            )
        }

        const withAsset = (row: DocumentTemplate) => ({
            ...row,
            asset: state.assets.find((item) => item.id === row.privateAssetId),
        })

        if (path === '/document-templates') {
            if (method === 'GET') {
                if (state.failList) return send({ message: 'Unavailable' }, 503)

                const search = url.searchParams.get('search')?.toLowerCase()

                const active = url.searchParams.get('isActive')

                return send(
                    list(
                        url,
                        state.templates
                            .filter(
                                (row) =>
                                    (!search ||
                                        row.name
                                            .toLowerCase()
                                            .includes(search)) &&
                                    (active === null ||
                                        row.isActive === (active === 'true')),
                            )
                            .map(withAsset),
                    ),
                )
            }

            if (method === 'POST') {
                if (state.failCreate > 0) {
                    state.failCreate--

                    return send({ message: 'Template unavailable' }, 503)
                }

                const dto: CreateDocumentTemplateDto = request.postDataJSON()

                const saved = template(100 + state.templates.length, dto.name, {
                    description: dto.description ?? null,
                    privateAssetId: dto.privateAssetId,
                    typeId: dto.typeId ?? null,
                    fields: state.sourceKeys,
                })

                state.templates.unshift(saved)

                return send(withAsset(saved), 201)
            }
        }

        const templateRoute = /^\/document-templates\/(\d+)(\/generate)?$/.exec(
            path,
        )

        if (templateRoute) {
            const saved = state.templates.find(
                (row) => row.id === Number(templateRoute[1]),
            )

            if (!saved) return send({ message: 'Not found' }, 404)

            if (templateRoute[2]) {
                if (state.generateGate) await state.generateGate

                if (state.failGenerate > 0) {
                    state.failGenerate--

                    return send({ message: 'Generation unavailable' }, 503)
                }

                const dto: GenerateDocumentDto = request.postDataJSON()

                const generated = asset(
                    200 + state.generated.length,
                    dto.originalName,
                    {
                        bucket: dto.clientId
                            ? PrivateBucket.CLIENT_DOCUMENTS
                            : PrivateBucket.MANAGER_DOCUMENTS,
                        visibility: dto.clientId ? 'team' : 'author',
                        createdByManagerId: state.manager.id,
                    },
                )

                state.generated.push(generated)

                state.assets.push(generated)

                return send(generated, 201)
            }

            if (method === 'PATCH') {
                const dto: UpdateDocumentTemplateDto = request.postDataJSON()

                Object.assign(saved, dto)
            }

            return send(withAsset(saved))
        }

        if (path === '/clients') {
            const search = url.searchParams.get('search')?.toLowerCase()

            return send(
                list(
                    url,
                    state.clients.filter(
                        (row) =>
                            !search ||
                            `${row.name} ${row.surname}`
                                .toLowerCase()
                                .includes(search),
                    ),
                ),
            )
        }

        const clientRoute = /^\/clients\/(\d+)$/.exec(path)

        if (clientRoute)
            return send(
                state.clients.find((row) => row.id === Number(clientRoute[1])),
            )

        if (path === '/private-assets' && method === 'POST') {
            if (state.failUpload > 0) {
                state.failUpload--

                return send({ message: 'Upload unavailable' }, 503)
            }

            const originalName = /name="originalName"\r\n\r\n([^\r\n]+)/.exec(
                request.postData() ?? '',
            )?.[1]

            const saved = asset(100 + state.assets.length, originalName ?? '')

            state.assets.unshift(saved)

            return send(saved, 201)
        }

        const assetRoute = /^\/private-assets\/(\d+)(\/file)?$/.exec(path)

        if (assetRoute) {
            const id = Number(assetRoute[1])

            const saved = state.assets.find((row) => row.id === id)

            if (!saved) return send({ message: 'Not found' }, 404)

            if (assetRoute[2]) {
                expect(request.headers().authorization).toBe(
                    `Bearer ${session}`,
                )

                return route.fulfill({
                    body: 'PK\x03\x04docx-generated',
                    contentType: mime,
                })
            }

            if (method === 'DELETE') {
                if (state.protectCleanup)
                    return send({ message: 'Record in use' }, 409)

                state.assets = state.assets.filter((row) => row.id !== id)

                return send({ success: true })
            }

            return send(saved)
        }

        return send({ message: 'Unexpected document template request' }, 404)
    })

    return state
}

function requests(state: DocumentTemplateMock, path: string, method: string) {
    return state.requests.filter(
        (request) =>
            new URL(request.url()).pathname === path &&
            request.method() === method,
    )
}

async function openTemplate(page: Page, name = 'Umowa pośrednictwa') {
    await page.goto('/main/management/document-templates')

    await page
        .getByRole('button', { name: `Otwórz szablon ${name}`, exact: true })
        .click()

    return page.getByRole('dialog', { name, exact: true })
}

async function screenshot(page: Page, name: string) {
    mkdirSync('/tmp/atimi-document-templates-shots', { recursive: true })

    expect(
        await page.evaluate(
            () => window.document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-document-templates-shots/${name}.png`,
        animations: 'disabled',
    })
}

async function uploadFile(
    page: Page,
    name = 'umowa.docx',
    contents = 'PK\x03\x04docx-original',
) {
    await page
        .getByLabel('Plik DOCX', { exact: true })
        .setInputFiles({ name, mimeType: mime, buffer: Buffer.from(contents) })
}

test('document template details distinguish automatic and custom variables and download original DOCX with authorization', async ({
    page,
}, info) => {
    const state = await mockTemplates(page)

    const dialog = await openTemplate(page)

    await expect(dialog).toContainText('Nazwa firmy')

    await expect(dialog).toContainText('property_address')

    await expect(
        dialog.getByRole('button', { name: 'Generuj dokument', exact: true }),
    ).toBeVisible()

    await screenshot(page, `template-details-${info.project.name}`)

    const download = page.waitForEvent('download')

    await dialog
        .getByRole('button', { name: 'Pobierz Umowa bazowa', exact: true })
        .click()

    expect((await download).suggestedFilename()).toBe('Umowa bazowa.docx')

    expect(requests(state, '/private-assets/1/file', 'GET')).toHaveLength(1)
})

test('admin upload validates DOCX size, preserves a custom file name after errors and reuses the upload on metadata retry', async ({
    page,
}, info) => {
    const state = await mockTemplates(page)

    await page.goto('/main/management/document-templates')

    await page
        .getByRole('button', { name: 'Dodaj szablon', exact: true })
        .click()

    const dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Nazwa szablonu', { exact: true })
        .fill('  Umowa rezerwacyjna  ')

    await dialog
        .getByLabel('Opis szablonu', { exact: true })
        .fill('Warunki rezerwacji lokalu.')

    await dialog.getByLabel('Plik DOCX', { exact: true }).setInputFiles({
        name: 'duzy.docx',
        mimeType: mime,
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    })

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('5 MB')

    expect(requests(state, '/private-assets', 'POST')).toHaveLength(0)

    await uploadFile(page, 'pierwszy.docx')

    await expect(dialog.getByLabel('Nazwa pliku', { exact: true })).toHaveValue(
        'pierwszy.docx',
    )

    await dialog
        .getByLabel('Nazwa pliku', { exact: true })
        .fill('  Wzór umowy rezerwacyjnej  ')

    await uploadFile(page, 'ostateczny.docx', 'PK\x03\x04original-final-docx')

    await expect(dialog.getByLabel('Nazwa pliku', { exact: true })).toHaveValue(
        '  Wzór umowy rezerwacyjnej  ',
    )

    await expect(dialog).toContainText('{company_name}')

    await expect(dialog).toContainText('Nazwa firmy')

    await screenshot(page, `template-form-${info.project.name}`)

    state.failUpload = 1

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    state.failCreate = 1

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await expect(dialog).toContainText('Pola odczytane z DOCX: 2')

    expect(requests(state, '/document-templates', 'POST')).toHaveLength(0)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(dialog.getByLabel('Nazwa pliku', { exact: true })).toHaveValue(
        '  Wzór umowy rezerwacyjnej  ',
    )

    const uploadCount = requests(state, '/private-assets', 'POST').length

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(
        page.getByRole('dialog', { name: 'Umowa rezerwacyjna', exact: true }),
    ).toBeVisible()

    expect(requests(state, '/private-assets', 'POST')).toHaveLength(uploadCount)

    expect(
        requests(state, '/document-templates', 'POST').at(-1)?.postDataJSON(),
    ).toEqual({
        name: 'Umowa rezerwacyjna',
        description: 'Warunki rezerwacji lokalu.',
        privateAssetId: 103,
    })

    for (const request of requests(state, '/private-assets', 'POST')) {
        const body = request.postDataBuffer()!.toString()

        expect(body).toContain(
            'name="originalName"\r\n\r\nWzór umowy rezerwacyjnej\r\n',
        )

        expect(body).toContain('name="bucket"\r\n\r\ndocument_templates\r\n')

        expect(body).toContain('name="visibility"\r\n\r\nteam\r\n')

        expect(body).toContain('filename="ostateczny.docx"')

        expect(body).toContain('original-final-docx')
    }
})

test('metadata editing leaves the source file unchanged and archive/restore uses explicit confirmation without deleting files', async ({
    page,
}) => {
    const state = await mockTemplates(page)

    const dialog = await openTemplate(page)

    await dialog
        .getByRole('button', { name: 'Edytuj szablon', exact: true })
        .click()

    await dialog
        .getByLabel('Nazwa szablonu', { exact: true })
        .fill('Umowa pośrednictwa 2026')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    const updated = page.getByRole('dialog', {
        name: 'Umowa pośrednictwa 2026',
        exact: true,
    })

    await expect(updated).toBeVisible()

    const dto = requests(state, '/document-templates/1', 'PATCH')
        .at(-1)
        ?.postDataJSON()

    expect(dto).toMatchObject({ name: 'Umowa pośrednictwa 2026' })

    expect(dto).not.toHaveProperty('privateAssetId')

    expect(dto).not.toHaveProperty('fields')

    expect(requests(state, '/private-assets', 'POST')).toHaveLength(0)

    await updated
        .getByRole('button', { name: 'Archiwizuj szablon', exact: true })
        .click()

    expect(state.templates[0].isActive).toBe(true)

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Archiwizuj', exact: true })
        .click()

    await expect.poll(() => state.templates[0].isActive).toBe(false)

    await page
        .getByRole('button', { name: 'Zamknij okno', exact: true })
        .click()

    await page.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await page
        .getByRole('button', {
            name: 'Otwórz szablon Umowa pośrednictwa 2026',
            exact: true,
        })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Przywróć szablon', exact: true })
        .click()

    await expect.poll(() => state.templates[0].isActive).toBe(true)

    expect(
        state.requests.filter((request) => request.method() === 'DELETE'),
    ).toHaveLength(0)
})

test('manager generation requires a client and custom text while automatic data stay server-owned', async ({
    page,
}, info) => {
    const state = await mockTemplates(page)

    state.manager = { ...admin, roles: [{ id: 2, name: 'manager' }] }

    const dialog = await openTemplate(page)

    await expect(
        dialog.getByRole('button', {
            name: /Edytuj szablon|Archiwizuj szablon/,
        }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Dodaj szablon', exact: true }),
    ).toHaveCount(0)

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await dialog
        .getByLabel('Nazwa dokumentu', { exact: true })
        .fill('  Umowa dla Jana  ')

    await expect(
        dialog.getByLabel('property address', { exact: true }),
    ).toHaveAttribute('maxlength', '2000')

    await dialog
        .getByLabel('property address', { exact: true })
        .fill('ul. Długa 10, Kraków')

    await dialog.getByLabel('commission', { exact: true }).fill('2%')

    await expect(
        dialog.getByRole('button', { name: 'Generuj dokument', exact: true }),
    ).toBeDisabled()

    expect(
        requests(state, '/document-templates/1/generate', 'POST'),
    ).toHaveLength(0)

    await dialog.getByLabel('Szukaj klienta', { exact: true }).fill('Jan')

    await selectOption(dialog.getByLabel('Klient', { exact: true }), '11')

    await dialog.getByLabel('Szukaj klienta', { exact: true }).fill('Ewa')

    await expect
        .poll(() =>
            requests(state, '/clients', 'GET').some(
                (request) =>
                    new URL(request.url()).searchParams.get('search') === 'Ewa',
            ),
        )
        .toBe(true)

    await expect
        .poll(() => requests(state, '/clients/11', 'GET').length)
        .toBe(1)

    await expect(dialog.getByLabel('Klient', { exact: true })).toHaveText(
        'Jan Nowak',
    )

    await dialog.getByLabel('Klient', { exact: true }).click()

    await expect(
        page.getByRole('option', { name: 'Ewa Wiśniewska', exact: true }),
    ).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(dialog.getByLabel('Klient', { exact: true })).toHaveText(
        'Jan Nowak',
    )

    await dialog
        .getByLabel('Nazwa dokumentu', { exact: true })
        .scrollIntoViewIfNeeded()

    await screenshot(page, `template-generate-${info.project.name}`)

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .scrollIntoViewIfNeeded()

    await screenshot(page, `template-generate-fields-${info.project.name}`)

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    const ready = page.getByRole('dialog', {
        name: 'Dokument gotowy',
        exact: true,
    })

    await expect(ready).toBeVisible()

    await screenshot(page, `template-result-${info.project.name}`)

    expect(
        requests(state, '/document-templates/1/generate', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toEqual({
        originalName: 'Umowa dla Jana',
        clientId: 11,
        values: { property_address: 'ul. Długa 10, Kraków', commission: '2%' },
    })

    expect(state.generated[0]).toMatchObject({
        bucket: PrivateBucket.CLIENT_DOCUMENTS,
        visibility: 'team',
        createdByManagerId: 1,
    })

    await expect(
        ready.getByRole('link', { name: 'Otwórz klienta', exact: true }),
    ).toHaveAttribute('href', '/main/clients/11')

    const download = page.waitForEvent('download')

    await ready
        .getByRole('button', { name: 'Pobierz Umowa dla Jana', exact: true })
        .click()

    expect((await download).suggestedFilename()).toBe('Umowa dla Jana.docx')

    for (const request of requests(state, '/clients', 'GET'))
        expect(new URL(request.url()).searchParams.get('archived')).toBe(
            'false',
        )
})

test('optional client generation retries without losing values, blocks pending dismissal and stores a personal library document', async ({
    page,
}) => {
    const state = await mockTemplates(page)

    const dialog = await openTemplate(page, 'Protokół prezentacji')

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await dialog
        .getByLabel('Nazwa dokumentu', { exact: true })
        .fill('Protokół własny')

    await dialog
        .getByLabel('property address', { exact: true })
        .fill('ul. Zielona 4')

    state.failGenerate = 1

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(
        dialog.getByLabel('property address', { exact: true }),
    ).toHaveValue('ul. Zielona 4')

    let release = () => {}

    state.generateGate = new Promise<void>((resolve) => {
        release = resolve
    })

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno', exact: true }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    release()

    state.generateGate = undefined

    const ready = page.getByRole('dialog', {
        name: 'Dokument gotowy',
        exact: true,
    })

    await expect(ready).toBeVisible()

    expect(
        requests(state, '/document-templates/2/generate', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toEqual({
        originalName: 'Protokół własny',
        values: { property_address: 'ul. Zielona 4' },
    })

    expect(state.generated[0]).toMatchObject({
        bucket: PrivateBucket.MANAGER_DOCUMENTS,
        visibility: 'author',
    })

    await expect(
        ready.getByRole('link', { name: 'Otwórz bibliotekę', exact: true }),
    ).toHaveAttribute('href', '/main/documents')
})

test('list retry, search and pagination use server filters and archived templates cannot be generated', async ({
    page,
}) => {
    const state = await mockTemplates(page)

    state.templates = Array.from({ length: 46 }, (_, index) =>
        template(index + 1, `Szablon ${index + 1}`),
    )

    state.templates.push(
        template(99, 'Szablon archiwalny', { isActive: false }),
    )

    state.failList = true

    await page.goto('/main/management/document-templates')

    const region = page.getByRole('region', {
        name: 'Szablony dokumentów',
        exact: true,
    })

    await expect(region.getByRole('alert')).toBeVisible()

    state.failList = false

    await region
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await expect(
        region.getByRole('button', {
            name: 'Otwórz szablon Szablon 1',
            exact: true,
        }),
    ).toBeVisible()

    await region
        .getByRole('button', { name: 'Pokaż więcej szablonów', exact: true })
        .click()

    await expect(
        region.getByRole('button', {
            name: 'Otwórz szablon Szablon 21',
            exact: true,
        }),
    ).toBeVisible()

    await region
        .getByLabel('Szukaj szablonu', { exact: true })
        .fill('Szablon 46')

    await expect(
        region.getByRole('button', {
            name: 'Otwórz szablon Szablon 46',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        region.getByRole('button', {
            name: 'Otwórz szablon Szablon 1',
            exact: true,
        }),
    ).toHaveCount(0)

    await region.getByLabel('Szukaj szablonu', { exact: true }).fill('')

    await region.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await region
        .getByRole('button', {
            name: 'Otwórz szablon Szablon archiwalny',
            exact: true,
        })
        .click()

    await expect(
        page
            .getByRole('dialog')
            .getByRole('button', { name: 'Generuj dokument', exact: true }),
    ).toBeDisabled()

    expect(
        requests(state, '/document-templates', 'GET').some(
            (request) =>
                new URL(request.url()).searchParams.get('search') ===
                'Szablon 46',
        ),
    ).toBe(true)
})

test('cancel after template save failure cleans the unbound upload and leaves existing source documents intact', async ({
    page,
}) => {
    const state = await mockTemplates(page)

    state.failCreate = 1

    await page.goto('/main/management/document-templates')

    await page
        .getByRole('button', { name: 'Dodaj szablon', exact: true })
        .click()

    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Nazwa szablonu', { exact: true }).fill('Szkic')

    await uploadFile(page, 'szkic.docx')

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await expect
        .poll(() => requests(state, '/private-assets/103', 'DELETE').length)
        .toBe(1)

    expect(state.assets.find((row) => row.id === 103)).toBeUndefined()

    expect(state.assets.find((row) => row.id === 1)).toBeDefined()

    expect(state.templates).toHaveLength(3)
})

test('protected orphan cleanup leaves the asset and existing templates intact', async ({
    page,
}) => {
    const state = await mockTemplates(page)

    state.failCreate = 1

    state.protectCleanup = true

    await page.goto('/main/management/document-templates')

    await page
        .getByRole('button', { name: 'Dodaj szablon', exact: true })
        .click()

    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Nazwa szablonu', { exact: true }).fill('Szkic')

    await uploadFile(page, 'szkic.docx')

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await expect
        .poll(() => requests(state, '/private-assets/103', 'DELETE').length)
        .toBe(1)

    expect(state.assets.find((row) => row.id === 103)).toBeDefined()

    expect(state.templates).toHaveLength(3)

    expect(state.generated).toHaveLength(0)
})

test('admin configures labeled field defaults and generator previews automatic data without submitting overrides', async ({
    page,
}, info) => {
    const state = await mockTemplates(page)

    state.templates[1].fields = ['company_name', 'contract_city']

    await page.goto('/main/management/document-templates')

    await page
        .getByRole('button', { name: 'Rodzaje i pola dokumentów', exact: true })
        .click()

    const catalog = page.getByRole('dialog', {
        name: 'Katalog dokumentów',
        exact: true,
    })

    await catalog
        .getByRole('button', { name: 'Dodaj rodzaj', exact: true })
        .click()

    await catalog.getByLabel('Nazwa rodzaju', { exact: true }).fill('Umowy')

    await catalog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(catalog).toContainText('Umowy')

    await catalog
        .getByRole('button', { name: 'Katalog zmiennych', exact: true })
        .click()

    await catalog
        .getByRole('button', { name: 'Własne pola', exact: true })
        .click()

    await catalog
        .getByRole('button', { name: 'Dodaj pole', exact: true })
        .click()

    await catalog.getByLabel('Nazwa pola', { exact: true }).fill('Miasto umowy')

    await catalog
        .getByLabel('Klucz pola', { exact: true })
        .fill('contract_city')

    await catalog
        .getByLabel('Wartość domyślna', { exact: true })
        .fill('Warszawa')

    await catalog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(catalog).toContainText('Miasto umowy')

    await screenshot(page, `document-catalog-${info.project.name}`)

    await page.keyboard.press('Escape')

    const dialog = await openTemplate(page, 'Protokół prezentacji')

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        dialog.getByLabel('Miasto umowy', { exact: true }),
    ).toHaveValue('Warszawa')

    await expect(dialog).toContainText('Firma testowa')

    await dialog.getByLabel('Miasto umowy', { exact: true }).fill('Kraków')

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        page.getByRole('dialog', { name: 'Dokument gotowy', exact: true }),
    ).toBeVisible()

    expect(
        requests(state, '/document-templates/2/generate', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toMatchObject({ values: { contract_city: 'Kraków' } })

    expect(
        state.fields.find((field) => field.key === 'contract_city')
            ?.defaultValue,
    ).toBe('Warszawa')
})

test('catalog is searchable before template creation and unknown DOCX fields need explicit registration', async ({
    page,
}, info) => {
    const state = await mockTemplates(page)

    state.sourceKeys = ['company_nam', 'contract_number']

    await page.goto('/main/management/document-templates')

    await page
        .getByRole('button', { name: 'Katalog zmiennych', exact: true })
        .click()

    let dialog = page.getByRole('dialog')

    await dialog.getByLabel('Szukaj pola', { exact: true }).fill('firma')

    await expect(dialog).toContainText('Nazwa firmy')

    await expect(dialog).not.toContainText('Email pracownika')

    await dialog
        .getByRole('button', { name: 'Zamknij okno', exact: true })
        .click()

    await page
        .getByRole('button', { name: 'Dodaj szablon', exact: true })
        .click()

    dialog = page.getByRole('dialog')

    await dialog
        .getByLabel('Nazwa szablonu', { exact: true })
        .fill('Umowa z numerem')

    await uploadFile(page, 'umowa.docx')

    await expect(
        dialog.getByRole('button', { name: 'Zapisz', exact: true }),
    ).toBeDisabled()

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await expect(
        dialog.getByRole('region', { name: 'Pola potwierdzone w szablonie' }),
    ).toContainText('Podobne pola: Nazwa firmy {company_name}')

    await expect(
        dialog.getByRole('button', { name: 'Zapisz', exact: true }),
    ).toBeDisabled()

    expect(state.fields.some((field) => field.key === 'company_nam')).toBe(
        false,
    )

    state.sourceKeys = ['company_name', 'contract_number']

    await uploadFile(page, 'poprawiona-umowa.docx')

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await dialog
        .getByRole('button', {
            name: 'Utwórz własne pole {contract_number}',
            exact: true,
        })
        .click()

    await dialog
        .getByLabel('Nazwa nowego pola', { exact: true })
        .fill('Numer umowy')

    await dialog
        .getByLabel('Domyślna wartość nowego pola', { exact: true })
        .fill('2026/')

    await dialog
        .getByRole('button', { name: 'Zapisz pole w katalogu', exact: true })
        .click()

    await expect(dialog).toContainText('Wszystkie pola rozpoznane')

    await expect(
        dialog.getByRole('button', { name: 'Zapisz', exact: true }),
    ).toBeEnabled()

    const confirmed = dialog.getByRole('region', {
        name: 'Pola potwierdzone w szablonie',
    })

    await expect(confirmed).toContainText('Numer umowy')

    await screenshot(page, `template-analysis-${info.project.name}`)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(
        page.getByRole('dialog', { name: 'Umowa z numerem', exact: true }),
    ).toBeVisible()

    expect(
        state.fields.find((field) => field.key === 'contract_number'),
    ).toMatchObject({ label: 'Numer umowy', defaultValue: '2026/' })
})

test('replacement DOCX invalidates analysis and protects the previous source', async ({
    page,
}) => {
    const state = await mockTemplates(page)

    state.sourceKeys = ['company_name']

    const dialog = await openTemplate(page)

    await dialog
        .getByRole('button', { name: 'Edytuj szablon', exact: true })
        .click()

    await uploadFile(page, 'pierwsza.docx')

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await expect(
        dialog.getByRole('button', { name: 'Zapisz', exact: true }),
    ).toBeEnabled()

    await uploadFile(page, 'druga.docx')

    await expect(
        dialog.getByRole('button', { name: 'Zapisz', exact: true }),
    ).toBeDisabled()

    state.sourceKeys = ['client_name']

    await dialog
        .getByRole('button', { name: 'Analizuj DOCX', exact: true })
        .click()

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(
        dialog.getByRole('button', { name: 'Edytuj szablon', exact: true }),
    ).toBeVisible()

    expect(requests(state, '/private-assets/1', 'DELETE')).toHaveLength(0)

    expect(
        requests(state, '/document-templates/1', 'PATCH')
            .at(-1)
            ?.postDataJSON(),
    ).toHaveProperty('privateAssetId')
})

test('missing company data is filled inline only for this document and whitespace blocks generation', async ({
    page,
}, info) => {
    const state = await mockTemplates(page)

    state.missingAutomatic = true

    state.templates[1].fields = ['company_name', 'property_address']

    const dialog = await openTemplate(page, 'Protokół prezentacji')

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        dialog.getByLabel('Nazwa firmy', { exact: true }),
    ).toBeVisible()

    await dialog
        .getByLabel('property address', { exact: true })
        .fill('Warszawa')

    await dialog.getByLabel('Nazwa firmy', { exact: true }).fill('   ')

    await expect(
        dialog.getByRole('button', { name: 'Generuj dokument', exact: true }),
    ).toBeDisabled()

    await dialog.getByLabel('Nazwa firmy', { exact: true }).fill('Atlantis')

    await screenshot(page, `template-missing-inline-${info.project.name}`)

    await dialog
        .getByRole('button', { name: 'Generuj dokument', exact: true })
        .click()

    await expect(
        page.getByRole('dialog', { name: 'Dokument gotowy', exact: true }),
    ).toBeVisible()

    expect(
        requests(state, '/document-templates/2/generate', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toMatchObject({
        values: { property_address: 'Warszawa' },
        systemValues: { company_name: 'Atlantis' },
    })

    expect(
        state.requests.filter((request) =>
            ['PATCH', 'PUT'].includes(request.method()),
        ),
    ).toHaveLength(0)
})
