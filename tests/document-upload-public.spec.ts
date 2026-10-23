import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type {
    DocumentRequest,
    DocumentUploadNotification,
    PublicDocumentRequest,
} from '../src/api/document-requests/document-requests.types'
import type { ClientDocument } from '../src/api/client-records/client-records.types'

const token = 'a'.repeat(43)

const renewedToken = 'b'.repeat(43)

const timestamps = {
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
}

const metadata: PublicDocumentRequest = {
    title: 'Skan paszportu',
    instructions: 'Wszystkie strony.\nWyraźne zdjęcia <bez filtrów>.',
    expiresAt: '2026-11-06T08:00:00Z',
    status: 'pending',
}

const pdf = {
    name: 'paszport.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nTestowy dokument\n%%EOF'),
}

function list<T>(rows: T[]) {
    return { rows, total: rows.length, page: 1, limit: 20, offset: 0 }
}

async function mockPublic(page: Page, signedIn = false) {
    const state: {
        metadata: PublicDocumentRequest
        requests: Request[]
        uploads: Request[]
        viewStatus: number
        uploadStatus: number
        acceptDespiteError: boolean
        gate?: Promise<void>
    } = {
        metadata: { ...metadata },
        requests: [],
        uploads: [],
        viewStatus: 200,
        uploadStatus: 200,
        acceptDespiteError: false,
    }

    if (signedIn)
        await page.addInitScript(() =>
            localStorage.setItem('atimi:access_token', 'existing-test-session'),
        )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        const send = (json: unknown, status = 200) =>
            route.fulfill({
                status,
                json,
                headers: { 'access-control-allow-origin': '*' },
            })

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

        if (path === '/document-upload-requests/view')
            return send(
                state.viewStatus === 200
                    ? state.metadata
                    : { message: 'Link not available' },
                state.viewStatus,
            )

        if (path === '/document-upload-requests/upload') {
            state.uploads.push(request)

            if (state.gate) await state.gate

            if (state.uploadStatus === 200 || state.acceptDespiteError)
                state.metadata.status = 'submitted'

            return send(
                state.uploadStatus === 200
                    ? { status: 'submitted' }
                    : { message: 'Upload unavailable' },
                state.uploadStatus,
            )
        }

        return send({ message: 'No session data on public page' }, 401)
    })

    return state
}

async function capture(page: Page, name: string) {
    mkdirSync('/tmp/atimi-document-public-shots', { recursive: true })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-document-public-shots/${name}.png`,
        fullPage: true,
    })
}

test('public phone and desktop upload needs no account, sends token only in body and prevents duplicate submission', async ({
    page,
}, info) => {
    const state = await mockPublic(page)

    await page.goto(`/upload-document#${token}`)

    await expect(
        page.getByRole('heading', { name: metadata.title, exact: true }),
    ).toBeVisible()

    await expect(
        page.getByText(metadata.instructions!, { exact: true }),
    ).toBeVisible()

    await expect(page.getByRole('navigation')).toHaveCount(0)

    await expect(page.getByRole('textbox')).toHaveCount(0)

    await expect(page.getByRole('button', { name: 'Zaloguj' })).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Prześlij dokument', exact: true }),
    ).toBeDisabled()

    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
        'content',
        'no-referrer',
    )

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        /noindex/,
    )

    await capture(page, `public-form-${info.project.name}`)

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles(pdf)

    const gate = Promise.withResolvers<void>()

    state.gate = gate.promise

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Przesyłanie…' }),
    ).toBeDisabled()

    await expect(
        page.getByLabel('Plik dokumentu', { exact: true }),
    ).toBeDisabled()

    await expect.poll(() => state.uploads.length).toBe(1)

    gate.resolve()

    await expect(
        page.getByRole('heading', { name: 'Dokument został przesłany' }),
    ).toBeVisible()

    await expect(page.getByLabel('Plik dokumentu')).toHaveCount(0)

    await capture(page, `public-success-${info.project.name}`)

    expect(state.uploads[0].postData()).toContain('name="token"')

    expect(state.uploads[0].postData()).toContain(token)

    expect(state.uploads[0].postData()).toContain('filename="paszport.pdf"')

    expect(state.requests.every((request) => request.method() === 'POST')).toBe(
        true,
    )

    for (const request of state.requests) {
        expect(request.url()).not.toContain(token)

        expect(request.headers().authorization).toBeUndefined()

        expect(request.headers().referer).toBeUndefined()

        expect(new URL(request.url()).search).toBe('')
    }

    expect(state.requests[0].postDataJSON()).toEqual({ token })

    expect(await page.locator('body').innerText()).not.toContain(token)

    expect(new URL(page.url()).pathname).toBe('/upload-document')

    expect(new URL(page.url()).search).toBe('')

    await page.reload()

    await expect(
        page.getByRole('heading', { name: 'Dokument został przesłany' }),
    ).toBeVisible()

    expect(state.uploads).toHaveLength(1)
})

test('public API omits authorization even when the browser has an employee session', async ({
    page,
}) => {
    const state = await mockPublic(page, true)

    await page.goto(`/upload-document#${token}`)

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles(pdf)

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page.getByRole('heading', { name: 'Dokument został przesłany' }),
    ).toBeVisible()

    const publicRequests = state.requests.filter((request) =>
        new URL(request.url()).pathname.startsWith(
            '/document-upload-requests/',
        ),
    )

    expect(publicRequests.length).toBeGreaterThanOrEqual(2)

    expect(
        publicRequests.every((request) => !request.headers().authorization),
    ).toBe(true)

    expect(
        state.requests.some((request) =>
            new URL(request.url()).pathname.startsWith('/clients'),
        ),
    ).toBe(false)
})

test('oversize is rejected before upload; rejected file and network failure allow an explicit retry', async ({
    page,
}) => {
    const state = await mockPublic(page)

    await page.goto(`/upload-document#${token}`)

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles({
        ...pdf,
        buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
    })

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page
            .getByRole('form', { name: 'Prześlij dokument', exact: true })
            .getByRole('alert'),
    ).toContainText('Maksymalny rozmiar to 20 MB.')

    expect(state.uploads).toHaveLength(0)

    state.uploadStatus = 400

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles({
        name: 'unsupported.html',
        mimeType: 'text/html',
        buffer: Buffer.from('<script>bad()</script>'),
    })

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page
            .getByRole('form', { name: 'Prześlij dokument', exact: true })
            .getByRole('alert'),
    ).toContainText('Dozwolone są PDF, DOCX, XLSX, JPG, PNG i WebP')

    expect(state.uploads).toHaveLength(1)

    state.uploadStatus = 503

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles(pdf)

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page
            .getByRole('form', { name: 'Prześlij dokument', exact: true })
            .getByRole('alert'),
    ).toContainText('Sprawdź, czy plik dotarł')

    expect(state.uploads).toHaveLength(2)

    state.uploadStatus = 200

    await page
        .getByRole('button', { name: 'Sprawdź, czy plik dotarł', exact: true })
        .click()

    await expect(
        page.getByRole('heading', { name: metadata.title, exact: true }),
    ).toBeVisible()

    await expect(page.getByText(pdf.name, { exact: true })).toBeVisible()

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page.getByRole('heading', { name: 'Dokument został przesłany' }),
    ).toBeVisible()

    expect(state.uploads).toHaveLength(3)
})

test('uncertain upload response checks submitted state without sending the file again', async ({
    page,
}) => {
    const state = await mockPublic(page)

    state.uploadStatus = 503

    state.acceptDespiteError = true

    await page.goto(`/upload-document#${token}`)

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles(pdf)

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page
            .getByRole('form', { name: 'Prześlij dokument', exact: true })
            .getByRole('alert'),
    ).toBeVisible()

    expect(state.uploads).toHaveLength(1)

    await page
        .getByRole('button', { name: 'Sprawdź, czy plik dotarł', exact: true })
        .click()

    await expect(
        page.getByRole('heading', { name: 'Dokument został przesłany' }),
    ).toBeVisible()

    expect(state.uploads).toHaveLength(1)

    await expect(
        page.getByRole('button', { name: 'Prześlij dokument', exact: true }),
    ).toHaveCount(0)
})

test('expired, revoked and unknown links disclose no request details; malformed links make no request', async ({
    page,
}) => {
    const state = await mockPublic(page)

    for (const status of [410, 404]) {
        state.viewStatus = status

        await page.goto(`/upload-document#${token}`)

        await expect(
            page.getByRole('heading', { name: 'Link jest niedostępny' }),
        ).toBeVisible()

        await expect(
            page.getByText(metadata.title, { exact: true }),
        ).toHaveCount(0)

        await expect(page.getByLabel('Plik dokumentu')).toHaveCount(0)

        const count = state.requests.length

        await page
            .getByRole('button', { name: 'Sprawdź ponownie', exact: true })
            .click()

        await expect.poll(() => state.requests.length).toBe(count + 1)

        await expect(
            page.getByRole('heading', { name: 'Link jest niedostępny' }),
        ).toBeVisible()
    }

    const count = state.requests.length

    await page.goto('/upload-document#not-valid')

    await expect(
        page.getByRole('heading', { name: 'Link jest niedostępny' }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Sprawdź ponownie' }),
    ).toHaveCount(0)

    expect(state.requests).toHaveLength(count)
})

test('changing fragment replaces expired link and clears previous success and selected file', async ({
    page,
}) => {
    const state = await mockPublic(page)

    state.viewStatus = 410

    await page.goto(`/upload-document#${token}`)

    await expect(
        page.getByRole('heading', { name: 'Link jest niedostępny' }),
    ).toBeVisible()

    state.viewStatus = 200

    state.metadata.title = 'Nowy skan paszportu'

    await page.evaluate((value) => {
        window.location.hash = value
    }, renewedToken)

    await expect(
        page.getByRole('heading', { name: 'Nowy skan paszportu', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Prześlij dokument', exact: true }),
    ).toBeDisabled()

    expect(state.requests.at(-1)?.postDataJSON()).toEqual({
        token: renewedToken,
    })

    await page.getByLabel('Plik dokumentu', { exact: true }).setInputFiles(pdf)

    await page
        .getByRole('button', { name: 'Prześlij dokument', exact: true })
        .click()

    await expect(
        page.getByRole('heading', { name: 'Dokument został przesłany' }),
    ).toBeVisible()

    state.metadata = { ...metadata, title: 'Kolejny dokument' }

    await page.evaluate((value) => {
        window.location.hash = value
    }, 'c'.repeat(43))

    await expect(
        page.getByRole('heading', { name: 'Kolejny dokument', exact: true }),
    ).toBeVisible()

    await expect(page.getByText(pdf.name, { exact: true })).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Prześlij dokument', exact: true }),
    ).toBeDisabled()

    expect(state.uploads).toHaveLength(1)
})

async function mockNotifications(page: Page, senderOnly = false) {
    const request: DocumentRequest = {
        id: 12,
        clientId: 7,
        ...metadata,
        ...timestamps,
    }

    const state: {
        notifications: DocumentUploadNotification[]
        documents: ClientDocument[]
        placeholders: DocumentRequest[]
        requests: Request[]
        readStatus: number
    } = {
        notifications: [],
        documents: [],
        placeholders: [request],
        requests: [],
        readStatus: 200,
    }

    await page.addInitScript(() =>
        localStorage.setItem(
            'atimi:access_token',
            'notifications-test-session',
        ),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        const send = (json: unknown, status = 200) =>
            route.fulfill({
                status,
                json,
                headers: { 'access-control-allow-origin': '*' },
            })

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
            return send({
                id: 1,
                name: 'Anna',
                surname: 'Kowalska',
                email: 'anna@example.test',
                status: 'active',
                remindersEnabled: false,
                roles: [
                    {
                        id: senderOnly ? 3 : 2,
                        name: senderOnly ? 'sender' : 'manager',
                    },
                ],
                ...timestamps,
            })

        if (path === '/clients/7')
            return send({
                id: 7,
                name: 'Jan',
                surname: 'Nowak',
                managerId: 1,
                isPrivate: true,
                sourceId: null,
                status: 'active',
                priority: 'normal',
                paymentStatus: 'unpaid',
                paymentCurrency: 'PLN',
                paymentAmount: null,
                paymentComment: null,
                archivedAt: null,
                manager: { id: 1, name: 'Anna', surname: 'Kowalska' },
                ...timestamps,
            })

        if (path === '/note-mention-notifications')
            return send({ ...list([]), unreadCount: 0 })

        if (path === '/document-upload-notifications')
            return send({
                ...list(state.notifications),
                unreadCount: state.notifications.filter((row) => !row.readAt)
                    .length,
            })

        if (path === '/document-upload-notifications/31/read') {
            if (state.readStatus !== 200)
                return send({ message: 'Unavailable' }, state.readStatus)

            state.notifications[0].readAt = timestamps.updatedAt

            return send(state.notifications[0])
        }

        if (path === '/clients/7/documents') return send(list(state.documents))

        if (path === '/clients/7/document-requests')
            return send(list(state.placeholders))

        if (path === '/clients/7/legalization')
            return send({
                emailMarketingConsent: false,
                emailAutomationConsent: false,
            })

        if (path.startsWith('/calendars/'))
            return send({
                id: 11,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        return send(list([]))
    })

    return state
}

function receivedDocument(title: string, id = 41): ClientDocument {
    return {
        id,
        clientId: 7,
        title,
        category: null,
        privateAssetId: id + 100,
        createdByManagerId: 1,
        ...timestamps,
    }
}

function notification(): DocumentUploadNotification {
    return {
        id: 31,
        clientId: 7,
        requestId: 12,
        title: metadata.title,
        clientName: 'Jan Nowak',
        clientDocumentId: 41,
        readAt: null,
        createdAt: timestamps.createdAt,
    }
}

test('notification polling refreshes mounted client documents, same-client link refreshes again and mark-read updates count', async ({
    page,
}, info) => {
    const state = await mockNotifications(page)

    await page.clock.install()

    await page.goto('/main/clients/7?tab=documents')

    const documents = page.getByRole('region', {
        name: 'Dokumenty klienta',
        exact: true,
    })

    await expect(documents).toBeVisible()

    await expect(
        page.getByRole('region', { name: 'Dokumenty oczekiwane', exact: true }),
    ).toContainText('Oczekuje na plik')

    const documentReads = () =>
        state.requests.filter(
            (request) =>
                new URL(request.url()).pathname === '/clients/7/documents',
        ).length

    const initialReads = documentReads()

    state.documents = [receivedDocument('Paszport z telefonu')]

    state.placeholders = [
        { ...state.placeholders[0], status: 'submitted', clientDocumentId: 41 },
    ]

    state.notifications = [notification()]

    await page.clock.fastForward(30_000)

    await expect(
        page.getByRole('button', {
            name: 'Powiadomienia: 1 nieprzeczytanych',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        documents.getByText('Paszport z telefonu', { exact: true }),
    ).toBeVisible()

    await expect(
        page.getByText('Oczekuje na plik', { exact: true }),
    ).toHaveCount(0)

    expect(documentReads()).toBeGreaterThan(initialReads)

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 1 nieprzeczytanych',
            exact: true,
        })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Powiadomienia',
        exact: true,
    })

    await expect(
        dialog.getByText('Jan Nowak przesłał(a) dokument', { exact: true }),
    ).toBeVisible()

    await capture(page, `notifications-${info.project.name}`)

    await expect(
        dialog.getByRole('link', { name: 'Otwórz klienta' }),
    ).toHaveAttribute('href', '/main/clients/7?tab=documents')

    state.documents = [
        receivedDocument('Paszport z telefonu'),
        receivedDocument('Dodatkowe strony', 42),
    ]

    const beforeClick = documentReads()

    await dialog
        .getByRole('link', { name: 'Otwórz klienta', exact: true })
        .click()

    await expect(dialog).toBeHidden()

    await expect(
        documents.getByText('Dodatkowe strony', { exact: true }),
    ).toBeVisible()

    expect(documentReads()).toBeGreaterThan(beforeClick)

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 1 nieprzeczytanych',
            exact: true,
        })
        .click()

    state.readStatus = 503

    await dialog
        .getByRole('button', { name: 'Oznacz jako przeczytane', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie udało się oznaczyć powiadomienia',
    )

    expect(
        state.requests.filter((request) =>
            new URL(request.url()).pathname.endsWith('/31/read'),
        ),
    ).toHaveLength(1)

    state.readStatus = 200

    await dialog
        .getByRole('button', { name: 'Oznacz jako przeczytane', exact: true })
        .click()

    await expect(
        page.getByRole('button', {
            name: 'Powiadomienia',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        dialog.getByRole('button', { name: 'Oznacz jako przeczytane' }),
    ).toHaveCount(0)

    expect(
        state.requests.filter((request) =>
            new URL(request.url()).pathname.endsWith('/31/read'),
        ),
    ).toHaveLength(2)
})

test('notification link opens document tab and sender-only never queries notifications', async ({
    page,
}) => {
    let state = await mockNotifications(page)

    state.notifications = [notification()]

    state.documents = [receivedDocument('Nowy plik klienta')]

    await page.goto('/main/profile')

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 1 nieprzeczytanych',
            exact: true,
        })
        .click()

    await page
        .getByRole('link', { name: 'Otwórz klienta', exact: true })
        .click()

    await expect(page).toHaveURL('/main/clients/7?tab=documents')

    await expect(
        page
            .getByRole('region', { name: 'Dokumenty klienta', exact: true })
            .getByText('Nowy plik klienta', { exact: true }),
    ).toBeVisible()

    await page.unroute('**:4201/**')

    state = await mockNotifications(page, true)

    await page.goto('/main/profile')

    await expect(
        page.getByRole('heading', { name: 'Mój profil', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: /Powiadomienia/ }),
    ).toHaveCount(0)

    expect(
        state.requests.some((request) =>
            new URL(request.url()).pathname.startsWith(
                '/document-upload-notifications',
            ),
        ),
    ).toBe(false)
})
