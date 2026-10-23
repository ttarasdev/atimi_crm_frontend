import { test, expect, type Page, type Request } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { Manager } from '../src/api/managers/managers.types'
import {
    PublicBucket,
    type PublicAsset,
} from '../src/api/public-assets/public-assets.types'

const session = 'icon-gallery-test-session'

const manager: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    email: 'anna@example.test',
    phone: null,
    position: null,
    avatarId: null,
    status: 'active',
    remindersEnabled: true,
    lastLoginAt: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    roles: [{ id: 1, name: 'admin' }],
}

const iconPng = readFileSync('tests/fixtures/icons/house.png')

interface IconsMock {
    assets: PublicAsset[]
    requests: Request[]
    manager: Manager
    listFails: boolean
    uploadFails: boolean
}

function icon(id: number, isPopular = false): PublicAsset {
    return {
        id,
        bucket: PublicBucket.ICONS,
        relPath: `2026/10/ikona-${id}.png`,
        originalName: `ikona-${id}.png`,
        mimeType: 'image/png',
        sizeBytes: iconPng.length,
        isPopular,
        createdByManagerId: manager.id,
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
    }
}

async function mockIcons(
    page: Page,
    assets: PublicAsset[],
): Promise<IconsMock> {
    const mock: IconsMock = {
        assets,
        requests: [],
        manager,
        listFails: false,
        uploadFails: false,
    }

    await page.addInitScript((token) => {
        localStorage.setItem('atimi:access_token', token)
    }, session)

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        if (request.method() === 'OPTIONS')
            return route.fulfill({
                status: 204,
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
                    'access-control-allow-headers':
                        'Authorization, Content-Type',
                },
            })

        mock.requests.push(request)

        if (url.pathname === '/managers/me')
            return route.fulfill({ json: mock.manager })

        if (url.pathname === '/public-assets' && request.method() === 'GET') {
            if (mock.listFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Asset storage temporarily unavailable' },
                })

            const pageNumber = Number(url.searchParams.get('page') ?? 1)

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const offset = Number(
                url.searchParams.get('offset') ?? (pageNumber - 1) * limit,
            )

            const popular = url.searchParams.get('isPopular')

            const assets = mock.assets
                .filter(
                    (asset) =>
                        asset.bucket === url.searchParams.get('bucket') &&
                        (popular === null ||
                            asset.isPopular === (popular === 'true')),
                )
                .sort(
                    (first, second) =>
                        Number(second.isPopular) - Number(first.isPopular) ||
                        second.id - first.id,
                )

            return route.fulfill({
                json: {
                    rows: assets.slice(offset, offset + limit),
                    total: assets.length,
                    page: pageNumber,
                    limit,
                    offset,
                },
            })
        }

        const match = url.pathname.match(
            /^\/public-assets\/(\d+)(?:\/(file|toggle-popular))?$/,
        )

        if (match) {
            const asset = mock.assets.find(
                (item) => item.id === Number(match[1]),
            )

            if (!asset)
                return route.fulfill({
                    status: 404,
                    json: { message: 'Asset not found' },
                })

            if (match[2] === 'file' && request.method() === 'GET')
                return route.fulfill({
                    contentType: asset.mimeType,
                    headers: { 'access-control-allow-origin': '*' },
                    body: iconPng,
                })

            if (match[2] === 'toggle-popular' && request.method() === 'PATCH') {
                await new Promise((resolve) => setTimeout(resolve, 300))

                asset.isPopular = !asset.isPopular

                asset.updatedAt = '2026-10-05T08:00:00.000Z'

                return route.fulfill({
                    json: { success: true, isPopular: asset.isPopular },
                })
            }

            if (!match[2] && request.method() === 'GET')
                return route.fulfill({ json: asset })
        }

        return route.fulfill({
            status: 404,
            json: { message: 'Unexpected endpoint' },
        })
    })

    return mock
}

async function captureUploads(page: Page, mock: IconsMock) {
    const uploads: { body: Buffer; headers: IncomingHttpHeaders }[] = []

    const server = createServer(async (request, response) => {
        response.setHeader('access-control-allow-origin', '*')

        response.setHeader('content-type', 'application/json')

        const chunks: Buffer[] = []

        for await (const chunk of request) chunks.push(Buffer.from(chunk))

        uploads.push({
            body: Buffer.concat(chunks),
            headers: request.headers,
        })

        await new Promise((resolve) => setTimeout(resolve, 300))

        if (mock.uploadFails) {
            response.statusCode = 503

            response.end(
                JSON.stringify({ message: 'Asset storage unavailable' }),
            )

            return
        }

        const asset = {
            ...icon(Math.max(0, ...mock.assets.map((item) => item.id)) + 1),
            originalName:
                Buffer.concat(chunks)
                    .toString()
                    .match(/name="originalName"\r\n\r\n([^\r\n]*)/)?.[1] ?? '',
        }

        mock.assets.push(asset)

        response.statusCode = 201

        response.end(JSON.stringify(asset))
    })

    const close = () =>
        new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
        )

    try {
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject)

            server.listen(0, '127.0.0.1', () => {
                server.off('error', reject)

                resolve()
            })
        })

        const address = server.address()

        if (!address || typeof address === 'string')
            throw new Error('Missing upload capture address')

        await page.route('**:4201/public-assets', async (route) => {
            if (route.request().method() !== 'POST') return route.fallback()

            mock.requests.push(route.request())

            await route.continue({
                url: `http://127.0.0.1:${address.port}/public-assets`,
            })
        })

        return { uploads, close }
    } catch (error) {
        await close()

        throw error
    }
}

function tiles(page: Page) {
    return page.getByRole('button', {
        name: /^(?:(?:ikona-\d+|house)\.png|Prezentacja domu)$/,
    })
}

async function expectMask(page: Page, id: number, color: string) {
    const tile = page.getByRole('button', {
        name: `ikona-${id}.png`,
        exact: true,
    })

    const mask = tile.locator('span[style*="mask"]')

    await expect(mask).toHaveCSS('color', color)

    await expect(mask).toHaveCSS('background-color', color)

    await expect(mask).toHaveCSS('mask-mode', 'alpha')

    await expect(mask).toHaveCSS(
        'mask-image',
        new RegExp(`/public-assets/${id}/file`),
    )
}

test('gallery uses one popular-first list, public asset metadata, compact masks and paginated loading', async ({
    page,
}, info) => {
    const mock = await mockIcons(
        page,
        Array.from({ length: 101 }, (_, index) => icon(101 - index, index < 2)),
    )

    await page.goto('/main/management/icons')

    await expect(
        page.getByRole('region', { name: 'Galeria ikon', exact: true }),
    ).toBeVisible()

    await expect(
        page.getByRole('heading', { name: 'Galeria ikon', exact: true }),
    ).toHaveCount(0)

    await expect(tiles(page)).toHaveCount(100)

    await expect(
        page.getByRole('button', { name: /^(Wszystkie|Popularne)$/ }),
    ).toHaveCount(0)

    await expect(tiles(page).nth(0)).toHaveAttribute(
        'aria-label',
        'ikona-101.png',
    )

    await expect(tiles(page).nth(1)).toHaveAttribute(
        'aria-label',
        'ikona-100.png',
    )

    await expect(tiles(page).nth(2)).toHaveAttribute(
        'aria-label',
        'ikona-99.png',
    )

    const list = mock.requests.find(
        (request) => new URL(request.url()).pathname === '/public-assets',
    )

    expect(list).toBeDefined()

    const query = new URL(list!.url()).searchParams

    expect(query.get('bucket')).toBe('icons')

    expect(query.get('limit')).toBe('100')

    expect(query.get('page')).toBe('1')

    expect(query.has('isPopular')).toBe(false)

    expect(list!.headers().authorization).toBe(`Bearer ${session}`)

    expect(
        mock.requests
            .find(
                (request) => new URL(request.url()).pathname === '/managers/me',
            )
            ?.headers().authorization,
    ).toBe(`Bearer ${session}`)

    await expect(tiles(page).first()).toHaveText('')

    const size = await tiles(page).first().boundingBox()

    expect(size?.width).toBe(50)

    expect(size?.height).toBe(50)

    await expect(page.getByText('ikona-101.png', { exact: true })).toHaveCount(
        0,
    )

    await expectMask(page, 101, 'rgb(198, 73, 89)')

    await expectMask(page, 99, 'rgb(37, 99, 235)')

    await expect
        .poll(
            () =>
                mock.requests.filter((request) =>
                    /\/public-assets\/\d+\/file$/.test(request.url()),
                ).length,
        )
        .toBeGreaterThan(0)

    expect(
        mock.requests
            .filter((request) =>
                /\/public-assets\/\d+\/file$/.test(request.url()),
            )
            .every((request) => request.headers().authorization === undefined),
    ).toBe(true)

    const nextPage = page.waitForRequest((request) => {
        const url = new URL(request.url())

        return (
            url.pathname === '/public-assets' &&
            url.searchParams.get('page') === '2'
        )
    })

    await page.getByRole('button', { name: 'Pokaż więcej' }).click()

    expect(new URL((await nextPage).url()).searchParams.get('limit')).toBe(
        '100',
    )

    await expect(tiles(page)).toHaveCount(101)

    await expect(
        page.getByRole('button', { name: 'Pokaż więcej' }),
    ).toHaveCount(0)

    expect(
        mock.requests
            .filter(
                (request) =>
                    new URL(request.url()).pathname === '/public-assets',
            )
            .every(
                (request) =>
                    !new URL(request.url()).searchParams.has('isPopular'),
            ),
    ).toBe(true)

    await expect(
        page.getByRole('button', { name: /^(Usuń ikonę|Usuń plik|Usuń)$/ }),
    ).toHaveCount(0)

    expect(mock.requests.some((request) => request.method() === 'DELETE')).toBe(
        false,
    )

    expect(
        mock.requests.some((request) =>
            /^\/icons(?:\/|$)/.test(new URL(request.url()).pathname),
        ),
    ).toBe(false)

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)

    await page.evaluate(() => window.scrollTo(0, 0))

    await page.screenshot({
        path: `test-results/icons-gallery-${info.project.name}.png`,
        fullPage: true,
        animations: 'disabled',
    })
})

test('details toggle popularity once, update common list order and style, and close accessibly', async ({
    page,
}, info) => {
    const mock = await mockIcons(page, [icon(2, true), icon(3), icon(1)])

    await page.goto('/main/management/icons')

    await expect(tiles(page)).toHaveCount(3)

    const trigger = page.getByRole('button', {
        name: 'ikona-1.png',
        exact: true,
    })

    await trigger.focus()

    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Szczegóły ikony' })

    await expect(dialog).toBeVisible()

    await expect(dialog.getByText('ikona-1.png', { exact: true })).toBeVisible()

    await expect(dialog.getByText('image/png', { exact: true })).toBeVisible()

    await expect(
        dialog.getByText('100 × 100 px', { exact: true }),
    ).toBeVisible()

    await expect(
        dialog.getByRole('button', { name: /^(Usuń ikonę|Usuń plik|Usuń)$/ }),
    ).toHaveCount(0)

    const toggle = dialog.getByRole('button', { name: 'Oznacz jako popularną' })

    const mutation = page.waitForRequest((request) =>
        request.url().endsWith('/public-assets/1/toggle-popular'),
    )

    await toggle.click()

    await expect(toggle).toBeDisabled()

    const request = await mutation

    expect(request.method()).toBe('PATCH')

    expect(request.headers().authorization).toBe(`Bearer ${session}`)

    expect(request.postData()).toBeNull()

    await expect(
        dialog.getByRole('button', { name: 'Usuń z popularnych' }),
    ).toBeEnabled()

    await dialog.getByRole('button', { name: 'Zamknij okno' }).click()

    await expect(dialog).not.toBeVisible()

    await expect(trigger).toBeFocused()

    await expect(tiles(page).nth(0)).toHaveAttribute(
        'aria-label',
        'ikona-2.png',
    )

    await expect(tiles(page).nth(1)).toHaveAttribute(
        'aria-label',
        'ikona-1.png',
    )

    await expect(tiles(page).nth(2)).toHaveAttribute(
        'aria-label',
        'ikona-3.png',
    )

    await expectMask(page, 1, 'rgb(198, 73, 89)')

    await trigger.click()

    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(dialog).not.toBeVisible()

    await expect(trigger).toBeFocused()

    await trigger.click()

    await expect(dialog).toBeVisible()

    await page.screenshot({
        path: `test-results/icons-details-${info.project.name}.png`,
        animations: 'disabled',
    })

    await dialog.getByRole('button', { name: 'Usuń z popularnych' }).click()

    await expect(
        dialog.getByRole('button', { name: 'Oznacz jako popularną' }),
    ).toBeEnabled()

    const panel = await dialog.locator('[data-popup-panel]').boundingBox()

    expect(panel).not.toBeNull()

    await page.mouse.click(2, panel!.y > 4 ? 2 : panel!.y + panel!.height / 2)

    await expect(dialog).not.toBeVisible()

    await expect(tiles(page)).toHaveCount(3)

    await expect(tiles(page).first()).toHaveAttribute(
        'aria-label',
        'ikona-2.png',
    )

    await expect(tiles(page).nth(1)).toHaveAttribute(
        'aria-label',
        'ikona-3.png',
    )

    await expectMask(page, 1, 'rgb(37, 99, 235)')

    await expect(trigger).toBeFocused()

    expect(
        mock.requests.filter((request) => request.method() === 'PATCH'),
    ).toHaveLength(2)

    expect(mock.requests.some((request) => request.method() === 'DELETE')).toBe(
        false,
    )

    expect(
        mock.requests
            .filter((request) =>
                /^\/public-assets\/\d+$/.test(new URL(request.url()).pathname),
            )
            .every(
                (request) =>
                    request.headers().authorization === `Bearer ${session}`,
            ),
    ).toBe(true)
})

test('failed gallery load can retry and empty common list allows adding icons', async ({
    page,
}) => {
    const mock = await mockIcons(page, [icon(1)])

    mock.listFails = true

    await page.goto('/main/management/icons')

    await expect(
        page.getByRole('region', { name: 'Galeria ikon' }).getByRole('alert'),
    ).toContainText('Nie udało się wczytać ikon')

    await expect(tiles(page)).toHaveCount(0)

    mock.listFails = false

    await page.getByRole('button', { name: 'Spróbuj ponownie' }).click()

    await expect(tiles(page)).toHaveCount(1)

    mock.assets = []

    await page.reload()

    await expect(page.getByText('Brak ikon', { exact: true })).toBeVisible()

    await expect(tiles(page)).toHaveCount(0)

    await expect(
        page.getByRole('button', { name: 'Dodaj ikonę', exact: true }),
    ).toBeEnabled()

    await expect(
        page.getByRole('button', { name: 'Pokaż więcej' }),
    ).toHaveCount(0)

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
})

test('admin upload preserves file and preview after failure, submits multipart, and managers only read icons', async ({
    page,
}, info) => {
    const mock = await mockIcons(page, [])

    const capture = await captureUploads(page, mock)

    try {
        mock.uploadFails = true

        await page.goto('/main/management/icons')

        await page
            .getByRole('button', { name: 'Dodaj ikonę', exact: true })
            .click()

        const dialog = page.getByRole('dialog', { name: 'Nowa ikona' })

        await expect(dialog).toBeVisible()

        const input = dialog.getByLabel('Plik ikony', { exact: true })

        await input.setInputFiles('tests/fixtures/icons/house.png')

        const name = dialog.getByLabel('Nazwa ikony')

        await expect(name).toHaveValue('house.png')

        await input.setInputFiles({
            name: 'flat.png',
            mimeType: 'image/png',
            buffer: iconPng,
        })

        await expect(name).toHaveValue('flat.png')

        await name.fill('  Prezentacja domu  ')

        await input.setInputFiles('tests/fixtures/icons/house.png')

        await expect(name).toHaveValue('  Prezentacja domu  ')

        await expect(name).toHaveAttribute('maxlength', '255')

        for (const invalid of ['   ', 'Nazwa\t', 'Nazwa\u009f']) {
            await name.fill(invalid)

            await dialog
                .getByRole('button', { name: 'Dodaj ikonę', exact: true })
                .click()

            await expect(dialog.getByRole('alert')).toContainText(
                'Nazwa ikony musi mieć od 1 do 255 znaków',
            )
        }

        expect(
            mock.requests.filter((request) => request.method() === 'POST'),
        ).toHaveLength(0)

        await name.fill('  Prezentacja domu  ')

        const preview = dialog.getByRole('img', { name: 'Podgląd ikony' })

        await expect(dialog.getByRole('alert')).toHaveCount(0)

        await expect(preview).toBeVisible()

        await expect(preview).toHaveCSS('mask-image', /blob:/)

        const mask = await preview.evaluate(
            (element) => getComputedStyle(element).maskImage,
        )

        await page.screenshot({
            path: `test-results/icons-upload-${info.project.name}.png`,
            animations: 'disabled',
        })

        await dialog
            .getByRole('button', { name: 'Dodaj ikonę', exact: true })
            .click()

        await expect(input).toBeDisabled()

        await expect(name).toBeDisabled()

        await expect(
            dialog.getByRole('button', { name: 'Zamknij okno' }),
        ).toBeDisabled()

        await expect(dialog.getByRole('alert')).toContainText(
            'Nie udało się dodać ikony. Spróbuj ponownie.',
        )

        await expect(input).toBeEnabled()

        await expect(input).toHaveValue(/house\.png$/)

        await expect(name).toHaveValue('  Prezentacja domu  ')

        await expect(preview).toHaveCSS('mask-image', mask)

        expect(
            mock.requests.filter((request) => request.method() === 'POST'),
        ).toHaveLength(1)

        mock.uploadFails = false

        const upload = page.waitForRequest((request) => {
            return (
                new URL(request.url()).pathname === '/public-assets' &&
                request.method() === 'POST'
            )
        })

        await dialog
            .getByRole('button', { name: 'Dodaj ikonę', exact: true })
            .click()

        const request = await upload

        expect(request.headers().authorization).toBe(`Bearer ${session}`)

        expect(request.headers()['content-type']).toMatch(
            /^multipart\/form-data; boundary=/,
        )

        await expect(dialog).not.toBeVisible()

        const received = capture.uploads.at(-1)

        expect(received?.headers.authorization).toBe(`Bearer ${session}`)

        const body = received?.body

        expect(body?.toString()).toContain('name="bucket"\r\n\r\nicons')

        expect(body?.toString()).toContain(
            'name="originalName"\r\n\r\nPrezentacja domu',
        )

        expect(body?.toString()).toContain('name="file"; filename="house.png"')

        expect(body?.toString()).toContain('Content-Type: image/png')

        expect(body?.includes(iconPng)).toBe(true)

        await expect(
            page.getByRole('button', { name: 'Prezentacja domu', exact: true }),
        ).toBeVisible()

        await expect(tiles(page)).toHaveCount(1)

        expect(
            mock.requests.filter((request) => request.method() === 'POST'),
        ).toHaveLength(2)

        mock.manager = { ...manager, roles: [{ id: 2, name: 'manager' }] }

        await page.reload()

        await expect(
            page.getByRole('region', { name: 'Galeria ikon', exact: true }),
        ).toBeVisible()

        await expect(
            page.getByRole('button', { name: 'Dodaj ikonę', exact: true }),
        ).toHaveCount(0)

        await page
            .getByRole('button', { name: 'Prezentacja domu', exact: true })
            .click()

        const details = page.getByRole('dialog', { name: 'Szczegóły ikony' })

        await expect(details).toBeVisible()

        await expect(
            details.getByRole('button', {
                name: /Oznacz jako popularną|Usuń z popularnych/,
            }),
        ).toHaveCount(0)

        await page.keyboard.press('Escape')

        await expect(details).not.toBeVisible()

        expect(
            mock.requests.some((request) =>
                ['DELETE', 'PATCH'].includes(request.method()),
            ),
        ).toBe(false)

        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true)
    } finally {
        await capture.close()
    }
})
