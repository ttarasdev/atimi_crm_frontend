import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { ClientNote } from '../src/api/client-records/client-records.types'
import type { ClientStageNote } from '../src/api/client-stage-records/client-stage-records.types'
import type { NoteMentionNotification } from '../src/api/note-mentions/note-mentions.types'

const timestamps = {
    createdAt: '2026-10-23T08:00:00Z',
    updatedAt: '2026-10-23T08:00:00Z',
}

const employees = [
    { id: 2, name: 'Piotr', surname: 'Nowak' },
    { id: 3, name: 'Ewa', surname: 'Zielińska' },
]

const single: ClientNote = {
    id: 901,
    clientId: 7,
    title: 'Wzmianka poza pierwszą stroną',
    body: '@Piotr Nowak sprawdź.\n<img src=x onerror=alert(1)>',
    mentions: [{ managerId: 2, label: 'Piotr Nowak' }],
    isPinned: false,
    createdByManagerId: 1,
    ...timestamps,
}

const stageSingle: ClientStageNote = {
    id: 902,
    clientStageId: 21,
    title: 'Wzmianka w etapie',
    body: '@Ewa Zielińska sprawdź etap.',
    mentions: [{ managerId: 3, label: 'Ewa Zielińska' }],
    ...timestamps,
}

const list = (rows: unknown[]) => ({
    rows,
    total: rows.length,
    page: 1,
    limit: 20,
    offset: 0,
})

async function mock(
    page: Page,
    options: {
        foreign?: boolean
        private?: boolean
        sender?: boolean
        inbox?: boolean
        stage?: boolean
    } = {},
) {
    const process = {
        id: 20,
        clientId: 7,
        title: 'Zezwolenie na pobyt',
        managerId: 1,
        status: 'active',
        completedAt: null,
        ...timestamps,
    }

    const stage = {
        id: 21,
        clientProcessId: 20,
        title: 'Weryfikacja dokumentów',
        status: 'active',
        sortKey: 1000,
        stageTemplateId: null,
        iconId: null,
        color: '#4676B4',
        assignedManagerId: null,
        plannedAt: null,
        completedAt: null,
        ...timestamps,
    }

    const state: {
        requests: Request[]
        notes: ClientNote[]
        stageNotes: ClientStageNote[]
        recipientFailure: boolean
        saveFailure: boolean
        exactMissing: boolean
        readFailure: boolean
        notifications: NoteMentionNotification[]
    } = {
        requests: [],
        notes: [],
        stageNotes: [],
        recipientFailure: false,
        saveFailure: false,
        exactMissing: false,
        readFailure: false,
        notifications: options.inbox
            ? [
                  {
                      id: 51,
                      clientId: 7,
                      noteId: single.id,
                      kind: 'client_note',
                      title: single.title!,
                      clientName: 'Jan Nowak',
                      actorName: 'Ewa Zielińska',
                      readAt: null,
                      ...timestamps,
                  },
                  {
                      id: 52,
                      clientId: 7,
                      noteId: stageSingle.id,
                      kind: 'stage_note',
                      title: stageSingle.title!,
                      clientName: 'Jan Nowak',
                      actorName: 'Ewa Zielińska',
                      processId: 20,
                      stageId: 21,
                      readAt: null,
                      ...timestamps,
                  },
              ]
            : [],
    }

    await page.addInitScript(() =>
        localStorage.setItem(
            'atimi:access_token',
            'note-mentions-test-session',
        ),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const path = url.pathname

        const method = request.method()

        const send = (json: unknown, status = 200) =>
            route.fulfill({
                status,
                json,
                headers: { 'access-control-allow-origin': '*' },
            })

        if (method === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods':
                        'GET,POST,PATCH,DELETE,OPTIONS',
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
                        id: options.sender ? 3 : 2,
                        name: options.sender ? 'sender' : 'manager',
                    },
                ],
                ...timestamps,
            })

        if (path === '/clients/7')
            return send({
                id: 7,
                name: 'Jan',
                surname: 'Nowak',
                managerId: options.foreign ? 2 : 1,
                isPrivate: !!options.private,
                sourceId: null,
                status: 'active',
                priority: 'normal',
                archivedAt: null,
                paymentStatus: 'unpaid',
                paymentAmount: null,
                paymentCurrency: 'PLN',
                paymentComment: null,
                manager: { id: 1, name: 'Anna', surname: 'Kowalska' },
                ...timestamps,
            })

        if (path === '/clients/7/note-mentions/recipients') {
            if (state.recipientFailure) {
                state.recipientFailure = false

                return send({ message: 'Unavailable' }, 503)
            }

            const search = (
                url.searchParams.get('search') ?? ''
            ).toLocaleLowerCase('pl')

            return send(
                list(
                    employees.filter(
                        (row) =>
                            (!options.private || row.id === 3) &&
                            `${row.name} ${row.surname}`
                                .toLocaleLowerCase('pl')
                                .includes(search),
                    ),
                ),
            )
        }

        if (path === '/note-mention-notifications')
            return send({
                ...list(state.notifications),
                unreadCount: state.notifications.filter((row) => !row.readAt)
                    .length,
            })

        if (/^\/note-mention-notifications\/\d+\/read$/.test(path)) {
            if (state.readFailure) {
                state.readFailure = false

                return send({ message: 'Unavailable' }, 503)
            }

            const row = state.notifications.find(
                (row) => row.id === Number(path.split('/')[2]),
            )

            if (row) row.readAt = timestamps.updatedAt

            return send({ success: true })
        }

        if (path === '/document-upload-notifications')
            return send({
                ...list(
                    options.inbox
                        ? [
                              {
                                  id: 31,
                                  clientId: 7,
                                  requestId: 12,
                                  title: 'Przesłany paszport',
                                  clientName: 'Jan Nowak',
                                  readAt: null,
                                  clientDocumentId: 99,
                                  ...timestamps,
                              },
                          ]
                        : [],
                ),
                unreadCount: options.inbox ? 1 : 0,
            })

        if (path.startsWith('/calendars/'))
            return send({
                id: 11,
                managerId: 1,
                timeZone: 'Europe/Warsaw',
                ...timestamps,
            })

        if (path === '/clients/7/processes')
            return send(list(options.stage || options.inbox ? [process] : []))

        if (path === '/clients/7/processes/20') return send(process)

        if (path === '/clients/7/processes/20/stages')
            return send(list([stage]))

        if (path === '/clients/7/processes/20/stages/21') return send(stage)

        const stagePath = '/clients/7/processes/20/stages/21/notes'

        const clientPath = '/clients/7/notes'

        if (path === `${clientPath}/901`)
            return state.exactMissing
                ? send({ message: 'Not found' }, 404)
                : send(single)

        if (path === `${stagePath}/902`)
            return state.exactMissing
                ? send({ message: 'Not found' }, 404)
                : send(stageSingle)

        if (
            path === clientPath ||
            path === stagePath ||
            new RegExp(`^(${clientPath}|${stagePath})/\\d+$`).test(path)
        ) {
            const isStage = path.startsWith(stagePath)

            const records = isStage ? state.stageNotes : state.notes

            if (method === 'GET') return send(list(records))

            if (state.saveFailure) {
                state.saveFailure = false

                return send({ message: 'Unavailable' }, 503)
            }

            const dto = request.postDataJSON()

            const id = Number(path.split('/').at(-1)) || 100 + records.length

            const mentions = (dto.mentionedManagerIds ?? []).map(
                (id: number) => {
                    const row = employees.find((row) => row.id === id)!

                    return {
                        managerId: id,
                        label: `${row.name} ${row.surname}`,
                    }
                },
            )

            const note = {
                id,
                clientId: 7,
                clientStageId: 21,
                title: null,
                isPinned: false,
                createdByManagerId: 1,
                ...dto,
                mentions,
                ...timestamps,
            }

            if (isStage)
                state.stageNotes = [
                    ...state.stageNotes.filter((row) => row.id !== id),
                    note,
                ]
            else
                state.notes = [
                    ...state.notes.filter((row) => row.id !== id),
                    note,
                ]

            return send(note, method === 'POST' ? 201 : 200)
        }

        return send(list([]))
    })

    return state
}

async function shot(page: Page, name: string) {
    mkdirSync('/tmp/atimi-mention-shots', { recursive: true })

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)

    await page.screenshot({
        path: `/tmp/atimi-mention-shots/${name}.png`,
        fullPage: true,
    })
}

test('keyboard selects an @mention, saves plain text and IDs, then edit removes mention metadata without deleting text', async ({
    page,
}, info) => {
    const state = await mock(page)

    await page.goto('/main/clients/7?tab=notes')

    const panel = page.getByRole('region', {
        name: 'Notatki klienta',
        exact: true,
    })

    await panel
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    let dialog = page.getByRole('dialog', { name: 'Nowa notatka', exact: true })

    await dialog.getByLabel('Tytuł notatki').fill('Kontrola')

    const body = dialog.getByLabel('Treść notatki')

    await body.fill('Cześć @Pi')

    await expect(
        dialog.getByRole('option', { name: 'Piotr Nowak', exact: true }),
    ).toBeVisible()

    await expect(body).toHaveAttribute('aria-expanded', 'true')

    await body.press('ArrowDown')

    await body.press('Enter')

    await expect(
        dialog.getByRole('list', { name: 'Wybrane wzmianki' }),
    ).toContainText('@Piotr Nowak')

    await expect(body).toHaveValue('Cześć @Piotr Nowak ')

    await body.fill(
        'Cześć @Piotr Nowak sprawdź dokumenty.\n<img src=x onerror=alert(1)>',
    )

    await dialog.getByLabel('Przypnij notatkę').check()

    await shot(page, `client-form-${info.project.name}`)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    const note = panel.locator('li').filter({ hasText: 'Kontrola' })

    await expect(note).toContainText('@Piotr Nowak')

    await expect(note.locator('p span')).toHaveText('@Piotr Nowak')

    await expect(note.locator('img')).toHaveCount(0)

    const create = state.requests.find(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/clients/7/notes',
    )

    expect(create?.postDataJSON()).toMatchObject({
        title: 'Kontrola',
        isPinned: true,
        mentionedManagerIds: [2],
    })

    await note
        .getByRole('button', { name: 'Edytuj Kontrola', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Edytuj notatkę', exact: true })

    await dialog
        .getByRole('button', { name: 'Usuń wzmiankę Piotr Nowak' })
        .click()

    await expect(dialog.getByLabel('Treść notatki')).toContainText(
        '@Piotr Nowak',
    )

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    await expect(panel.locator('p span')).toHaveCount(0)

    expect(
        state.requests
            .find(
                (request) =>
                    request.method() === 'PATCH' &&
                    new URL(request.url()).pathname === '/clients/7/notes/100',
            )
            ?.postDataJSON().mentionedManagerIds,
    ).toEqual([])
})

test('employee popup handles Escape, click selection, server failure retry and preserves selected mentions after save failure', async ({
    page,
}, info) => {
    const state = await mock(page, { private: true })

    await page.goto('/main/clients/7?tab=notes')

    await page
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Nowa notatka',
        exact: true,
    })

    const body = dialog.getByLabel('Treść notatki')

    await body.fill('@')

    await expect(
        dialog.getByRole('option', { name: 'Ewa Zielińska' }),
    ).toBeVisible()

    await expect(
        dialog.getByRole('option', { name: 'Piotr Nowak' }),
    ).toHaveCount(0)

    await body.press('Escape')

    await expect(dialog).toBeVisible()

    await expect(dialog.getByRole('listbox')).toHaveCount(0)

    await body.fill('@Ewa')

    await dialog.getByRole('option', { name: 'Ewa Zielińska' }).click()

    await expect(dialog).toContainText('Wzmianka nie zmienia uprawnień.')

    state.saveFailure = true

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(
        dialog.getByRole('list', { name: 'Wybrane wzmianki' }),
    ).toContainText('@Ewa Zielińska')

    await shot(page, `retry-${info.project.name}`)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(state.notes[0].mentions).toEqual([
        { managerId: 3, label: 'Ewa Zielińska' },
    ])
})

test('stage note mention shares picker and persists IDs; exact stage-note deep link renders outside first page', async ({
    page,
}, info) => {
    const state = await mock(page, { stage: true })

    await page.goto('/main/clients/7?processId=20&stageId=21')

    let panel = page.getByRole('region', { name: 'Notatki etapu', exact: true })

    await panel
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Dodaj notatkę',
        exact: true,
    })

    await dialog.getByLabel('Treść notatki').fill('@Pi')

    await dialog
        .getByRole('option', { name: 'Piotr Nowak', exact: true })
        .click()

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    await expect(panel.locator('p span')).toHaveText('@Piotr Nowak')

    const create = state.requests.find(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname.endsWith('/stages/21/notes'),
    )

    expect(create?.postDataJSON().mentionedManagerIds).toEqual([2])

    await page.goto('/main/clients/7?processId=20&stageId=21&stageNoteId=902')

    panel = page.getByRole('region', { name: 'Notatki etapu', exact: true })

    const target = panel.locator('#stage-note-902')

    await expect(target).toContainText('Wzmianka w etapie')

    await expect(target).toHaveCSS('outline-style', 'solid')

    await shot(page, `stage-target-${info.project.name}`)
})

test('one inbox combines document and mention counts, retries mark-read and opens exact client note without first-page dependency', async ({
    page,
}, info) => {
    const state = await mock(page, { inbox: true })

    await page.goto('/main/clients/7')

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 3 nieprzeczytanych',
            exact: true,
        })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Powiadomienia',
        exact: true,
    })

    await expect(dialog).toContainText('Przesłany paszport')

    await expect(dialog).toContainText('Wzmianka poza pierwszą stroną')

    const card = dialog
        .locator('article')
        .filter({ hasText: 'Wzmianka poza pierwszą stroną' })

    state.readFailure = true

    await card
        .getByRole('button', { name: 'Oznacz jako przeczytane', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie udało się oznaczyć wzmianki',
    )

    await card
        .getByRole('button', { name: 'Oznacz jako przeczytane', exact: true })
        .click()

    await expect(
        page.getByRole('button', {
            name: 'Powiadomienia: 2 nieprzeczytanych',
            exact: true,
        }),
    ).toBeVisible()

    await shot(page, `inbox-${info.project.name}`)

    await card
        .getByRole('link', { name: 'Otwórz notatkę', exact: true })
        .click()

    await expect(page).toHaveURL(/tab=notes&noteId=901/)

    const target = page.locator('#client-note-901')

    await expect(target).toContainText('Wzmianka poza pierwszą stroną')

    await expect(target.locator('img')).toHaveCount(0)

    await expect(target).toHaveCSS('outline-style', 'solid')

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 2 nieprzeczytanych',
            exact: true,
        })
        .click()

    dialog = page.getByRole('dialog', { name: 'Powiadomienia', exact: true })

    await expect(
        dialog
            .locator('article')
            .filter({ hasText: 'Wzmianka w etapie' })
            .getByRole('link', { name: 'Otwórz notatkę' }),
    ).toHaveAttribute(
        'href',
        '/main/clients/7?processId=20&stageId=21&stageNoteId=902',
    )
})

test('foreign shared notes display mentions read-only and plain typed @name without selection sends no notification IDs', async ({
    page,
}) => {
    const state = await mock(page)

    await page.goto('/main/clients/7?tab=notes')

    await page
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Nowa notatka',
        exact: true,
    })

    await dialog.getByLabel('Treść notatki').fill('Ręcznie @Piotr Nowak')

    await dialog.getByLabel('Treść notatki').press('Escape')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    const create = state.requests.find(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/clients/7/notes',
    )

    expect(create?.postDataJSON().mentionedManagerIds).toBeUndefined()

    await page.unroute('**:4201/**')

    await mock(page, { foreign: true })

    await page.goto('/main/clients/7?tab=notes&noteId=901')

    const panel = page.getByRole('region', {
        name: 'Notatki klienta',
        exact: true,
    })

    await expect(panel.locator('#client-note-901 p span')).toHaveText(
        '@Piotr Nowak',
    )

    await expect(
        panel.getByRole('button', { name: /Dodaj notatkę|Edytuj|Usuń/ }),
    ).toHaveCount(0)
})

test('deleted exact targets disappear after a notification refresh returns404, including cached outside-page notes', async ({
    page,
}) => {
    const state = await mock(page, { inbox: true })

    await page.goto('/main/clients/7?tab=notes&noteId=901')

    await expect(page.locator('#client-note-901')).toBeVisible()

    state.exactMissing = true

    state.notifications[0].title = 'Odświeżenie notatki'

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 3 nieprzeczytanych',
            exact: true,
        })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Powiadomienia',
        exact: true,
    })

    await expect(dialog).toContainText('Odświeżenie notatki')

    await dialog
        .getByRole('button', { name: 'Zamknij okno', exact: true })
        .click()

    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Ta notatka jest niedostępna' }),
    ).toBeVisible()

    await expect(page.locator('#client-note-901')).toHaveCount(0)

    state.exactMissing = false

    await page.goto('/main/clients/7?processId=20&stageId=21&stageNoteId=902')

    await expect(page.locator('#stage-note-902')).toBeVisible()

    state.exactMissing = true

    state.notifications[1].title = 'Odświeżenie etapu'

    await page
        .getByRole('button', {
            name: 'Powiadomienia: 3 nieprzeczytanych',
            exact: true,
        })
        .click()

    dialog = page.getByRole('dialog', { name: 'Powiadomienia', exact: true })

    await expect(dialog).toContainText('Odświeżenie etapu')

    await dialog
        .getByRole('button', { name: 'Zamknij okno', exact: true })
        .click()

    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Ta notatka jest niedostępna' }),
    ).toBeVisible()

    await expect(page.locator('#stage-note-902')).toHaveCount(0)
})
