import { selectOption } from './helpers/select-option'
import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'
import type { ManagerNote } from '../src/api/manager-notes/manager-notes.types'
import {
    PrivateBucket,
    type PrivateAsset,
} from '../src/api/private-assets/private-assets.types'

const timestamps = {
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-02T09:00:00.000Z',
}

const manager: Manager = {
    id: 1,
    email: 'anna@example.test',
    name: 'Anna',
    surname: 'Kowalska',
    phone: null,
    position: null,
    avatarId: null,
    status: 'active',
    remindersEnabled: false,
    lastLoginAt: null,
    roles: [{ id: 1, name: 'manager' }],
    ...timestamps,
}

function note(id: number, title: string, color = '#4676B4'): ManagerNote {
    return {
        id,
        managerId: 1,
        title,
        content: {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: 'Przygotować plan prezentacji',
                            marks: [{ type: 'bold' }],
                        },
                    ],
                },
            ],
        },
        plainText: 'Przygotować plan prezentacji',
        color,
        isPinned: id === 1,
        ...timestamps,
    }
}

function asset(
    id: number,
    name: string,
    visibility: 'author' | 'team' = 'author',
    owner = 1,
): PrivateAsset {
    return {
        id,
        bucket: PrivateBucket.MANAGER_DOCUMENTS,
        originalName: name,
        relPath: `test-${id}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1200,
        visibility,
        createdByManagerId: owner,
        ...timestamps,
    }
}

async function mock(page: Page) {
    const state = {
        notes: [
            note(1, 'Plan tygodnia'),
            note(2, 'Pomysły na ofertę', '#508B77'),
            note(3, 'Ustalenia', '#B18B4E'),
        ],
        assets: [asset(1, 'Oferta.pdf'), asset(2, 'Wzór umowy.pdf', 'team', 2)],
        requests: [] as Request[],
        failCreate: false,
        failDelete: false,
        failUpload: 0,
        failRename: false,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'notes-docs-test'),
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

        const list = <T>(rows: T[]) => {
            const limit = Number(url.searchParams.get('limit') ?? 20)

            const pageNo = Number(url.searchParams.get('page') ?? 1)

            const offset = Number(
                url.searchParams.get('offset') ?? (pageNo - 1) * limit,
            )

            return {
                rows: rows.slice(offset, offset + limit),
                total: rows.length,
                page: pageNo,
                limit,
                offset,
            }
        }

        if (path === '/managers/me') return send(manager)

        if (path === '/manager-notes' && method === 'GET') {
            const search = url.searchParams.get('search')?.toLowerCase()

            return send(
                list(
                    state.notes.filter(
                        (item) =>
                            (!search ||
                                item.title.toLowerCase().includes(search) ||
                                item.plainText
                                    .toLowerCase()
                                    .includes(search)) &&
                            (url.searchParams.get('isPinned') !== 'true' ||
                                item.isPinned),
                    ),
                ),
            )
        }

        if (path === '/manager-notes' && method === 'POST') {
            if (state.failCreate) return send({ message: 'Failed' }, 500)

            const dto = request.postDataJSON()

            const saved = { ...note(20, dto.title, dto.color), ...dto }

            state.notes.unshift(saved)

            return send(saved, 201)
        }

        const noteMatch = /^\/manager-notes\/(\d+)$/.exec(path)

        if (noteMatch) {
            const id = Number(noteMatch[1])

            const saved = state.notes.find((item) => item.id === id)

            if (!saved) return send({ message: 'Not found' }, 404)

            if (method === 'PATCH') Object.assign(saved, request.postDataJSON())

            if (method === 'DELETE') {
                state.notes = state.notes.filter((item) => item.id !== id)

                return send({ success: true })
            }

            return send(saved)
        }

        if (path === '/private-assets' && method === 'GET') {
            const query = url.searchParams

            return send(
                list(
                    state.assets.filter(
                        (item) =>
                            (!query.get('bucket') ||
                                item.bucket === query.get('bucket')) &&
                            (query.get('ownOnly') !== 'true' ||
                                item.createdByManagerId === manager.id) &&
                            (!query.get('visibility') ||
                                item.visibility === query.get('visibility')) &&
                            (!query.get('search') ||
                                item.originalName
                                    .toLowerCase()
                                    .includes(
                                        query.get('search')!.toLowerCase(),
                                    )),
                    ),
                ),
            )
        }

        if (path === '/private-assets' && method === 'POST') {
            const body = request.postData() ?? ''

            expect(body).toContain('manager_documents')

            const originalName = /name="originalName"\r\n\r\n([^\r\n]+)/.exec(
                body,
            )?.[1]

            expect(originalName).toBeTruthy()

            expect(originalName).toBe(originalName?.trim())

            if (state.failUpload > 0) {
                state.failUpload--

                return send({ message: 'Failed' }, 500)
            }

            const saved = asset(8, originalName!)

            state.assets.unshift(saved)

            return send(saved, 201)
        }

        const assetMatch =
            /^\/private-assets\/(\d+)(?:\/(file|visibility|name))?$/.exec(path)

        if (assetMatch) {
            const id = Number(assetMatch[1])

            const saved = state.assets.find((item) => item.id === id)

            if (!saved) return send({ message: 'Not found' }, 404)

            if (assetMatch[2] === 'name' && method === 'PATCH') {
                if (state.failRename) return send({ message: 'Failed' }, 500)

                Object.assign(saved, request.postDataJSON())

                return send(saved)
            }

            if (assetMatch[2] === 'file') {
                expect(request.headers().authorization).toBe(
                    'Bearer notes-docs-test',
                )

                return route.fulfill({
                    contentType: saved.mimeType,
                    body: '%PDF-1.4\n%%EOF',
                })
            }

            if (assetMatch[2] === 'visibility')
                Object.assign(saved, request.postDataJSON())

            if (method === 'DELETE') {
                if (state.failDelete)
                    return send({ message: 'Asset in use' }, 409)

                state.assets = state.assets.filter((item) => item.id !== id)

                return send({ success: true })
            }

            return send(saved)
        }

        return send(list([]))
    })

    return state
}

test('personal note board filters, pins, safely renders formatting and fits the viewport', async ({
    page,
}, testInfo) => {
    await mock(page)

    await page.goto('/main/notes')

    await expect(
        page.getByRole('button', { name: 'Otwórz notatkę Plan tygodnia' }),
    ).toBeVisible()

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((el) => el.clientWidth),
    )

    mkdirSync('/tmp/ivan-notes-documents-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-notes-documents-shots/notes-${testInfo.project.name}.png`,
        fullPage: true,
    })

    await page.getByRole('button', { name: 'Przypięte', exact: true }).click()

    await expect(
        page.getByRole('button', { name: 'Otwórz notatkę Pomysły na ofertę' }),
    ).toHaveCount(0)

    await page
        .getByRole('button', { name: 'Otwórz notatkę Plan tygodnia' })
        .click()

    await expect(
        page
            .getByRole('dialog')
            .locator('strong', { hasText: 'Przygotować plan prezentacji' }),
    ).toBeVisible()
})

test('new rich-text note keeps input after failure and submits structured JSON without an owner', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/notes')

    await page
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    await page.getByLabel('Nazwa notatki').fill('  Nowa myśl  ')

    await page
        .getByRole('textbox', { name: 'Treść notatki' })
        .fill('Ważne ustalenia')

    state.failCreate = true

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
        'Nie udało się zapisać',
    )

    await expect(page.getByLabel('Nazwa notatki')).toHaveValue('  Nowa myśl  ')

    state.failCreate = false

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    await expect(page.getByRole('dialog')).toContainText('Ważne ustalenia')

    const requests = state.requests.filter(
        (item) =>
            item.method() === 'POST' &&
            new URL(item.url()).pathname === '/manager-notes',
    )

    expect(requests.at(-1)?.postDataJSON()).toMatchObject({
        title: 'Nowa myśl',
        content: { type: 'doc' },
        color: '#4676B4',
        isPinned: false,
    })

    expect(requests.at(-1)?.postDataJSON()).not.toHaveProperty('managerId')
})

test('note editing and deletion use confirmation and leave other notes intact', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/notes')

    await page.getByRole('button', { name: 'Edytuj notatkę Ustalenia' }).click()

    await page.getByLabel('Nazwa notatki').fill('Ustalenia po spotkaniu')

    await page.getByRole('button', { name: 'Zapisz zmiany' }).click()

    await expect(page.getByRole('dialog')).toContainText(
        'Ustalenia po spotkaniu',
    )

    await page.getByRole('button', { name: 'Zamknij okno' }).click()

    await page
        .getByRole('button', { name: 'Usuń notatkę Ustalenia po spotkaniu' })
        .click()

    expect(state.notes).toHaveLength(3)

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Usuń notatkę', exact: true })
        .click()

    await expect(
        page.getByRole('button', {
            name: 'Otwórz notatkę Ustalenia po spotkaniu',
        }),
    ).toHaveCount(0)

    expect(state.notes).toHaveLength(2)
})

test('document library separates own and shared files, downloads with auth and fits mobile', async ({
    page,
}, testInfo) => {
    await mock(page)

    await page.goto('/main/documents')

    await expect(
        page.getByRole('button', { name: 'Otwórz dokument Oferta.pdf' }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Otwórz dokument Wzór umowy.pdf' }),
    ).toHaveCount(0)

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((el) => el.clientWidth),
    )

    mkdirSync('/tmp/ivan-notes-documents-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-notes-documents-shots/documents-${testInfo.project.name}.png`,
        fullPage: true,
    })

    const downloadPromise = page.waitForEvent('download')

    await page.getByRole('button', { name: 'Pobierz Oferta.pdf' }).click()

    expect((await downloadPromise).suggestedFilename()).toBe('Oferta.pdf')

    await page.getByRole('button', { name: 'Zespół', exact: true }).click()

    await page
        .getByRole('button', { name: 'Otwórz dokument Wzór umowy.pdf' })
        .click()

    await expect(
        page
            .getByRole('dialog')
            .getByRole('button', { name: 'Usuń plik', exact: true }),
    ).toHaveCount(0)
})

test('upload adds a private original file and protected deletion explains the conflict', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/documents')

    await page
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await page.getByLabel('Plik dokumentu').setInputFiles({
        name: 'upload.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n%%EOF'),
    })

    await expect(page.getByLabel('Nazwa dokumentu')).toHaveValue('upload.pdf')

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    await expect(page.getByRole('dialog')).toContainText('upload.pdf')

    await selectOption(page.getByLabel('Widoczność pliku'), 'team')

    await expect(page.getByLabel('Widoczność pliku')).toHaveText('Dla zespołu')

    state.failDelete = true

    await page.getByRole('button', { name: 'Usuń plik', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Usuń plik', exact: true })
        .click()

    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
        'Ten plik jest używany',
    )

    expect(state.assets.find((item) => item.id === 8)).toBeDefined()
})

test('document name follows file defaults, preserves a custom label on replacement and retry, and downloads with the real format', async ({
    page,
}, info) => {
    const state = await mock(page)

    await page.goto('/main/documents')

    await page
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    const dialog = page.getByRole('dialog', { name: 'Nowy dokument' })

    const name = dialog.getByLabel('Nazwa dokumentu')

    const file = dialog.getByLabel('Plik dokumentu')

    const submit = dialog.getByRole('button', {
        name: 'Dodaj dokument',
        exact: true,
    })

    await expect(submit).toBeDisabled()

    await file.setInputFiles({
        name: 'pierwsza.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-first'),
    })

    await expect(name).toHaveValue('pierwsza.pdf')

    await file.setInputFiles({
        name: 'druga.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-second'),
    })

    await expect(name).toHaveValue('druga.pdf')

    await name.fill('  Umowa rezerwacyjna  ')

    await file.setInputFiles({
        name: 'upload.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-custom'),
    })

    await expect(name).toHaveValue('  Umowa rezerwacyjna  ')

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((element) => element.clientWidth),
    )

    mkdirSync('/tmp/ivan-private-upload-shots', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-private-upload-shots/document-name-${info.project.name}.png`,
        fullPage: true,
    })

    state.failUpload = 1

    await submit.click()

    await expect(dialog.getByRole('alert')).toContainText('Nie udało się dodać')

    await expect(name).toHaveValue('  Umowa rezerwacyjna  ')

    await expect(dialog).toContainText('upload.pdf')

    await submit.click()

    await expect(
        page.getByRole('dialog', { name: 'Umowa rezerwacyjna' }),
    ).toBeVisible()

    expect(state.assets.find((item) => item.id === 8)?.originalName).toBe(
        'Umowa rezerwacyjna',
    )

    const uploads = state.requests.filter(
        (request) =>
            new URL(request.url()).pathname === '/private-assets' &&
            request.method() === 'POST',
    )

    expect(uploads).toHaveLength(2)

    for (const request of uploads) {
        const body = request.postDataBuffer()!.toString()

        expect(body).toContain(
            'name="originalName"\r\n\r\nUmowa rezerwacyjna\r\n',
        )

        expect(body).toContain('filename="upload.pdf"')

        expect(body).toContain('%PDF-custom')
    }

    await page.keyboard.press('Escape')

    const row = page.getByRole('button', {
        name: 'Otwórz dokument Umowa rezerwacyjna',
    })

    await expect(row).toContainText('PDF ·')

    const downloaded = page.waitForEvent('download')

    await page
        .getByRole('button', { name: 'Pobierz Umowa rezerwacyjna' })
        .click()

    expect((await downloaded).suggestedFilename()).toBe(
        'Umowa rezerwacyjna.pdf',
    )
})

test('download keeps a valid jpeg alias and uses the actual WebP format for a differently named image', async ({
    page,
}) => {
    const state = await mock(page)

    state.assets.push(
        { ...asset(10, 'Portret.jpeg'), mimeType: 'image/jpeg' },
        { ...asset(11, 'Miniatura.jpg'), mimeType: 'image/webp' },
        asset(12, 'Folder\\Oddział/Oferta'),
    )

    await page.goto('/main/documents')

    await expect(
        page.getByRole('button', { name: 'Otwórz dokument Miniatura.jpg' }),
    ).toContainText('WEBP ·')

    for (const [label, filename] of [
        ['Portret.jpeg', 'Portret.jpeg'],
        ['Miniatura.jpg', 'Miniatura.webp'],
        ['Folder\\Oddział/Oferta', 'Oferta.pdf'],
    ]) {
        const downloaded = page.waitForEvent('download')

        await page.getByRole('button', { name: `Pobierz ${label}` }).click()

        expect((await downloaded).suggestedFilename()).toBe(filename)
    }
})

test('library includes client files and rename keeps metadata, retries and downloads with MIME extension', async ({
    page,
}, info) => {
    const state = await mock(page)

    state.assets.push({
        ...asset(30, 'Dokument klienta'),
        bucket: PrivateBucket.CLIENT_DOCUMENTS,
    })

    await page.goto('/main/documents')

    await expect(
        page.getByRole('button', { name: 'Otwórz dokument Dokument klienta' }),
    ).toBeVisible()

    await page
        .getByRole('button', { name: 'Pliki klientów i etapów', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Otwórz dokument Oferta.pdf' }),
    ).toHaveCount(0)

    await page
        .getByRole('button', { name: 'Otwórz dokument Dokument klienta' })
        .click()

    await page.getByRole('button', { name: 'Zmień nazwę', exact: true }).click()

    const popup = page.getByRole('dialog', { name: 'Zmień nazwę dokumentu' })

    await popup.getByLabel('Nazwa dokumentu').fill('  Nowa nazwa  ')

    state.failRename = true

    await popup.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(popup.getByRole('alert')).toContainText(
        'Nie udało się zmienić nazwy',
    )

    await expect(popup.getByLabel('Nazwa dokumentu')).toHaveValue(
        '  Nowa nazwa  ',
    )

    state.failRename = false

    await popup.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(page.getByRole('dialog', { name: 'Nowa nazwa' })).toBeVisible()

    expect(state.assets.find((item) => item.id === 30)?.relPath).toBe(
        'test-30.pdf',
    )

    const download = page.waitForEvent('download')

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Pobierz Nowa nazwa' })
        .click()

    expect((await download).suggestedFilename()).toBe('Nowa nazwa.pdf')

    await expect(page.locator('html')).toHaveJSProperty(
        'scrollWidth',
        await page.locator('html').evaluate((element) => element.clientWidth),
    )

    await page.screenshot({
        path: `/tmp/ivan-notes-documents-shots/rename-${info.project.name}.png`,
        fullPage: true,
    })
})
