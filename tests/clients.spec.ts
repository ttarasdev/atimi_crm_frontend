import { selectOption } from './helpers/select-option'
import type { StageTemplate } from '../src/api/stage-templates/stage-templates.types'
import {
    test,
    expect,
    type Page,
    type Request,
    type Route,
} from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'
import type { Client, CreateClientDto } from '../src/api/clients/clients.types'
import type { ClientProcess } from '../src/api/client-processes/client-processes.types'
import type {
    ClientProcessStage,
    CreateClientProcessStageDto,
} from '../src/api/client-process-stages/client-process-stages.types'
import type {
    CalendarEvent,
    CalendarReminder,
    CalendarDeadline,
} from '../src/api/calendars/calendars.types'
import type {
    ClientContact,
    ClientPreference,
    ClientNote,
    ClientDocument,
    CreateClientContactDto,
    CreateClientPreferenceDto,
    CreateClientNoteDto,
    CreateClientDocumentDto,
} from '../src/api/client-records/client-records.types'
import type {
    ClientStageNote,
    ClientStageDocument,
    CreateClientStageTaskDto,
    CreateClientStageReminderDto,
    CreateClientStageNoteDto,
    CreateClientStageDocumentDto,
} from '../src/api/client-stage-records/client-stage-records.types'
import type { TaskType } from '../src/api/task-types/task-types.types'
import {
    PrivateBucket,
    type PrivateAsset,
} from '../src/api/private-assets/private-assets.types'

const time = {
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
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
    roles: [
        { id: 1, name: 'admin' },
        { id: 2, name: 'manager' },
    ],
    ...time,
}

const types: TaskType[] = [
    {
        id: 3,
        name: 'Zadanie',
        iconId: 150,
        color: '#4676B4',
        reminderMinutes: [15],
        isActive: true,
        isDefault: true,
        ...time,
    },
    {
        id: 6,
        name: 'Dokumenty',
        iconId: 149,
        color: '#7390BA',
        reminderMinutes: [60],
        isActive: true,
        isDefault: false,
        ...time,
    },
]

const calendar = { id: 11, managerId: 1, timeZone: 'Europe/Warsaw', ...time }

function client(
    id: number,
    name: string,
    changes: Partial<Client> = {},
): Client {
    return {
        id,
        isPrivate: true,
        name,
        surname: 'Nowak',
        managerId: 1,
        sourceId: 1,
        language: 'pl',
        address: 'Warszawa, Mokotów',
        preferredContactTime: 'Po 17:00',
        status: 'active',
        priority: 'normal',
        paymentStatus: 'unpaid',
        archivedAt: null,
        ...time,
        ...changes,
    }
}

function stage(id: number, title: string, processId = 1): ClientProcessStage {
    return {
        id,
        clientProcessId: processId,
        stageTemplateId: 1,
        title,
        iconId: 150,
        color: '#4676B4',
        assignedManagerId: null,
        sortKey: id * 1000,
        status: 'active',
        plannedAt: null,
        completedAt: null,
        ...time,
    }
}

function task(id: number, title: string, stageId = 1): CalendarEvent {
    return {
        id,
        clientStageId: stageId,
        calendarId: null,
        title,
        description: 'Krótki opis zadania.',
        taskTypeId: 3,
        taskType: types[0],
        date: null,
        startAt: null,
        endAt: null,
        location: null,
        isDone: false,
        doneAt: null,
        sortKey: id * 1000,
        assignedManagerId: null,
        dueAt: null,
        seriesKey: null,
        repeat: null,
        repeatUntil: null,
        timeZone: null,
        ...time,
    }
}

interface Mock {
    manager: Manager
    clients: Client[]
    templates: StageTemplate[]
    processes: ClientProcess[]
    stages: ClientProcessStage[]
    tasks: CalendarEvent[]
    reminders: CalendarReminder[]
    deadlines: CalendarDeadline[]
    stageNotes: ClientStageNote[]
    stageDocuments: ClientStageDocument[]
    contacts: ClientContact[]
    preferences: ClientPreference[]
    notes: ClientNote[]
    documents: ClientDocument[]
    assets: PrivateAsset[]
    requests: Request[]
    failMutation: number
    failPath?: string
    listFails: boolean
    gate?: Promise<void>
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

async function mockClients(page: Page): Promise<Mock> {
    let nextAssetId = 90

    const mock: Mock = {
        manager,
        clients: [
            client(1, 'Ewa'),
            client(2, 'Piotr', { status: 'new', priority: 'vip' }),
            client(3, 'Jan', { archivedAt: time.createdAt, status: 'lost' }),
        ],
        templates: [
            {
                id: 1,
                title: 'Pierwszy kontakt',
                iconId: 150,
                color: '#4676B4',
                description: 'Rozpoczęcie współpracy',
                isActive: true,
                ...time,
            },
        ],
        processes: [
            {
                id: 1,
                clientId: 1,
                managerId: 1,
                title: 'Zakup mieszkania',
                status: 'active',
                completedAt: null,
                ...time,
            },
            {
                id: 2,
                clientId: 1,
                managerId: 1,
                title: 'Sprzedaż domu',
                status: 'active',
                completedAt: null,
                ...time,
            },
        ],
        stages: [stage(1, 'Analiza potrzeb')],
        tasks: [task(1, 'Poznać potrzeby')],
        reminders: [],
        deadlines: [],
        stageNotes: [],
        stageDocuments: [],
        contacts: [],
        preferences: [],
        notes: [],
        documents: [],
        assets: [
            {
                id: 70,
                bucket: PrivateBucket.MANAGER_DOCUMENTS,
                relPath: 'demo/informacja.pdf',
                originalName: 'Informacja.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 128,
                visibility: 'author',
                createdByManagerId: 1,
                ...time,
            },
        ],
        requests: [],
        failMutation: 0,
        listFails: false,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'client-workspace-test'),
    )

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const method = request.method()

        const url = new URL(request.url())

        const path = url.pathname

        const json = (data: unknown, status = 200) =>
            route.fulfill({
                status,
                json: data,
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

        mock.requests.push(request)

        if (method !== 'GET') {
            if (mock.gate) await mock.gate

            if (
                mock.failMutation > 0 &&
                (!mock.failPath || mock.failPath === path)
            ) {
                mock.failMutation--

                return json({ message: 'Mutation failed' }, 500)
            }
        }

        if (path === '/managers/me') return json(mock.manager)

        if (path === '/document-upload-notifications' && method === 'GET')
            return json({ ...list(url, []), unreadCount: 0 })

        if (
            /^\/clients\/\d+\/document-requests$/.test(path) &&
            method === 'GET'
        )
            return json(list(url, []))

        if (path === '/managers') return json(list(url, [mock.manager]))

        if (path === '/client-sources')
            return json(
                list(url, [{ id: 1, name: 'Polecenie', isActive: true }]),
            )

        if (path.startsWith('/calendars/manager/')) return json(calendar)

        if (path === '/task-types') return json(list(url, types))

        if (path === '/stage-templates')
            return json(
                list(
                    url,
                    mock.templates.filter(
                        (item) =>
                            !url.searchParams.has('isActive') ||
                            item.isActive ===
                                (url.searchParams.get('isActive') === 'true'),
                    ),
                ),
            )

        if (path === '/public-assets')
            return json(
                list(url, [
                    {
                        id: 150,
                        bucket: 'icons',
                        isPopular: true,
                        originalName: 'house.png',
                        mimeType: 'image/png',
                        sizeBytes: 100,
                        relPath: 'icons/house.png',
                        createdByManagerId: 1,
                        ...time,
                    },
                ]),
            )

        if (/^\/public-assets\/\d+\/file$/.test(path))
            return route.fulfill({
                body: readFileSync('tests/fixtures/icons/house.png'),
                contentType: 'image/png',
                headers: { 'access-control-allow-origin': '*' },
            })

        if (path === '/private-assets' && method === 'GET')
            return json(
                list(
                    url,
                    mock.assets.filter(
                        (asset) =>
                            !url.searchParams.get('bucket') ||
                            asset.bucket === url.searchParams.get('bucket'),
                    ),
                ),
            )

        if (path === '/private-assets' && method === 'POST') {
            const originalName = /name="originalName"\r\n\r\n([^\r\n]+)/.exec(
                request.postData() ?? '',
            )?.[1]

            expect(originalName).toBeTruthy()

            const asset = {
                ...mock.assets[0],
                id: nextAssetId++,
                bucket: PrivateBucket.CLIENT_DOCUMENTS,
                originalName: originalName!,
            }

            mock.assets.push(asset)

            return json(asset, 201)
        }

        const assetPath = path.match(/^\/private-assets\/(\d+)(\/file)?$/)

        if (assetPath) {
            const asset = mock.assets.find(
                (item) => item.id === Number(assetPath[1]),
            )

            if (method === 'DELETE') {
                mock.assets = mock.assets.filter(
                    (item) => item.id !== Number(assetPath[1]),
                )

                return json({ success: true })
            }

            if (assetPath[2])
                return route.fulfill({
                    body: '%PDF-demo',
                    contentType: 'application/pdf',
                    headers: { 'access-control-allow-origin': '*' },
                })

            return json(asset)
        }

        const nested = path.match(
            /^\/clients\/(\d+)\/processes(?:\/(\d+))?(?:\/(status|stages)(?:\/(\d+))?(?:\/(status|order|tasks|reminders|deadlines|notes|documents))?(?:\/(\d+))?(?:\/(order))?)?$/,
        )

        if (nested) return processRoute(route, url, mock, nested)

        const record = path.match(
            /^\/clients\/(\d+)\/(contacts|preferences|notes|documents)(?:\/(\d+))?$/,
        )

        if (record) return recordRoute(route, url, mock, record)

        if (path === '/clients') {
            if (method === 'GET') {
                if (mock.listFails) return json({ message: 'Unavailable' }, 500)

                const search = url.searchParams.get('search')?.toLowerCase()

                return json(
                    list(
                        url,
                        mock.clients.filter(
                            (item) =>
                                !!item.archivedAt ===
                                    (url.searchParams.get('archived') ===
                                        'true') &&
                                (!search ||
                                    `${item.name} ${item.surname}`
                                        .toLowerCase()
                                        .includes(search)) &&
                                (!url.searchParams.get('status') ||
                                    item.status ===
                                        url.searchParams.get('status')) &&
                                (!url.searchParams.get('priority') ||
                                    item.priority ===
                                        url.searchParams.get('priority')) &&
                                (!url.searchParams.get('stageTemplateId') ||
                                    item.activeStage?.stageTemplateId ===
                                        Number(
                                            url.searchParams.get(
                                                'stageTemplateId',
                                            ),
                                        )) &&
                                (!url.searchParams.get('managerId') ||
                                    item.managerId ===
                                        Number(
                                            url.searchParams.get('managerId'),
                                        )),
                        ),
                    ),
                )
            }

            const dto = request.postDataJSON() as CreateClientDto

            const created = {
                ...client(50, dto.name),
                ...dto,
                managerId: dto.managerId ?? mock.manager.id,
            }

            mock.clients.push(created)

            return json(created, 201)
        }

        const detail = path.match(/^\/clients\/(\d+)(?:\/(archive|restore))?$/)

        if (detail) {
            const item = mock.clients.find(
                (entry) => entry.id === Number(detail[1]),
            )

            if (!item) return json({ message: 'Client not found' }, 404)

            if (detail[2])
                item.archivedAt =
                    detail[2] === 'archive' ? time.createdAt : null
            else if (method === 'PATCH')
                Object.assign(item, request.postDataJSON())

            return json(item)
        }

        return json({ message: `Unexpected mock endpoint ${path}` }, 404)
    })

    return mock
}

async function recordRoute(
    route: Route,
    url: URL,
    mock: Mock,
    match: RegExpMatchArray,
) {
    const method = route.request().method()

    const clientId = Number(match[1])

    const id = Number(match[3])

    const json = (data: unknown, status = 200) =>
        route.fulfill({
            status,
            json: data,
            headers: { 'access-control-allow-origin': '*' },
        })

    const kind = match[2]

    if (method === 'GET') {
        if (kind === 'contacts')
            return json(
                list(
                    url,
                    mock.contacts.filter((item) => item.clientId === clientId),
                ),
            )

        if (kind === 'preferences')
            return json(
                list(
                    url,
                    mock.preferences.filter(
                        (item) => item.clientId === clientId,
                    ),
                ),
            )

        if (kind === 'notes')
            return json(
                list(
                    url,
                    mock.notes.filter((item) => item.clientId === clientId),
                ),
            )

        return json(
            list(
                url,
                mock.documents.filter((item) => item.clientId === clientId),
            ),
        )
    }

    if (method === 'DELETE') {
        if (kind === 'contacts')
            mock.contacts = mock.contacts.filter((item) => item.id !== id)

        if (kind === 'preferences')
            mock.preferences = mock.preferences.filter((item) => item.id !== id)

        if (kind === 'notes')
            mock.notes = mock.notes.filter((item) => item.id !== id)

        if (kind === 'documents')
            mock.documents = mock.documents.filter((item) => item.id !== id)

        return json({ success: true })
    }

    if (kind === 'contacts') {
        const dto = route.request().postDataJSON() as CreateClientContactDto

        if (id) {
            const item = mock.contacts.find((row) => row.id === id)

            Object.assign(item ?? {}, dto)

            return json(item)
        }

        const item: ClientContact = {
            id: 100 + mock.contacts.length,
            clientId,
            label: null,
            isPrimary: false,
            ...dto,
            ...time,
        }

        mock.contacts.push(item)

        return json(item, 201)
    }

    if (kind === 'preferences') {
        const dto = route.request().postDataJSON() as CreateClientPreferenceDto

        if (id) {
            const item = mock.preferences.find((row) => row.id === id)

            Object.assign(item ?? {}, dto)

            return json(item)
        }

        const item: ClientPreference = {
            id: 100 + mock.preferences.length,
            clientId,
            propertyType: null,
            budgetMin: null,
            budgetMax: null,
            currency: 'PLN',
            areaMin: null,
            areaMax: null,
            roomsMin: null,
            roomsMax: null,
            locations: null,
            requirements: null,
            desiredBy: null,
            ...dto,
            ...time,
        }

        mock.preferences.push(item)

        return json(item, 201)
    }

    if (kind === 'notes') {
        const dto = route.request().postDataJSON() as CreateClientNoteDto

        if (id) {
            const item = mock.notes.find((row) => row.id === id)

            Object.assign(item ?? {}, dto)

            return json(item)
        }

        const item: ClientNote = {
            id: 100 + mock.notes.length,
            clientId,
            title: null,
            isPinned: false,
            createdByManagerId: 1,
            ...dto,
            ...time,
        }

        mock.notes.push(item)

        return json(item, 201)
    }

    const dto = route.request().postDataJSON() as CreateClientDocumentDto

    if (id) {
        const item = mock.documents.find((row) => row.id === id)

        Object.assign(item ?? {}, dto)

        return json(item)
    }

    const item: ClientDocument = {
        id: 100 + mock.documents.length,
        clientId,
        category: null,
        createdByManagerId: 1,
        ...dto,
        ...time,
    }

    mock.documents.push(item)

    return json(item, 201)
}

async function processRoute(
    route: Route,
    url: URL,
    mock: Mock,
    match: RegExpMatchArray,
) {
    const method = route.request().method()

    const clientId = Number(match[1])

    const processId = Number(match[2])

    const stageId = Number(match[4])

    const kind = match[5]

    const recordId = Number(match[6])

    const json = (data: unknown, status = 200) =>
        route.fulfill({
            status,
            json: data,
            headers: { 'access-control-allow-origin': '*' },
        })

    if (match[3] === 'status') {
        const process = mock.processes.find((item) => item.id === processId)

        const dto = route.request().postDataJSON() as {
            status: ClientProcess['status']
        }

        if (
            dto.status === 'completed' &&
            mock.stages.some(
                (item) =>
                    item.clientProcessId === processId &&
                    item.status !== 'done',
            )
        )
            return json({ message: 'Complete stages first' }, 409)

        if (process) process.status = dto.status

        return json(process)
    }

    if (match[3] !== 'stages') {
        if (method === 'GET')
            return json(
                list(
                    url,
                    mock.processes.filter((item) => item.clientId === clientId),
                ),
            )

        const dto = route.request().postDataJSON() as { title: string }

        if (processId) {
            const process = mock.processes.find((item) => item.id === processId)

            if (process) process.title = dto.title

            return json(process)
        }

        const process: ClientProcess = {
            id: 100 + mock.processes.length,
            clientId,
            managerId: 1,
            title: dto.title,
            status: 'active',
            completedAt: null,
            ...time,
        }

        mock.processes.push(process)

        return json(process, 201)
    }

    if (kind && kind !== 'order' && kind !== 'status')
        return stageRecordRoute(
            route,
            url,
            mock,
            stageId,
            kind,
            recordId,
            !!match[7],
        )

    if (method === 'GET')
        return json(
            list(
                url,
                mock.stages
                    .filter((item) => item.clientProcessId === processId)
                    .sort((a, b) => a.sortKey - b.sortKey || a.id - b.id),
            ),
        )

    const found = mock.stages.find((item) => item.id === stageId)

    if (method === 'DELETE') {
        if (
            [
                mock.tasks,
                mock.reminders,
                mock.deadlines,
                mock.stageNotes,
                mock.stageDocuments,
            ].some((rows) =>
                rows.some((item) => item.clientStageId === stageId),
            )
        )
            return json({ message: 'Remove contents first' }, 409)

        mock.stages = mock.stages.filter((item) => item.id !== stageId)

        return json({ success: true })
    }

    if (kind === 'status') {
        const dto = route.request().postDataJSON() as {
            status: ClientProcessStage['status']
        }

        if (
            dto.status === 'done' &&
            mock.tasks.some(
                (item) => item.clientStageId === stageId && !item.isDone,
            )
        )
            return json({ message: 'Complete tasks first' }, 409)

        if (found) {
            const wasActive = found.status === 'active'

            if (dto.status === 'active')
                for (const item of mock.stages)
                    if (
                        item.clientProcessId === processId &&
                        item.status === 'active'
                    )
                        item.status = 'planned'

            found.status = dto.status

            found.completedAt = dto.status === 'done' ? time.updatedAt : null

            if (dto.status === 'done' && wasActive) {
                const next = mock.stages
                    .filter(
                        (item) =>
                            item.clientProcessId === processId &&
                            item.status === 'planned' &&
                            (item.sortKey > found.sortKey ||
                                (item.sortKey === found.sortKey &&
                                    item.id > found.id)),
                    )
                    .sort((a, b) => a.sortKey - b.sortKey || a.id - b.id)[0]

                if (next) next.status = 'active'
            }
        }

        return json(found)
    }

    if (kind === 'order') {
        const siblings = mock.stages
            .filter((item) => item.clientProcessId === processId)
            .sort((a, b) => a.sortKey - b.sortKey || a.id - b.id)

        const index = siblings.findIndex((item) => item.id === stageId)

        const dto = route.request().postDataJSON() as {
            direction: 'up' | 'down'
        }

        const target = index + (dto.direction === 'up' ? -1 : 1)

        if (target >= 0 && target < siblings.length)
            [siblings[index], siblings[target]] = [
                siblings[target],
                siblings[index],
            ]

        siblings.forEach((item, index) => {
            item.sortKey = (index + 1) * 1000
        })

        return json(siblings)
    }

    const dto = route.request().postDataJSON() as CreateClientProcessStageDto

    if (found) {
        if (!mock.manager.roles.some((role) => role.name === 'admin'))
            return json({ message: 'Forbidden' }, 403)

        Object.assign(found, dto)

        return json(found)
    }

    const created = {
        ...stage(
            100 + mock.stages.length,
            dto.stageTemplateId ? 'Pierwszy kontakt' : (dto.title ?? 'Etap'),
            processId,
        ),
        ...dto,
        status: mock.stages.some(
            (item) =>
                item.clientProcessId === processId && item.status === 'active',
        )
            ? ('planned' as const)
            : ('active' as const),
        sortKey:
            Math.max(
                0,
                ...mock.stages
                    .filter((item) => item.clientProcessId === processId)
                    .map((item) => item.sortKey),
            ) + 1000,
    }

    mock.stages.push(created)

    if (dto.stageTemplateId)
        mock.tasks.push(
            task(100 + mock.tasks.length, 'Domyślna rozmowa', created.id),
        )

    return json(created, 201)
}

async function stageRecordRoute(
    route: Route,
    url: URL,
    mock: Mock,
    stageId: number,
    kind: string,
    id: number,
    order: boolean,
) {
    const method = route.request().method()

    const json = (data: unknown, status = 200) =>
        route.fulfill({
            status,
            json: data,
            headers: { 'access-control-allow-origin': '*' },
        })

    if (method === 'GET') {
        if (kind === 'tasks')
            return json(
                list(
                    url,
                    mock.tasks.filter((item) => item.clientStageId === stageId),
                ),
            )

        if (kind === 'reminders')
            return json(
                list(
                    url,
                    mock.reminders.filter(
                        (item) => item.clientStageId === stageId,
                    ),
                ),
            )

        if (kind === 'deadlines')
            return json(
                list(
                    url,
                    mock.deadlines.filter(
                        (item) => item.clientStageId === stageId,
                    ),
                ),
            )

        if (kind === 'notes')
            return json(
                list(
                    url,
                    mock.stageNotes.filter(
                        (item) => item.clientStageId === stageId,
                    ),
                ),
            )

        return json(
            list(
                url,
                mock.stageDocuments.filter(
                    (item) => item.clientStageId === stageId,
                ),
            ),
        )
    }

    if (method === 'DELETE') {
        const everywhere = url.searchParams.get('deleteScope') === 'everywhere'

        if (kind === 'tasks')
            mock.tasks = mock.tasks.filter((item) => {
                if (item.id === id && item.calendarId && !everywhere) {
                    item.clientStageId = null

                    return true
                }

                return item.id !== id
            })

        if (kind === 'reminders')
            mock.reminders = mock.reminders.filter((item) => item.id !== id)

        if (kind === 'deadlines')
            mock.deadlines = mock.deadlines.filter((item) => item.id !== id)

        if (kind === 'notes')
            mock.stageNotes = mock.stageNotes.filter((item) => item.id !== id)

        if (kind === 'documents')
            mock.stageDocuments = mock.stageDocuments.filter(
                (item) => item.id !== id,
            )

        return json({ success: true })
    }

    if (kind === 'tasks') {
        const dto = route.request().postDataJSON() as CreateClientStageTaskDto

        if (order) return json(mock.tasks)

        if (id) {
            const item = mock.tasks.find((row) => row.id === id)

            Object.assign(item ?? {}, dto, {
                taskType:
                    types.find((type) => type.id === dto.taskTypeId) ??
                    item?.taskType,
            })

            return json(item)
        }

        const item = {
            ...task(100 + mock.tasks.length, dto.title, stageId),
            ...dto,
            taskType:
                types.find((type) => type.id === dto.taskTypeId) ?? types[0],
        }

        mock.tasks.push(item)

        return json(item, 201)
    }

    if (kind === 'reminders') {
        const dto = route
            .request()
            .postDataJSON() as CreateClientStageReminderDto

        if (id) {
            const item = mock.reminders.find((row) => row.id === id)

            Object.assign(item ?? {}, dto)

            return json(item)
        }

        const item: CalendarReminder = {
            id: 100 + mock.reminders.length,
            calendarId: 11,
            clientStageId: stageId,
            clientTaskId: null,
            managerId: 1,
            sentAt: null,
            ...dto,
            ...time,
        }

        mock.reminders.push(item)

        return json(item, 201)
    }

    if (kind === 'deadlines') {
        const dto = route.request().postDataJSON() as {
            title: string
            dueAt: string
            description?: string | null
            reminderMinutes: number[]
            isDone?: boolean
        }

        if (id) {
            const item = mock.deadlines.find((row) => row.id === id)

            Object.assign(item ?? {}, dto)

            return json(item)
        }

        const item: CalendarDeadline = {
            id: 100 + mock.deadlines.length,
            calendarId: 11,
            clientStageId: stageId,
            description: null,
            isDone: false,
            ...dto,
            ...time,
        }

        mock.deadlines.push(item)

        return json(item, 201)
    }

    if (kind === 'notes') {
        const dto = route.request().postDataJSON() as CreateClientStageNoteDto

        if (id) {
            const item = mock.stageNotes.find((row) => row.id === id)

            Object.assign(item ?? {}, dto)

            return json(item)
        }

        const item: ClientStageNote = {
            id: 100 + mock.stageNotes.length,
            clientStageId: stageId,
            title: null,
            ...dto,
            ...time,
        }

        mock.stageNotes.push(item)

        return json(item, 201)
    }

    const dto = route.request().postDataJSON() as CreateClientStageDocumentDto

    if (id) {
        const item = mock.stageDocuments.find((row) => row.id === id)

        Object.assign(item ?? {}, dto)

        return json(item)
    }

    const item: ClientStageDocument = {
        id: 100 + mock.stageDocuments.length,
        clientStageId: stageId,
        ...dto,
        ...time,
    }

    mock.stageDocuments.push(item)

    return json(item, 201)
}

function mutation(mock: Mock, path: string, method = 'POST') {
    return mock.requests
        .filter(
            (request) =>
                new URL(request.url()).pathname === path &&
                request.method() === method,
        )
        .at(-1)
}

async function openClient(page: Page) {
    await page.goto('/main/clients/1')

    await expect(
        page.getByRole('heading', { name: 'Ewa Nowak', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('checkbox', {
            name: 'Wykonane: Poznać potrzeby',
            exact: true,
        }),
    ).toBeVisible()
}

async function noOverflow(page: Page) {
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBeTruthy()
}

async function taskAction(
    page: Page,
    title: string,
    action: 'Edytuj' | 'Usuń',
) {
    await page
        .getByRole('button', { name: `Opcje ${title}`, exact: true })
        .click()

    await page
        .getByRole('button', { name: `${action} ${title}`, exact: true })
        .click()
}

test('filters clients by the current stage template, including archived library templates, and resets pagination', async ({
    page,
}, info) => {
    const mock = await mockClients(page)

    mock.clients = Array.from({ length: 32 }, (_, index) =>
        client(index + 1, `Klient ${index + 1}`, {
            activeStageId: null,
            activeStage: null,
        }),
    )

    mock.clients[0].activeStageId = 1

    mock.clients[0].activeStage = stage(1, 'Indywidualna analiza potrzeb')

    mock.clients[31].activeStageId = 32

    mock.clients[31].activeStage = {
        ...stage(32, 'Formalności klienta'),
        stageTemplateId: 101,
        color: '#7390BA',
    }

    mock.templates.push(
        ...Array.from({ length: 100 }, (_, index) => ({
            ...mock.templates[0],
            id: index + 2,
            title: index === 99 ? 'Formalności' : `Szablon ${index + 2}`,
            isActive: index !== 99,
        })),
    )

    await page.goto('/main/clients')

    await page.getByRole('button', { name: 'Pokaż więcej klientów' }).click()

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Klient 32 Nowak' }),
    ).toBeVisible()

    await selectOption(page.getByLabel('Aktualny etap', { exact: true }), '1')

    await expect(
        page.getByText('Indywidualna analiza potrzeb', { exact: false }),
    ).toBeVisible()

    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)

    const filteredRequests = mock.requests.filter((request) => {
        const url = new URL(request.url())

        return (
            url.pathname === '/clients' &&
            url.searchParams.get('stageTemplateId') === '1'
        )
    })

    expect(filteredRequests.length).toBeGreaterThan(0)

    expect(
        new URL(filteredRequests.at(-1)!.url()).searchParams.get('page'),
    ).toBe('1')

    expect(
        new URL(filteredRequests.at(-1)!.url()).searchParams.has('offset'),
    ).toBe(false)

    await page
        .getByRole('button', { name: 'Pokaż więcej szablonów etapów' })
        .click()

    await page.getByLabel('Aktualny etap', { exact: true }).click()

    await expect(
        page.getByRole('option', {
            name: 'Formalności (archiwalny)',
            exact: true,
        }),
    ).toBeVisible()

    await page
        .getByRole('option', { name: 'Formalności (archiwalny)', exact: true })
        .click()

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Klient 32 Nowak' }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Klient 1 Nowak' }),
    ).toHaveCount(0)

    await expect(
        page.getByText('Aktualny etap: Formalności klienta', { exact: true }),
    ).toBeVisible()

    expect(
        mock.requests.some((request) => {
            const url = new URL(request.url())

            return (
                url.pathname === '/stage-templates' &&
                url.searchParams.get('page') === '2' &&
                !url.searchParams.has('isActive')
            )
        }),
    ).toBe(true)

    await noOverflow(page)

    mkdirSync('/tmp/ivan-client-stage-filter-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-client-stage-filter-qa/${info.project.name}.png`,
        fullPage: true,
    })

    await page.getByRole('button', { name: 'Wyczyść filtry' }).click()

    await expect(page.getByLabel('Aktualny etap', { exact: true })).toHaveText(
        'Aktualny etap: Wszystkie',
    )

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Klient 2 Nowak' }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Klient 2 Nowak' }),
    ).not.toContainText('Aktualny etap:')
})

test('refreshes the client stage summary and cached client list after changing the active stage', async ({
    page,
}) => {
    const mock = await mockClients(page)

    mock.clients[0].activeStageId = 1

    mock.clients[0].activeStage = mock.stages[0]

    mock.stages.push({ ...stage(2, 'Formalności'), status: 'planned' })

    await page.route(
        '**:4201/clients/1/processes/1/stages/2/status',
        async (route) => {
            mock.stages[0].status = 'planned'

            mock.stages[1].status = 'active'

            mock.clients[0].activeStageId = 2

            mock.clients[0].activeStage = mock.stages[1]

            await route.fulfill({
                json: mock.stages[1],
                headers: { 'access-control-allow-origin': '*' },
            })
        },
    )

    await page.goto('/main/clients')

    await expect(
        page.getByText('Aktualny etap: Analiza potrzeb', { exact: true }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Otwórz klienta Ewa Nowak' }).click()

    await page
        .getByRole('button', { name: 'Wybierz etap Formalności', exact: true })
        .click()

    const initialDetailRequests = mock.requests.filter(
        (request) => new URL(request.url()).pathname === '/clients/1',
    ).length

    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Potwierdź', exact: true })
        .click()

    await expect(
        page.getByRole('button', {
            name: 'Wybierz etap Formalności',
            exact: true,
        }),
    ).toHaveAttribute('aria-current', 'step')

    await expect
        .poll(
            () =>
                mock.requests.filter(
                    (request) =>
                        new URL(request.url()).pathname === '/clients/1',
                ).length,
        )
        .toBeGreaterThan(initialDetailRequests)

    await page.goBack()

    await expect(
        page.getByText('Aktualny etap: Formalności', { exact: true }),
    ).toBeVisible()

    await expect(
        page.getByText('Aktualny etap: Analiza potrzeb', { exact: true }),
    ).toHaveCount(0)
})

test('filters clients and keeps separate cases collapsible', async ({
    page,
}, info) => {
    await mockClients(page)

    await page.goto('/main/clients')

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Ewa Nowak' }),
    ).toBeVisible()

    await noOverflow(page)

    mkdirSync('/tmp/ivan-clients-redesign-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-clients-redesign-qa/list-${info.project.name}.png`,
        fullPage: true,
    })

    await selectOption(page.getByLabel('Status', { exact: true }), 'new')

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Piotr Nowak' }),
    ).toBeVisible()

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Ewa Nowak' }),
    ).toHaveCount(0)

    await selectOption(page.getByLabel('Status', { exact: true }), '')

    await page.getByLabel('Szukaj klienta').fill('Ewa')

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Piotr Nowak' }),
    ).toHaveCount(0)

    await page.getByRole('link', { name: 'Otwórz klienta Ewa Nowak' }).click()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' }),
    ).toBeVisible()

    await page
        .locator('summary[aria-label="Zwiń sprawę Zakup mieszkania"]')
        .click()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' }),
    ).toBeHidden()

    await page
        .locator('summary[aria-label="Rozwiń sprawę Zakup mieszkania"]')
        .click()

    await page
        .locator('summary[aria-label="Rozwiń sprawę Sprzedaż domu"]')
        .click()

    await expect(
        page.getByText('Wybierz etapy z konstruktora lub dodaj własny etap.', {
            exact: true,
        }),
    ).toBeVisible()

    await noOverflow(page)

    await page.evaluate(() => window.scrollTo(0, 0))

    mkdirSync('/tmp/ivan-clients-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-clients-qa/client-${info.project.name}.png`,
        fullPage: true,
    })
})

test('stage rail selects one workspace and keeps client information below collapsible cases', async ({
    page,
}, info) => {
    const mock = await mockClients(page)

    mock.stages.push(
        ...Array.from({ length: 8 }, (_, index) => ({
            ...stage(index + 2, `Kolejny etap ${index + 2}`),
            status: 'planned' as const,
            color: index % 2 ? '#B18B4E' : '#7390BA',
        })),
    )

    mock.tasks.push(task(2, 'Zadanie kolejnego etapu', 2))

    mock.stageNotes.push({
        id: 1,
        clientStageId: 1,
        title: 'Ustalenia prezentacji',
        body: 'Klient szuka mieszkania z balkonem i miejscem parkingowym.',
        createdAt: time.createdAt,
    })

    mock.stageDocuments.push({
        id: 1,
        clientStageId: 1,
        privateAssetId: 70,
        title: 'Oferta mieszkania.pdf',
        ...time,
    })

    mock.reminders.push({
        id: 1,
        calendarId: 11,
        managerId: 1,
        clientStageId: 1,
        clientTaskId: null,
        title: 'Prezentacja za 30 minut',
        remindAt: '2026-10-20T11:30:00Z',
        sentAt: null,
        ...time,
    })

    mock.deadlines.push({
        id: 1,
        calendarId: 11,
        clientStageId: 1,
        title: 'Przesłać potwierdzenie',
        description: null,
        dueAt: '2026-10-20T14:00:00Z',
        reminderMinutes: [60],
        isDone: false,
        ...time,
    })

    await openClient(page)

    const firstStage = page.getByRole('button', {
        name: 'Wybierz etap Analiza potrzeb',
        exact: true,
    })

    const secondStage = page.getByRole('button', {
        name: 'Wybierz etap Kolejny etap 2',
        exact: true,
    })

    await expect(firstStage).toHaveAttribute('aria-pressed', 'true')

    await expect(
        page.getByRole('region', { name: /^Wybrany etap / }),
    ).toHaveCount(1)

    await expect(
        page.getByRole('checkbox', {
            name: 'Wykonane: Zadanie kolejnego etapu',
        }),
    ).toHaveCount(0)

    await secondStage.click()

    await expect(secondStage).toHaveAttribute('aria-pressed', 'true')

    await expect(firstStage).toHaveAttribute('aria-pressed', 'false')

    await expect(
        page.getByRole('region', { name: 'Wybrany etap Kolejny etap 2' }),
    ).toBeVisible()

    await expect(
        page.getByRole('checkbox', {
            name: 'Wykonane: Zadanie kolejnego etapu',
        }),
    ).toBeVisible()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' }),
    ).toHaveCount(0)

    const lastStage = page.getByRole('button', {
        name: 'Wybierz etap Kolejny etap 9',
        exact: true,
    })

    await lastStage.focus()

    await lastStage.press('Enter')

    await expect(lastStage).toHaveAttribute('aria-pressed', 'true')

    await expect(
        page.getByRole('region', { name: 'Wybrany etap Kolejny etap 9' }),
    ).toBeVisible()

    await noOverflow(page)

    const information = page.getByRole('navigation', {
        name: 'Sekcje karty klienta',
    })

    const cases = page.getByRole('region', { name: 'Sprawy klienta' })

    const caseBounds = await cases.boundingBox()

    const informationBounds = await information.boundingBox()

    expect(caseBounds).not.toBeNull()

    expect(informationBounds).not.toBeNull()

    if (!caseBounds || !informationBounds)
        throw new Error('Client cases and information must have visible bounds')

    expect(informationBounds.y).toBeGreaterThan(
        caseBounds.y + caseBounds.height - 1,
    )

    await expect(
        page.getByText('Warszawa, Mokotów', { exact: true }),
    ).toBeVisible()

    await page
        .locator('summary[aria-label="Zwiń sprawę Zakup mieszkania"]')
        .click()

    await expect(
        page.getByRole('region', { name: /^Wybrany etap / }),
    ).toHaveCount(0)

    await expect(information).toBeVisible()

    await expect(
        page.getByText('Warszawa, Mokotów', { exact: true }),
    ).toBeVisible()

    await page
        .locator('summary[aria-label="Rozwiń sprawę Zakup mieszkania"]')
        .click()

    await expect(lastStage).toHaveAttribute('aria-pressed', 'true')

    await noOverflow(page)

    await firstStage.click()

    await expect(
        page.getByRole('region', { name: 'Notatki etapu', exact: true }),
    ).toContainText('Ustalenia prezentacji')

    await expect(
        page.getByRole('region', { name: 'Dokumenty etapu', exact: true }),
    ).toContainText('Oferta mieszkania.pdf')

    await expect(
        page.getByRole('region', { name: 'Przypomnienia etapu', exact: true }),
    ).toContainText('Prezentacja za 30 minut')

    await expect(
        page.getByRole('region', { name: 'Terminy etapu', exact: true }),
    ).toContainText('Przesłać potwierdzenie')

    await page.evaluate(() => window.scrollTo(0, 0))

    mkdirSync('/tmp/ivan-clients-redesign-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-clients-redesign-qa/stages-${info.project.name}.png`,
        fullPage: true,
    })
})

async function expectCenteredStage(page: Page, title: string) {
    const button = page.getByRole('button', {
        name: `Wybierz etap ${title}`,
        exact: true,
    })

    await expect
        .poll(() =>
            button.evaluate((card) => {
                const rail = card.closest('[aria-label="Etapy współpracy"]')

                if (!rail)
                    throw new Error('Stage must belong to the stage rail')

                const bounds = rail.getBoundingClientRect()

                const cardBounds = card.getBoundingClientRect()

                return Math.abs(
                    cardBounds.left +
                        cardBounds.width / 2 -
                        bounds.left -
                        rail.clientWidth / 2,
                )
            }),
        )
        .toBeLessThan(2)
}

test('business active stage stays distinct from selection and centers first middle and last cards', async ({
    page,
}, info) => {
    const mock = await mockClients(page)

    mock.stages = Array.from({ length: 9 }, (_, index) => ({
        ...stage(index + 1, `Etap ${index + 1}`),
        status: index === 4 ? ('active' as const) : ('planned' as const),
        color: '#7390BA',
    }))

    mock.tasks[0].clientStageId = 5

    await openClient(page)

    const active = page.getByRole('button', {
        name: 'Wybierz etap Etap 5',
        exact: true,
    })

    const first = page.getByRole('button', {
        name: 'Wybierz etap Etap 1',
        exact: true,
    })

    const last = page.getByRole('button', {
        name: 'Wybierz etap Etap 9',
        exact: true,
    })

    await expect(active).toHaveAttribute('aria-current', 'step')

    await expect(active).toHaveAttribute('aria-pressed', 'true')

    await expectCenteredStage(page, 'Etap 5')

    await expect(active).toHaveCSS('background-color', 'rgb(115, 144, 186)')

    await first.click()

    await expect(first).toHaveAttribute('aria-pressed', 'true')

    await expect(first).not.toHaveAttribute('aria-current')

    await expect(first).not.toHaveCSS('background-color', 'rgb(115, 144, 186)')

    await expect(active).toHaveCSS('background-color', 'rgb(115, 144, 186)')

    await page
        .locator('summary[aria-label="Zwiń sprawę Zakup mieszkania"]')
        .click()

    await page
        .locator('summary[aria-label="Rozwiń sprawę Zakup mieszkania"]')
        .click()

    await expect(first).toHaveAttribute('aria-pressed', 'true')

    await expectCenteredStage(page, 'Etap 5')

    await last.click()

    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Potwierdź', exact: true })
        .click()

    await expect(last).toHaveAttribute('aria-current', 'step')

    await expect(active).not.toHaveAttribute('aria-current')

    await expectCenteredStage(page, 'Etap 9')

    expect(
        mock.stages
            .filter((item) => item.status === 'active')
            .map((item) => item.id),
    ).toEqual([9])

    await first.click()

    await page.getByRole('button', { name: 'Rozpocznij', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Potwierdź', exact: true })
        .click()

    await expect(first).toHaveAttribute('aria-current', 'step')

    await expectCenteredStage(page, 'Etap 1')

    await expect(page.locator('[aria-label="Etapy współpracy"]')).toHaveCSS(
        'scrollbar-width',
        'none',
    )

    await noOverflow(page)

    await page.evaluate(() => window.scrollTo(0, 0))

    mkdirSync('/tmp/ivan-stage-workflow-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-stage-workflow-qa/rail-${info.project.name}.png`,
        fullPage: true,
    })
})

test('loads remaining stage pages to find and center the actual active stage', async ({
    page,
}) => {
    const mock = await mockClients(page)

    mock.stages = Array.from({ length: 105 }, (_, index) => ({
        ...stage(index + 1, `Etap ${index + 1}`),
        status: index === 104 ? ('active' as const) : ('planned' as const),
    }))

    mock.tasks[0].clientStageId = 105

    await openClient(page)

    await expect(
        page.getByRole('button', {
            name: 'Wybierz etap Etap 105',
            exact: true,
        }),
    ).toHaveAttribute('aria-current', 'step')

    await expect(
        page.getByRole('region', {
            name: 'Wybrany etap Etap 105',
            exact: true,
        }),
    ).toBeVisible()

    await expectCenteredStage(page, 'Etap 105')

    expect(
        mock.requests.some((request) => {
            const url = new URL(request.url())

            return (
                url.pathname === '/clients/1/processes/1/stages' &&
                url.searchParams.get('page') === '2'
            )
        }),
    ).toBe(true)
})

test('completing active stage follows next planned stage and last completion keeps case open', async ({
    page,
}) => {
    const mock = await mockClients(page)

    mock.tasks[0].isDone = true

    mock.stages.push(
        { ...stage(2, 'Formalności'), status: 'planned' },
        { ...stage(3, 'Podpisanie umowy'), status: 'planned' },
    )

    await openClient(page)

    for (const title of ['Formalności', 'Podpisanie umowy']) {
        await page
            .getByRole('button', { name: 'Zakończ etap', exact: true })
            .click()

        await page
            .getByRole('dialog')
            .getByRole('button', { name: 'Potwierdź', exact: true })
            .click()

        await expect(
            page.getByRole('region', {
                name: `Wybrany etap ${title}`,
                exact: true,
            }),
        ).toBeVisible()

        await expect(
            page.getByRole('button', {
                name: `Wybierz etap ${title}`,
                exact: true,
            }),
        ).toHaveAttribute('aria-current', 'step')

        await expectCenteredStage(page, title)
    }

    await page
        .getByRole('button', { name: 'Zakończ etap', exact: true })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Potwierdź', exact: true })
        .click()

    await expect(
        page.getByRole('region', {
            name: 'Wybrany etap Podpisanie umowy',
            exact: true,
        }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Otwórz etap', exact: true }),
    ).toBeVisible()

    await expect(
        page.locator('[aria-current="step"][data-stage-id]'),
    ).toHaveCount(0)

    expect(mock.processes[0].status).toBe('active')

    await page.getByRole('button', { name: 'Dodaj etap', exact: true }).click()

    const dialog = page.getByRole('dialog', {
        name: 'Nowy etap sprawy',
        exact: true,
    })

    await selectOption(dialog.getByLabel('Szablon etapu'), '1')

    await dialog
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    await expect(
        page.getByRole('button', {
            name: 'Wybierz etap Pierwszy kontakt',
            exact: true,
        }),
    ).toHaveAttribute('aria-current', 'step')

    expect(mock.processes[0].status).toBe('active')
})

test('completing a viewed planned stage does not change the active stage', async ({
    page,
}) => {
    const mock = await mockClients(page)

    mock.stages.push({
        ...stage(2, 'Dodatkowe formalności'),
        status: 'planned',
    })

    await openClient(page)

    const planned = page.getByRole('button', {
        name: 'Wybierz etap Dodatkowe formalności',
        exact: true,
    })

    await planned.click()

    await page
        .getByRole('button', { name: 'Zakończ etap', exact: true })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Potwierdź', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Otwórz etap', exact: true }),
    ).toBeVisible()

    await expect(planned).toHaveAttribute('aria-pressed', 'true')

    await expect(
        page.getByRole('button', {
            name: 'Wybierz etap Analiza potrzeb',
            exact: true,
        }),
    ).toHaveAttribute('aria-current', 'step')

    expect(mock.stages.map((item) => item.status)).toEqual(['active', 'done'])
})

test('manager can move stages and delete empty stages without editing stage metadata', async ({
    page,
}) => {
    const mock = await mockClients(page)

    mock.manager = { ...manager, roles: [{ id: 2, name: 'manager' }] }

    mock.stages.push({ ...stage(2, 'Pusty etap'), status: 'planned' })

    await openClient(page)

    await page
        .getByRole('button', {
            name: 'Opcje etapu Analiza potrzeb',
            exact: true,
        })
        .click()

    await expect(
        page.getByRole('button', { name: 'Edytuj etap', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Przesuń w lewo', exact: true }),
    ).toBeDisabled()

    await page
        .getByRole('button', { name: 'Przesuń w prawo', exact: true })
        .click()

    await expect.poll(() => mock.stages[0].sortKey).toBe(2000)

    await expectCenteredStage(page, 'Analiza potrzeb')

    await expect(
        page.getByRole('button', { name: 'Dodaj zadanie', exact: true }),
    ).toBeVisible()

    await page
        .getByRole('button', { name: 'Wybierz etap Pusty etap', exact: true })
        .click()

    await page
        .getByRole('button', { name: 'Opcje etapu Pusty etap', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Edytuj etap', exact: true }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Usuń etap', exact: true }).click()

    await page
        .getByRole('dialog', { name: 'Usuń etap', exact: true })
        .getByRole('button', { name: 'Usuń etap', exact: true })
        .click()

    await expect(
        page.getByRole('button', {
            name: 'Wybierz etap Pusty etap',
            exact: true,
        }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('region', {
            name: 'Wybrany etap Analiza potrzeb',
            exact: true,
        }),
    ).toBeVisible()

    expect(mock.stages).toHaveLength(1)
})

test('creates a client through reusable form and recovers after save failure', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await page.goto('/main/clients?create=1')

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    await dialog.getByLabel('Imię / nazwa').fill('  Maria  ')

    await selectOption(
        dialog.getByRole('combobox', { name: 'Język', exact: true }),
        'ua',
    )

    await dialog.getByLabel('Nazwisko').fill('Wiśniewska')

    await selectOption(dialog.getByLabel('Priorytet', { exact: true }), 'high')

    mock.failMutation = 1

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('Nie udało się')

    await expect(dialog.getByLabel('Imię / nazwa')).toHaveValue('  Maria  ')

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/clients\/50$/)

    expect(mutation(mock, '/clients')?.postDataJSON()).toMatchObject({
        name: 'Maria',
        surname: 'Wiśniewska',
        language: 'ua',
        priority: 'high',
        managerId: 1,
    })
})

test('sidebar client shortcut reopens after cancellation and preserves list filters', async ({
    page,
}, info) => {
    const mock = await mockClients(page)

    await page.goto('/main/clients?managerId=1')

    await selectOption(page.getByLabel('Status', { exact: true }), 'new')

    await expect(
        page.getByRole('link', { name: 'Otwórz klienta Piotr Nowak' }),
    ).toBeVisible()

    const openFromSidebar = async () => {
        if (info.project.name === 'mobile') {
            await page
                .getByRole('button', { name: 'Otwórz menu', exact: true })
                .click()

            await page
                .getByRole('dialog', { name: 'Menu główne', exact: true })
                .getByRole('link', { name: 'Dodaj klienta', exact: true })
                .click()
        } else {
            await page
                .getByRole('link', { name: 'Dodaj klienta', exact: true })
                .click()
        }

        await expect(
            page.getByRole('dialog', { name: 'Nowy klient', exact: true }),
        ).toBeVisible()

        await expect
            .poll(() => new URL(page.url()).searchParams.get('create'))
            .toBe('1')

        expect(new URL(page.url()).searchParams.get('managerId')).toBe('1')
    }

    const cancelCreation = async () => {
        const dialog = page.getByRole('dialog', {
            name: 'Nowy klient',
            exact: true,
        })

        await dialog
            .getByRole('button', { name: 'Anuluj', exact: true })
            .click()

        await expect(dialog).toBeHidden()

        await expect
            .poll(() => new URL(page.url()).searchParams.has('create'))
            .toBe(false)

        expect(new URL(page.url()).searchParams.get('managerId')).toBe('1')

        await expect(page.getByLabel('Status', { exact: true })).toHaveText(
            'Nowy',
        )

        await expect(
            page.getByLabel('Opiekun klienta', { exact: true }),
        ).toHaveText('Anna Kowalska')

        await expect(
            page.getByRole('link', { name: 'Otwórz klienta Piotr Nowak' }),
        ).toBeVisible()

        await expect(
            page.getByRole('link', { name: 'Otwórz klienta Ewa Nowak' }),
        ).toHaveCount(0)
    }

    await openFromSidebar()

    await cancelCreation()

    await openFromSidebar()

    await cancelCreation()

    expect(mock.requests.some((request) => request.method() === 'POST')).toBe(
        false,
    )

    await noOverflow(page)
})

test('contacts save normalized text', async ({ page }) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page
        .getByRole('button', { name: 'Dane i kontakt', exact: true })
        .click()

    await page
        .getByRole('button', { name: 'Dodaj kontakt', exact: true })
        .click()

    const dialog = page.getByRole('dialog', { name: 'Nowy kontakt' })

    await selectOption(dialog.getByLabel('Rodzaj kontaktu'), 'email')

    await dialog.getByLabel('Adres e-mail').fill('ewa@example.test')

    await dialog.getByLabel('Kontakt główny tego rodzaju').check()

    await dialog
        .getByRole('button', { name: 'Dodaj kontakt', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Edytuj ewa@example.test' }),
    ).toBeVisible()

    expect(mutation(mock, '/clients/1/contacts')?.postDataJSON()).toMatchObject(
        {
            type: 'email',
            value: 'ewa@example.test',
            label: null,
            isPrimary: true,
        },
    )
})

test('adds multiple cases and copies a selected stage template', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page
        .getByRole('button', { name: 'Dodaj sprawę', exact: true })
        .click()

    let dialog = page.getByRole('dialog', { name: 'Nowa sprawa klienta' })

    await dialog.getByLabel('Nazwa sprawy').fill('Najem lokalu')

    await dialog
        .getByRole('button', { name: 'Dodaj sprawę', exact: true })
        .click()

    await expect(
        page.locator('summary[aria-label="Rozwiń sprawę Najem lokalu"]'),
    ).toBeVisible()

    await page
        .locator('summary[aria-label="Rozwiń sprawę Najem lokalu"]')
        .click()

    const caseCard = page
        .locator('details')
        .filter({
            has: page.locator('summary[aria-label="Zwiń sprawę Najem lokalu"]'),
        })
        .first()

    await caseCard
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Nowy etap sprawy' })

    await selectOption(dialog.getByLabel('Szablon etapu'), '1')

    await dialog
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Domyślna rozmowa' }),
    ).toBeVisible()

    expect(
        mutation(mock, '/clients/1/processes/102/stages')?.postDataJSON(),
    ).toEqual({ stageTemplateId: 1 })
})

test('plain task uses default type and calendar fields appear only when selected', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Dodaj zadanie',
        exact: true,
    })

    await expect(dialog.getByLabel('Data wydarzenia')).toHaveCount(0)

    await expect(dialog.getByLabel('Typ zadania')).toContainText('Zadanie')

    await dialog.getByLabel('Nazwa zadania').fill('Sprawdzić ofertę')

    await dialog
        .getByRole('button', { name: 'Dodaj zadanie', exact: true })
        .click()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Sprawdzić ofertę' }),
    ).toBeVisible()

    expect(
        mutation(mock, '/clients/1/processes/1/stages/1/tasks')?.postDataJSON(),
    ).toEqual({ title: 'Sprawdzić ofertę', description: null, taskTypeId: 3 })

    const options = page.getByRole('button', {
        name: 'Opcje Sprawdzić ofertę',
        exact: true,
    })

    await options.focus()

    await options.press('Enter')

    await expect(
        page.getByRole('group', {
            name: 'Opcje Sprawdzić ofertę: działania',
            exact: true,
        }),
    ).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(
        page.getByRole('group', {
            name: 'Opcje Sprawdzić ofertę: działania',
            exact: true,
        }),
    ).toHaveCount(0)

    await expect(options).toBeFocused()

    await taskAction(page, 'Sprawdzić ofertę', 'Edytuj')

    dialog = page.getByRole('dialog', { name: 'Edytuj zadanie', exact: true })

    await dialog.getByLabel('Dodaj do kalendarza').check()

    await dialog.getByLabel('Bez godziny — zadanie na dzień').check()

    await dialog.getByLabel('Data zadania').fill('2026-10-20')

    await expect(
        dialog.getByText('Tylko data. Przypomnienia są wyłączone.', {
            exact: false,
        }),
    ).toBeVisible()

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    const first = mutation(
        mock,
        '/clients/1/processes/1/stages/1/tasks/101',
        'PATCH',
    )?.postDataJSON()

    expect(first).toMatchObject({
        calendarId: 11,
        date: '2026-10-20',
        startAt: null,
        endAt: null,
    })

    await taskAction(page, 'Sprawdzić ofertę', 'Edytuj')

    dialog = page.getByRole('dialog', { name: 'Edytuj zadanie', exact: true })

    await dialog.getByLabel('Bez godziny — zadanie na dzień').uncheck()

    await dialog.getByLabel('Od godziny').fill('10:00')

    await dialog.getByLabel('Do godziny').fill('11:00')

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(
            mock,
            '/clients/1/processes/1/stages/1/tasks/101',
            'PATCH',
        )?.postDataJSON(),
    ).toMatchObject({
        calendarId: 11,
        date: null,
        startAt: '2026-10-20T08:00:00.000Z',
        endAt: '2026-10-20T09:00:00.000Z',
    })
})

test('reminders and deadlines use precise manager-calendar time and no type picker', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page
        .getByRole('button', { name: 'Dodaj przypomnienie', exact: true })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Dodaj przypomnienie',
        exact: true,
    })

    await dialog
        .getByLabel('Treść przypomnienia')
        .fill('Zadzwonić po spotkaniu')

    await dialog.getByLabel('Data', { exact: true }).fill('2026-10-20')

    await dialog.getByLabel('Godzina', { exact: true }).fill('14:15')

    await expect(dialog.getByLabel('Typ zadania')).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(
            mock,
            '/clients/1/processes/1/stages/1/reminders',
        )?.postDataJSON(),
    ).toEqual({
        title: 'Zadzwonić po spotkaniu',
        remindAt: '2026-10-20T12:15:00.000Z',
    })

    await page
        .getByRole('button', { name: 'Dodaj termin', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Dodaj termin', exact: true })

    await dialog.getByLabel('Nazwa terminu').fill('Podpisanie umowy')

    await dialog.getByLabel('Data', { exact: true }).fill('2026-10-21')

    await dialog.getByLabel('Godzina', { exact: true }).fill('16:00')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(
            mock,
            '/clients/1/processes/1/stages/1/deadlines',
        )?.postDataJSON(),
    ).toMatchObject({
        title: 'Podpisanie umowy',
        dueAt: '2026-10-21T14:00:00.000Z',
        reminderMinutes: [60],
    })

    await page
        .getByRole('checkbox', { name: 'Wykonany termin: Podpisanie umowy' })
        .click()

    await expect(
        page.getByRole('checkbox', {
            name: 'Wykonany termin: Podpisanie umowy',
        }),
    ).toBeChecked()
})

test('closed stage blocks editing and can reopen after all tasks complete', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page
        .getByRole('button', { name: 'Zakończ etap', exact: true })
        .click()

    let dialog = page.getByRole('dialog', { name: 'Zakończ etap', exact: true })

    await dialog.getByRole('button', { name: 'Potwierdź', exact: true }).click()

    await expect(dialog.getByRole('alert')).toContainText('otwarte zadania')

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await page
        .getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' })
        .click()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' }),
    ).toBeChecked()

    await page
        .getByRole('button', { name: 'Zakończ etap', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Zakończ etap', exact: true })

    await dialog.getByRole('button', { name: 'Potwierdź', exact: true }).click()

    await expect(
        page.getByRole('button', { name: 'Otwórz etap', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Dodaj zadanie', exact: true }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Otwórz etap', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Potwierdź', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Dodaj zadanie', exact: true }),
    ).toBeVisible()

    expect(mock.stages[0].status).toBe('active')
})

test('linked task deletion can keep the calendar record', async ({ page }) => {
    const mock = await mockClients(page)

    mock.tasks[0].calendarId = 11

    mock.tasks[0].date = '2026-10-20'

    await openClient(page)

    await taskAction(page, 'Poznać potrzeby', 'Usuń')

    const dialog = page.getByRole('dialog', {
        name: 'Usuń zadanie',
        exact: true,
    })

    await expect(dialog.getByLabel('Gdzie usunąć wpis?')).toHaveText(
        'Tylko z etapu — zachowaj w kalendarzu',
    )

    await dialog.getByRole('button', { name: 'Usuń', exact: true }).click()

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' }),
    ).toHaveCount(0)

    expect(mock.tasks[0]).toMatchObject({ calendarId: 11, clientStageId: null })

    expect(
        new URL(
            mutation(
                mock,
                '/clients/1/processes/1/stages/1/tasks/1',
                'DELETE',
            )?.url() ?? 'http://test',
        ).searchParams.get('deleteScope'),
    ).toBe('local')
})

test('document from own library binds and edits metadata without changing file', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page.getByRole('button', { name: 'Dokumenty', exact: true }).click()

    await page
        .getByRole('region', { name: 'Dokumenty klienta', exact: true })
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    let dialog = page.getByRole('dialog', {
        name: 'Nowy dokument',
        exact: true,
    })

    await dialog.getByLabel('Nazwa dokumentu').fill('Informacja dla klienta')

    await dialog
        .getByRole('button', { name: 'Z biblioteki', exact: true })
        .click()

    await dialog
        .getByRole('button', { name: 'Wybierz z biblioteki', exact: false })
        .click()

    await selectOption(
        dialog.getByLabel('Folder biblioteki'),
        PrivateBucket.MANAGER_DOCUMENTS,
    )

    await dialog.getByRole('button', { name: /Informacja.pdf/ }).click()

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(mock, '/clients/1/documents')?.postDataJSON(),
    ).toMatchObject({ privateAssetId: 70, title: 'Informacja dla klienta' })

    await page
        .getByRole('button', { name: 'Edytuj Informacja dla klienta' })
        .click()

    dialog = page.getByRole('dialog', { name: 'Edytuj dokument', exact: true })

    await dialog.getByLabel('Nazwa dokumentu').fill('Dokument informacyjny')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(mock, '/clients/1/documents/100', 'PATCH')?.postDataJSON(),
    ).toEqual({ title: 'Dokument informacyjny', category: null })
})

test('archived client remains readable while changes are hidden', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page.getByRole('button', { name: 'Archiwizuj', exact: true }).click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Archiwizuj', exact: true })
        .click()

    await expect(
        page.getByRole('button', { name: 'Przywróć klienta', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('button', { name: 'Dodaj sprawę', exact: true }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('checkbox', { name: 'Wykonane: Poznać potrzeby' }),
    ).toBeDisabled()

    expect(mock.clients[0].archivedAt).not.toBeNull()
})

test('manager may filter visible clients but cannot assign another client owner', async ({
    page,
}) => {
    const mock = await mockClients(page)

    mock.manager = { ...manager, roles: [{ id: 2, name: 'manager' }] }

    await page.goto('/main/clients?managerId=99&create=1')

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    await expect(page.getByLabel('Opiekun klienta')).toHaveCount(0)

    await expect(dialog.getByLabel('Opiekun', { exact: true })).toHaveCount(0)

    await dialog.getByLabel('Imię / nazwa').fill('Manager-owned')

    await dialog
        .getByRole('button', { name: 'Dodaj klienta', exact: true })
        .click()

    await expect(page).toHaveURL(/\/main\/clients\/50$/)

    expect(mutation(mock, '/clients')?.postDataJSON()).not.toHaveProperty(
        'managerId',
    )

    const lists = mock.requests.filter(
        (request) =>
            new URL(request.url()).pathname === '/clients' &&
            request.method() === 'GET',
    )

    expect(
        lists.every(
            (request) =>
                new URL(request.url()).searchParams.get('managerId') === '99',
        ),
    ).toBeTruthy()
})

test('administrator transfers only the opened client through the existing owner field', async ({
    page,
}) => {
    const mock = await mockClients(page)

    const nextManager = {
        ...manager,
        id: 2,
        name: 'Marta',
        email: 'marta@example.test',
    }

    const otherOwner = mock.clients[1].managerId

    await page.route('**:4201/managers*', async (route) => {
        const url = new URL(route.request().url())

        if (url.pathname !== '/managers') return route.fallback()

        return route.fulfill({
            json: list(url, [manager, nextManager]),
            headers: { 'access-control-allow-origin': '*' },
        })
    })

    await openClient(page)

    await page
        .getByRole('button', { name: 'Edytuj klienta', exact: true })
        .click()

    const dialog = page.getByRole('dialog', {
        name: 'Edytuj klienta',
        exact: true,
    })

    await selectOption(
        dialog.getByLabel('Opiekun klienta', { exact: true }),
        '2',
    )

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    expect(mutation(mock, '/clients/1', 'PATCH')?.postDataJSON()).toMatchObject(
        { managerId: 2 },
    )

    expect(mock.clients[0].managerId).toBe(2)

    expect(mock.clients[1].managerId).toBe(otherOwner)

    expect(
        mock.requests.filter(
            (request) =>
                request.method() === 'PATCH' &&
                new URL(request.url()).pathname.startsWith('/clients/'),
        ),
    ).toHaveLength(1)

    await expect
        .poll(() =>
            mock.requests.some(
                (request) =>
                    new URL(request.url()).pathname === '/calendars/manager/2',
            ),
        )
        .toBe(true)
})

test('pending saves block dismissal and duplicate submissions', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await page.goto('/main/clients?create=1')

    const dialog = page.getByRole('dialog', {
        name: 'Nowy klient',
        exact: true,
    })

    await dialog.getByLabel('Imię / nazwa').fill('Julia')

    let release = () => {}

    mock.gate = new Promise<void>((resolve) => {
        release = resolve
    })

    try {
        await dialog
            .getByRole('button', { name: 'Dodaj klienta', exact: true })
            .click()

        await expect(dialog.getByLabel('Imię / nazwa')).toBeDisabled()

        await page.keyboard.press('Escape')

        await expect(dialog).toBeVisible()

        await expect(
            dialog.getByRole('button', { name: 'Zamknij okno' }),
        ).toBeDisabled()

        expect(
            mock.requests.filter(
                (request) =>
                    new URL(request.url()).pathname === '/clients' &&
                    request.method() === 'POST',
            ),
        ).toHaveLength(1)
    } finally {
        release()
    }

    await expect(page).toHaveURL(/\/main\/clients\/50$/)
})

test('manual stage stores own appearance and client notes can be edited and removed', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page.getByRole('button', { name: 'Dodaj etap', exact: true }).click()

    let dialog = page.getByRole('dialog', { name: 'Nowy etap sprawy' })

    await dialog.getByRole('button', { name: 'Własny etap' }).click()

    await dialog.getByLabel('Nazwa etapu').fill('Weryfikacja finansowania')

    await dialog.getByLabel('Kolor #B18B4E').check()

    await dialog
        .getByRole('button', { name: 'Dodaj etap', exact: true })
        .click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(mock, '/clients/1/processes/1/stages')?.postDataJSON(),
    ).toEqual({
        title: 'Weryfikacja finansowania',
        iconId: null,
        color: '#B18B4E',
    })

    await page.getByRole('button', { name: 'Notatki', exact: true }).click()

    await page
        .getByRole('region', { name: 'Notatki klienta', exact: true })
        .getByRole('button', { name: 'Dodaj notatkę', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Nowa notatka' })

    await dialog.getByLabel('Tytuł notatki').fill('Ustalenia')

    await dialog
        .getByLabel('Treść notatki')
        .fill('Kontakt po 17:00. Budżet ustalony.')

    await dialog.getByLabel('Przypnij notatkę').check()

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await page
        .getByRole('button', { name: 'Edytuj Ustalenia', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Edytuj notatkę' })

    await dialog.getByLabel('Tytuł notatki').fill('')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(
        mutation(mock, '/clients/1/notes/100', 'PATCH')?.postDataJSON(),
    ).toMatchObject({ title: null, isPinned: true })

    await page
        .getByRole('button', { name: 'Usuń notatkę', exact: true })
        .click()

    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Usuń', exact: true })
        .click()

    await expect(
        page.getByText('Kontakt po 17:00. Budżet ustalony.', { exact: true }),
    ).toHaveCount(0)
})

test('failed document binding reuses upload on retry and cleans unattached file on cancel', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page.getByRole('button', { name: 'Dokumenty', exact: true }).click()

    await page
        .getByRole('region', { name: 'Dokumenty klienta', exact: true })
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    let dialog = page.getByRole('dialog', { name: 'Nowy dokument' })

    await dialog.getByLabel('Plik', { exact: true }).setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-demo'),
    })

    await expect(dialog.getByLabel('Nazwa dokumentu')).toHaveValue('test.pdf')

    await dialog.getByLabel('Nazwa dokumentu').fill('Umowa klienta')

    mock.failMutation = 1

    mock.failPath = '/clients/1/documents'

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(dialog.getByLabel('Nazwa dokumentu')).toHaveValue(
        'Umowa klienta',
    )

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(
        mock.requests.filter(
            (request) =>
                new URL(request.url()).pathname === '/private-assets' &&
                request.method() === 'POST',
        ),
    ).toHaveLength(1)

    expect(
        mutation(mock, '/private-assets')?.postDataBuffer()?.toString(),
    ).toContain('name="originalName"\r\n\r\nUmowa klienta\r\n')

    await page
        .getByRole('region', { name: 'Dokumenty klienta', exact: true })
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    dialog = page.getByRole('dialog', { name: 'Nowy dokument' })

    await dialog.getByLabel('Plik', { exact: true }).setInputFiles({
        name: 'other.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-other'),
    })

    mock.failMutation = 1

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click()

    await expect
        .poll(
            () =>
                mock.requests.filter(
                    (request) =>
                        new URL(request.url()).pathname ===
                            '/private-assets/91' &&
                        request.method() === 'DELETE',
                ).length,
        )
        .toBe(1)
})

test('renaming a document after failed binding replaces only its unattached cached upload', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page.getByRole('button', { name: 'Dokumenty', exact: true }).click()

    await page
        .getByRole('region', { name: 'Dokumenty klienta', exact: true })
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    const dialog = page.getByRole('dialog', { name: 'Nowy dokument' })

    await dialog.getByLabel('Plik', { exact: true }).setInputFiles({
        name: 'offer.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-offer'),
    })

    await dialog.getByLabel('Nazwa dokumentu').fill('Robocza oferta')

    mock.failMutation = 1

    mock.failPath = '/clients/1/documents'

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    expect(mock.assets.find((item) => item.id === 90)?.originalName).toBe(
        'Robocza oferta',
    )

    await dialog.getByLabel('Nazwa dokumentu').fill('Aktualna oferta')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(mock.assets.find((item) => item.id === 90)).toBeUndefined()

    expect(mock.assets.find((item) => item.id === 91)?.originalName).toBe(
        'Aktualna oferta',
    )

    expect(mock.documents[0]).toMatchObject({
        title: 'Aktualna oferta',
        privateAssetId: 91,
    })

    const writes = mock.requests.filter((request) => request.method() !== 'GET')

    expect(
        writes.map((request) => [
            request.method(),
            new URL(request.url()).pathname,
        ]),
    ).toEqual([
        ['POST', '/private-assets'],
        ['POST', '/clients/1/documents'],
        ['DELETE', '/private-assets/90'],
        ['POST', '/private-assets'],
        ['POST', '/clients/1/documents'],
    ])

    expect(writes[3].postDataBuffer()?.toString()).toContain(
        'name="originalName"\r\n\r\nAktualna oferta\r\n',
    )

    expect(mock.assets.find((item) => item.id === 70)).toBeDefined()
})

test('stage upload uses its single editable title as the private asset name and downloads with the real suffix', async ({
    page,
}) => {
    const mock = await mockClients(page)

    await openClient(page)

    await page
        .getByRole('button', { name: 'Dodaj dokument', exact: true })
        .click()

    const dialog = page.getByRole('dialog', { name: 'Dodaj dokument' })

    const name = dialog.getByLabel('Nazwa dokumentu')

    await expect(name).toHaveCount(1)

    const file = dialog.getByLabel('Plik', { exact: true })

    await file.setInputFiles({
        name: 'old.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-old'),
    })

    await expect(name).toHaveValue('old.pdf')

    await file.setInputFiles({
        name: 'new.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-new'),
    })

    await expect(name).toHaveValue('new.pdf')

    await name.fill('Pakiet prezentacji v1.2')

    await file.setInputFiles({
        name: 'final.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-final'),
    })

    await expect(name).toHaveValue('Pakiet prezentacji v1.2')

    await dialog.getByRole('button', { name: 'Zapisz', exact: true }).click()

    await expect(dialog).toBeHidden()

    expect(mock.stageDocuments[0]).toMatchObject({
        title: 'Pakiet prezentacji v1.2',
        privateAssetId: 90,
    })

    const upload = mutation(mock, '/private-assets')!
        .postDataBuffer()!
        .toString()

    expect(upload).toContain(
        'name="originalName"\r\n\r\nPakiet prezentacji v1.2\r\n',
    )

    expect(upload).toContain('filename="final.pdf"')

    expect(upload).toContain('%PDF-final')

    const downloaded = page.waitForEvent('download')

    await page
        .getByRole('button', { name: 'Pobierz Pakiet prezentacji v1.2' })
        .click()

    expect((await downloaded).suggestedFilename()).toBe(
        'Pakiet prezentacji v1.2.pdf',
    )
})
