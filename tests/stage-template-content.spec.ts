import {
    test,
    expect,
    type Locator,
    type Page,
    type Request,
} from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'
import {
    PrivateBucket,
    type PrivateAsset,
} from '../src/api/private-assets/private-assets.types'
import {
    PublicBucket,
    type PublicAsset,
} from '../src/api/public-assets/public-assets.types'
import type { StageTemplate } from '../src/api/stage-templates/stage-templates.types'
import type { StageTemplateTask } from '../src/api/stage-template-tasks/stage-template-tasks.types'
import type { StageTemplateNote as Note } from '../src/api/stage-template-notes/stage-template-notes.types'
import type { StageTemplateDocument as Document } from '../src/api/stage-template-documents/stage-template-documents.types'
import type { TaskType } from '../src/api/task-types/task-types.types'

const session = 'stage-template-content-test-session'

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

const png = readFileSync('tests/fixtures/icons/house.png')

const icon: PublicAsset = {
    id: 150,
    bucket: PublicBucket.ICONS,
    relPath: '2026/10/icon.png',
    originalName: 'icon.png',
    mimeType: 'image/png',
    sizeBytes: png.length,
    isPopular: true,
    createdByManagerId: 1,
    ...timestamps,
}

const taskType: TaskType = {
    id: 3,
    name: 'Zadanie',
    iconId: icon.id,
    color: '#4676B4',
    reminderMinutes: [15],
    isActive: true,
    isDefault: true,
    ...timestamps,
}

const stage: StageTemplate = {
    id: 1,
    title: 'Analiza potrzeb',
    description: 'Szablon kopiowany do spraw klienta.',
    iconId: icon.id,
    color: '#4676B4',
    isActive: true,
    ...timestamps,
}

interface ContentMock {
    manager: Manager
    notes: Note[]
    documents: Document[]
    assets: PrivateAsset[]
    requests: Request[]
    failNotes: boolean
    failDocuments: boolean
    failNoteMutation: number
    failUpload: number
    failBinding: number
    protectCleanup: boolean
    noteGate?: Promise<void>
}

function note(id: number, body: string): Note {
    return { id, stageTemplateId: 1, body, ...timestamps }
}

function asset(
    id: number,
    originalName: string,
    changes: Partial<PrivateAsset> = {},
): PrivateAsset {
    return {
        id,
        bucket: PrivateBucket.CLIENT_DOCUMENTS,
        originalName,
        relPath: `2026/10/test-${id}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1200,
        visibility: 'team',
        createdByManagerId: 1,
        ...timestamps,
        ...changes,
    }
}

function document(id: number, title: string, privateAssetId = id): Document {
    return { id, stageTemplateId: 1, privateAssetId, title, ...timestamps }
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

async function mockContent(page: Page): Promise<ContentMock> {
    const state: ContentMock = {
        manager: admin,
        notes: [
            note(2, '<img src=x onerror="window.__unsafe = true"> Ustalenia'),
            note(1, 'Sprawdzić potrzeby i budżet klienta.'),
        ],
        documents: [document(1, 'Lista pytań')],
        assets: [
            asset(1, 'Lista pytań'),
            asset(2, 'Wspólny formularz', { createdByManagerId: 2 }),
            asset(3, 'Prywatny formularz', { visibility: 'author' }),
            asset(4, 'Dokument managera', {
                bucket: PrivateBucket.MANAGER_DOCUMENTS,
            }),
        ],
        requests: [],
        failNotes: false,
        failDocuments: false,
        failNoteMutation: 0,
        failUpload: 0,
        failBinding: 0,
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

        if (path === '/public-assets' && method === 'GET')
            return send(list(url, [icon]))

        if (path === '/public-assets/150') return send(icon)

        if (path === '/public-assets/150/file')
            return route.fulfill({ body: png, contentType: 'image/png' })

        if (path === '/task-types') return send(list(url, [taskType]))

        if (path === '/stage-templates') return send(list(url, [stage]))

        if (path === '/stage-templates/1') return send(stage)

        if (path === '/stage-templates/1/tasks') {
            const task: StageTemplateTask = {
                id: 1,
                stageTemplateId: 1,
                taskTypeId: taskType.id,
                title: 'Omówić oczekiwania',
                description: null,
                sortKey: 1000,
                taskType,
                ...timestamps,
            }

            return send(list(url, [task]))
        }

        const noteRoute = /^\/stage-templates\/1\/notes(?:\/(\d+))?$/.exec(path)

        if (noteRoute) {
            const id = noteRoute[1] ? Number(noteRoute[1]) : undefined

            if (method === 'GET') {
                if (state.failNotes)
                    return send({ message: 'Notes unavailable' }, 503)

                const search = url.searchParams.get('search')?.toLowerCase()

                return send(
                    list(
                        url,
                        state.notes.filter(
                            (row) =>
                                !search ||
                                row.body.toLowerCase().includes(search),
                        ),
                    ),
                )
            }

            if (state.noteGate) await state.noteGate

            if (state.failNoteMutation > 0) {
                state.failNoteMutation--

                return send({ message: 'Note unavailable' }, 503)
            }

            if (method === 'POST') {
                const dto: { body: string } = request.postDataJSON()

                const saved = note(100 + state.notes.length, dto.body)

                state.notes.unshift(saved)

                return send(saved, 201)
            }

            const saved = state.notes.find((row) => row.id === id)

            if (!saved) return send({ message: 'Not found' }, 404)

            if (method === 'PATCH') Object.assign(saved, request.postDataJSON())

            if (method === 'DELETE') {
                state.notes = state.notes.filter((row) => row.id !== id)

                return send({ success: true })
            }

            return send(saved)
        }

        const documentRoute =
            /^\/stage-templates\/1\/documents(?:\/(\d+)(\/file)?)?$/.exec(path)

        if (documentRoute) {
            const id = documentRoute[1] ? Number(documentRoute[1]) : undefined

            const saved = state.documents.find((row) => row.id === id)

            if (documentRoute[2]) {
                expect(request.headers().authorization).toBe(
                    `Bearer ${session}`,
                )

                if (!saved) return send({ message: 'Not found' }, 404)

                return route.fulfill({
                    body: '%PDF-1.4\n%%EOF',
                    contentType: 'application/pdf',
                    headers: {
                        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${saved.title}.pdf`)}`,
                    },
                })
            }

            if (method === 'GET') {
                if (state.failDocuments)
                    return send({ message: 'Documents unavailable' }, 503)

                const search = url.searchParams.get('search')?.toLowerCase()

                const rows = state.documents
                    .filter(
                        (row) =>
                            !search || row.title.toLowerCase().includes(search),
                    )
                    .map((row) => ({
                        ...row,
                        privateAsset: state.assets.find(
                            (item) => item.id === row.privateAssetId,
                        ),
                    }))

                return send(
                    id ? rows.find((row) => row.id === id) : list(url, rows),
                )
            }

            if (method === 'POST') {
                if (state.failBinding > 0) {
                    state.failBinding--

                    return send({ message: 'Binding failed' }, 503)
                }

                const dto: { title: string; privateAssetId: number } =
                    request.postDataJSON()

                const created = document(
                    100 + state.documents.length,
                    dto.title,
                    dto.privateAssetId,
                )

                state.documents.unshift(created)

                return send(created, 201)
            }

            if (!saved) return send({ message: 'Not found' }, 404)

            if (method === 'PATCH') Object.assign(saved, request.postDataJSON())

            if (method === 'DELETE') {
                state.documents = state.documents.filter((row) => row.id !== id)

                return send({ success: true })
            }

            return send(saved)
        }

        if (path === '/private-assets' && method === 'GET') {
            const query = url.searchParams

            return send(
                list(
                    url,
                    state.assets.filter(
                        (row) =>
                            (!query.get('bucket') ||
                                row.bucket === query.get('bucket')) &&
                            (!query.get('visibility') ||
                                row.visibility === query.get('visibility')) &&
                            (query.get('ownOnly') !== 'true' ||
                                row.createdByManagerId === state.manager.id) &&
                            (!query.get('search') ||
                                row.originalName
                                    .toLowerCase()
                                    .includes(
                                        query.get('search')!.toLowerCase(),
                                    )),
                    ),
                ),
            )
        }

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

        const assetRoute = /^\/private-assets\/(\d+)$/.exec(path)

        if (assetRoute) {
            const id = Number(assetRoute[1])

            const saved = state.assets.find((row) => row.id === id)

            if (!saved) return send({ message: 'Not found' }, 404)

            if (method === 'DELETE') {
                if (state.protectCleanup)
                    return send({ message: 'Record in use' }, 409)

                state.assets = state.assets.filter((row) => row.id !== id)

                return send({ success: true })
            }

            return send(saved)
        }

        return send({ message: 'Unexpected stage content request' }, 404)
    })

    return state
}

function requests(state: ContentMock, path: string, method: string) {
    return state.requests.filter(
        (request) =>
            new URL(request.url()).pathname === path &&
            request.method() === method,
    )
}

async function openDetails(page: Page) {
    await page.goto('/main/management/stages')

    await page
        .getByRole('button', {
            name: 'Otwórz etap Analiza potrzeb',
            exact: true,
        })
        .click()

    return page.getByRole('dialog', { name: 'Analiza potrzeb', exact: true })
}

async function menuAction(page: Page, region: Locator, action: string) {
    const trigger = region.getByRole('button', { name: /^Opcje / }).first()

    const label = await trigger.getAttribute('aria-label')

    await trigger.click()

    await page
        .getByRole('group', { name: `${label}: działania`, exact: true })
        .getByRole('button', { name: action, exact: true })
        .click()
}

async function assertCompact(page: Page, dialog: Locator) {
    await expect(
        dialog.locator(
            'input[type="date"], input[type="time"], input[type="datetime-local"]',
        ),
    ).toHaveCount(0)

    await expect(
        dialog.getByRole('checkbox', { name: /przypomn|bez godziny/i }),
    ).toHaveCount(0)

    expect(
        await page.evaluate(
            () => window.document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
}

async function screenshot(page: Page, name: string) {
    mkdirSync('/tmp/ivan-stage-template-content-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-stage-template-content-shots/${name}.png`,
        animations: 'disabled',
    })
}

test('default stage content renders as plain text, keeps existing tasks and downloads through the authorized nested route', async ({
    page,
}, info) => {
    const state = await mockContent(page)

    const dialog = await openDetails(page)

    const notes = dialog.getByRole('region', { name: 'Notatki domyślne' })

    const documents = dialog.getByRole('region', { name: 'Dokumenty domyślne' })

    await expect(
        notes.getByText(state.notes[0].body, { exact: true }),
    ).toBeVisible()

    await expect(notes.locator('img, script, iframe')).toHaveCount(0)

    expect(await page.evaluate(() => '__unsafe' in window)).toBe(false)

    await expect(
        dialog.getByText('Omówić oczekiwania', { exact: true }),
    ).toBeVisible()

    await expect(
        documents.getByText('Lista pytań', { exact: true }),
    ).toBeVisible()

    await assertCompact(page, dialog)

    await screenshot(page, `content-${info.project.name}`)

    await documents
        .getByRole('button', { name: 'Pobierz Lista pytań', exact: true })
        .scrollIntoViewIfNeeded()

    await screenshot(page, `content-documents-${info.project.name}`)

    const download = page.waitForEvent('download')

    await documents
        .getByRole('button', { name: 'Pobierz Lista pytań', exact: true })
        .click()

    expect((await download).suggestedFilename()).toBe('Lista pytań.pdf')

    expect(
        requests(state, '/stage-templates/1/documents/1/file', 'GET'),
    ).toHaveLength(1)
})

test('manager sees default notes and documents with downloads but cannot mount editors or issue mutations', async ({
    page,
}) => {
    const state = await mockContent(page)

    state.manager = { ...admin, roles: [{ id: 2, name: 'manager' }] }

    const dialog = await openDetails(page)

    await expect(
        dialog.getByRole('region', { name: 'Notatki domyślne' }),
    ).toContainText('Sprawdzić potrzeby')

    await expect(
        dialog.getByRole('region', { name: 'Dokumenty domyślne' }),
    ).toContainText('Lista pytań')

    await expect(
        dialog.getByRole('button', {
            name: /Dodaj notatkę|Dodaj dokument|^Opcje /,
        }),
    ).toHaveCount(0)

    const download = page.waitForEvent('download')

    await dialog
        .getByRole('button', { name: 'Pobierz Lista pytań', exact: true })
        .click()

    await download

    expect(
        state.requests.filter((request) =>
            ['POST', 'PATCH', 'DELETE'].includes(request.method()),
        ),
    ).toHaveLength(0)
})

test('note create retries preserve text, block closing while pending and edit/delete only the nested record', async ({
    page,
}, info) => {
    const state = await mockContent(page)

    const dialog = await openDetails(page)

    await dialog
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    const input = dialog.getByLabel('Treść notatki', { exact: true })

    await expect(input).toHaveAttribute('maxlength', '10000')

    await input.fill('  Ustalić preferowane dzielnice.  ')

    state.failNoteMutation = 1

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(input).toHaveValue('  Ustalić preferowane dzielnice.  ')

    let release = () => {}

    state.noteGate = new Promise<void>((resolve) => {
        release = resolve
    })

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    await assertCompact(page, dialog)

    release()

    state.noteGate = undefined

    const region = dialog.getByRole('region', { name: 'Notatki domyślne' })

    await expect(region).toContainText('Ustalić preferowane dzielnice.')

    expect(
        requests(state, '/stage-templates/1/notes', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toEqual({ body: 'Ustalić preferowane dzielnice.' })

    await menuAction(page, region, 'Edytuj notatkę')

    await input.fill('Ustalić preferowane dzielnice i termin.')

    await screenshot(page, `note-form-${info.project.name}`)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(region).toContainText(
        'Ustalić preferowane dzielnice i termin.',
    )

    await menuAction(page, region, 'Usuń notatkę')

    expect(state.notes).toHaveLength(3)

    await dialog
        .getByRole('button', { name: 'Usuń notatkę', exact: true })
        .click()

    await expect(region).not.toContainText(
        'Ustalić preferowane dzielnice i termin.',
    )

    expect(state.notes).toHaveLength(2)

    expect(state.documents).toHaveLength(1)
})

test('default content lists paginate independently and recover from query failures', async ({
    page,
}) => {
    const state = await mockContent(page)

    state.notes = Array.from({ length: 46 }, (_, index) =>
        note(index + 1, `Notatka ${index + 1}`),
    )

    state.documents = Array.from({ length: 46 }, (_, index) =>
        document(index + 1, `Dokument ${index + 1}`, 1),
    )

    state.failNotes = true

    state.failDocuments = true

    const dialog = await openDetails(page)

    const notes = dialog.getByRole('region', { name: 'Notatki domyślne' })

    const documents = dialog.getByRole('region', { name: 'Dokumenty domyślne' })

    await expect(notes.getByRole('alert')).toBeVisible()

    await expect(documents.getByRole('alert')).toBeVisible()

    state.failNotes = false

    state.failDocuments = false

    await notes
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await documents
        .getByRole('button', { name: 'Spróbuj ponownie', exact: true })
        .click()

    await expect(notes.getByText('Notatka 1', { exact: true })).toBeVisible()

    await expect(
        documents.getByText('Dokument 1', { exact: true }),
    ).toBeVisible()

    await notes
        .getByRole('button', { name: 'Pokaż więcej notatek', exact: true })
        .click()

    await documents
        .getByRole('button', { name: 'Pokaż więcej dokumentów', exact: true })
        .click()

    await expect(notes.getByText('Notatka 21', { exact: true })).toBeVisible()

    await expect(
        documents.getByText('Dokument 21', { exact: true }),
    ).toBeVisible()

    const notePages = requests(state, '/stage-templates/1/notes', 'GET').map(
        (request) => new URL(request.url()).searchParams,
    )

    const documentPages = requests(
        state,
        '/stage-templates/1/documents',
        'GET',
    ).map((request) => new URL(request.url()).searchParams)

    expect(notePages.some((query) => Number(query.get('page')) > 1)).toBe(true)

    expect(documentPages.some((query) => Number(query.get('page')) > 1)).toBe(
        true,
    )
})

test('upload keeps its custom name and original bytes, fixes team bucket, and retries binding without another upload', async ({
    page,
}, info) => {
    const state = await mockContent(page)

    const dialog = await openDetails(page)

    await dialog
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    const title = dialog.getByLabel('Nazwa dokumentu', { exact: true })

    const file = dialog.getByLabel('Plik dokumentu', { exact: true })

    await file.setInputFiles({
        name: 'pierwszy.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-first'),
    })

    await expect(title).toHaveValue('pierwszy.pdf')

    await title.fill('  Umowa rezerwacyjna  ')

    await file.setInputFiles({
        name: 'ostateczny.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-original'),
    })

    await expect(title).toHaveValue('  Umowa rezerwacyjna  ')

    await expect(dialog.getByLabel('Widoczność pliku')).toHaveCount(0)

    await assertCompact(page, dialog)

    await screenshot(page, `document-form-${info.project.name}`)

    state.failUpload = 1

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(title).toHaveValue('  Umowa rezerwacyjna  ')

    state.failBinding = 1

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(title).toHaveValue('  Umowa rezerwacyjna  ')

    const uploadsBeforeRetry = requests(state, '/private-assets', 'POST').length

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    const region = dialog.getByRole('region', { name: 'Dokumenty domyślne' })

    await expect(region).toContainText('Umowa rezerwacyjna')

    expect(requests(state, '/private-assets', 'POST')).toHaveLength(
        uploadsBeforeRetry,
    )

    for (const request of requests(state, '/private-assets', 'POST')) {
        const body = request.postDataBuffer()!.toString()

        expect(body).toContain(
            'name="originalName"\r\n\r\nUmowa rezerwacyjna\r\n',
        )

        expect(body).toContain('name="bucket"\r\n\r\nclient_documents\r\n')

        expect(body).toContain('name="visibility"\r\n\r\nteam\r\n')

        expect(body).toContain('filename="ostateczny.pdf"')

        expect(body).toContain('%PDF-original')
    }

    expect(
        requests(state, '/stage-templates/1/documents', 'POST')
            .at(-1)
            ?.postDataJSON(),
    ).toEqual({ title: 'Umowa rezerwacyjna', privateAssetId: 104 })
})

test('library selection is limited to shared client documents, editing changes only title and removal only detaches', async ({
    page,
}) => {
    const state = await mockContent(page)

    const dialog = await openDetails(page)

    await dialog
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await dialog
        .getByRole('button', { name: 'Z biblioteki', exact: true })
        .click()

    await dialog.getByRole('button', { name: /Wybierz z biblioteki/ }).click()

    await expect(
        dialog.getByRole('button', { name: /Wspólny formularz/ }),
    ).toBeVisible()

    await expect(
        dialog.getByRole('button', {
            name: /Prywatny formularz|Dokument managera/,
        }),
    ).toHaveCount(0)

    await expect(dialog.getByLabel('Folder biblioteki')).toHaveCount(0)

    await dialog.getByRole('button', { name: /Wspólny formularz/ }).click()

    await dialog
        .getByLabel('Nazwa dokumentu', { exact: true })
        .fill('Formularz potrzeb')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    const region = dialog.getByRole('region', { name: 'Dokumenty domyślne' })

    await expect(region).toContainText('Formularz potrzeb')

    for (const request of requests(state, '/private-assets', 'GET')) {
        const query = new URL(request.url()).searchParams

        expect(query.get('bucket')).toBe('client_documents')

        expect(query.get('visibility')).toBe('team')
    }

    expect(requests(state, '/private-assets', 'POST')).toHaveLength(0)

    await menuAction(page, region, 'Edytuj dokument')

    await expect(dialog.getByLabel('Plik dokumentu')).toHaveCount(0)

    await dialog
        .getByLabel('Nazwa dokumentu', { exact: true })
        .fill('Zaktualizowany formularz')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    expect(
        requests(state, '/stage-templates/1/documents/101', 'PATCH')
            .at(-1)
            ?.postDataJSON(),
    ).toEqual({ title: 'Zaktualizowany formularz' })

    await expect(
        region.getByText('Zaktualizowany formularz', { exact: true }),
    ).toBeVisible()

    await menuAction(page, region, 'Odłącz dokument')

    expect(state.documents).toHaveLength(2)

    await dialog
        .getByRole('button', {
            name: /Usuń dokument|Odłącz dokument/,
            exact: true,
        })
        .click()

    await expect(region).not.toContainText('Zaktualizowany formularz')

    expect(state.documents).toHaveLength(1)

    expect(state.assets.find((row) => row.id === 2)).toBeDefined()

    expect(
        state.requests.filter(
            (request) =>
                new URL(request.url()).pathname.startsWith(
                    '/private-assets/',
                ) && request.method() === 'DELETE',
        ),
    ).toHaveLength(0)
})

test('cancel after a failed binding removes only the unlinked uploaded asset', async ({
    page,
}) => {
    const state = await mockContent(page)

    state.failBinding = 1

    const dialog = await openDetails(page)

    await dialog
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await dialog.getByLabel('Plik dokumentu', { exact: true }).setInputFiles({
        name: 'szkic.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-draft'),
    })

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await expect(
        dialog.getByRole('region', { name: 'Dokumenty domyślne' }),
    ).toBeVisible()

    await expect
        .poll(() => requests(state, '/private-assets/104', 'DELETE').length)
        .toBe(1)

    expect(state.assets.find((row) => row.id === 104)).toBeUndefined()

    expect(state.documents).toHaveLength(1)
})

test('orphan cleanup conflict preserves the protected asset and leaves existing bindings intact', async ({
    page,
}) => {
    const state = await mockContent(page)

    state.failBinding = 1

    state.protectCleanup = true

    const dialog = await openDetails(page)

    await dialog
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await dialog.getByLabel('Plik dokumentu', { exact: true }).setInputFiles({
        name: 'szkic.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-draft'),
    })

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await expect(
        dialog.getByRole('region', { name: 'Dokumenty domyślne' }),
    ).toBeVisible()

    await expect
        .poll(() => requests(state, '/private-assets/104', 'DELETE').length)
        .toBe(1)

    expect(state.assets.find((row) => row.id === 104)).toBeDefined()

    expect(state.documents).toHaveLength(1)
})
