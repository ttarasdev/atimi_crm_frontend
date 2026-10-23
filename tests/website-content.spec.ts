import { test, expect, type Page, type Request } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { SiteReview } from '../src/api/site-reviews/site-reviews.types'
import type { SiteVideo } from '../src/api/site-videos/site-videos.types'
import type { Manager } from '../src/api/managers/managers.types'

const languages = ['pl', 'en', 'ua', 'de'] as const

const labels = { pl: 'Polski', en: 'English', ua: 'Українська', de: 'Deutsch' }

const timestamps = {
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-06T08:00:00.000Z',
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
    roles: [{ id: 1, name: 'admin' }],
    ...timestamps,
}

function review(id: number, author = 'Anna Nowak'): SiteReview {
    return {
        id,
        translations: {
            pl: {
                authorName: author,
                text: 'Świetna współpraca. Profesjonalna pomoc od pierwszej rozmowy po przekazanie kluczy.',
            },
            en: { authorName: author, text: 'Great cooperation.' },
            ua: { authorName: author, text: 'Чудова співпраця.' },
            de: { authorName: author, text: 'Ausgezeichnete Zusammenarbeit.' },
        },
        rating: 5,
        source: 'Google',
        imageId: null,
        imagePath: null,
        sortKey: id * 1000,
        isActive: true,
        ...timestamps,
    }
}

function video(id: number): SiteVideo {
    return {
        id,
        translations: {
            pl: {
                title: 'Zakup mieszkania we Wrocławiu',
                description: 'Historia naszego klienta.',
            },
            en: { title: 'Buying in Wroclaw', description: '' },
            ua: { title: 'Купівля у Вроцлаві', description: '' },
            de: { title: 'Wohnungskauf in Breslau', description: '' },
        },
        url: 'https://www.youtube-nocookie.com/embed/WLg3ik2OahY',
        sortKey: id * 1000,
        isActive: true,
        ...timestamps,
    }
}

async function mock(page: Page, admin = true, rows = [review(1)]) {
    const state = {
        reviews: rows,
        videos: [video(1)],
        requests: [] as Request[],
        fails: false,
        uploads: 0,
    }

    await page.addInitScript(() =>
        localStorage.setItem('atimi:access_token', 'website-test-token'),
    )

    await page.route('https://www.youtube-nocookie.com/**', (route) =>
        route.fulfill({
            contentType: 'text/html',
            body: '<html><body>Video preview</body></html>',
        }),
    )

    await page.route('https://i.ytimg.com/**', (route) => route.abort())

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const url = new URL(request.url())

        const method = request.method()

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

        if (url.pathname === '/managers/me')
            return route.fulfill({
                json: {
                    ...manager,
                    roles: admin ? manager.roles : [{ id: 2, name: 'manager' }],
                },
            })

        if (url.pathname === '/public-assets' && method === 'POST') {
            state.uploads += 1

            return route.fulfill({
                status: 201,
                json: {
                    id: 74 + state.uploads,
                    bucket: 'system_files',
                    relPath: 'test.png',
                    originalName: 'house.png',
                    mimeType: 'image/png',
                    sizeBytes: readFileSync('tests/fixtures/icons/house.png')
                        .length,
                    isPopular: false,
                    createdByManagerId: 1,
                    ...timestamps,
                },
            })
        }

        if (/^\/public-assets\/\d+$/.test(url.pathname) && method === 'DELETE')
            return route.fulfill({ json: { success: true } })

        if (/^\/public-assets\/\d+\/file$/.test(url.pathname))
            return route.fulfill({
                body: readFileSync('tests/fixtures/icons/house.png'),
                contentType: 'image/png',
                headers: { 'access-control-allow-origin': '*' },
            })

        const resource = url.pathname.match(
            /^\/(site-reviews|site-videos)(?:\/(\d+)(\/order)?)?$/,
        )

        if (!resource)
            return route.fulfill({
                status: 404,
                json: { message: 'Mock endpoint unavailable' },
            })

        const isReview = resource[1] === 'site-reviews'

        if (method === 'GET') {
            const search = url.searchParams.get('search')?.toLowerCase() ?? ''

            const isActive = url.searchParams.get('isActive') !== 'false'

            const candidates = (isReview ? state.reviews : state.videos).filter(
                (row) =>
                    row.isActive === isActive &&
                    JSON.stringify(row.translations)
                        .toLowerCase()
                        .includes(search),
            )

            const limit = Number(url.searchParams.get('limit') ?? 20)

            const currentPage = Number(url.searchParams.get('page') ?? 1)

            const offset = (currentPage - 1) * limit

            return route.fulfill({
                json: {
                    rows: candidates.slice(offset, offset + limit),
                    total: candidates.length,
                    page: currentPage,
                    limit,
                    offset,
                },
            })
        }

        if (state.fails)
            return route.fulfill({
                status: 503,
                json: { message: 'Unavailable' },
            })

        if (method === 'POST') {
            if (isReview) {
                const dto: SiteReview = request.postDataJSON()

                const row = { ...review(state.reviews.length + 1), ...dto }

                state.reviews.push(row)

                return route.fulfill({ status: 201, json: row })
            }

            const dto: SiteVideo = request.postDataJSON()

            const row = { ...video(state.videos.length + 1), ...dto }

            state.videos.push(row)

            return route.fulfill({ status: 201, json: row })
        }

        const row = (isReview ? state.reviews : state.videos).find(
            (row) => row.id === Number(resource[2]),
        )

        if (!row)
            return route.fulfill({ status: 404, json: { message: 'Missing' } })

        if (resource[3])
            return route.fulfill({
                json: isReview ? state.reviews : state.videos,
            })

        Object.assign(row, request.postDataJSON())

        return route.fulfill({ json: row })
    })

    await page.goto('/main/management/website')

    return state
}

test('reviews and videos have four-language previews without horizontal overflow', async ({
    page,
}, testInfo) => {
    await mock(page)

    await expect(
        page.getByRole('heading', { name: 'Strona internetowa', exact: true }),
    ).toBeVisible()

    await expect(page.getByText('Anna Nowak', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Українська', exact: true }).click()

    await expect(
        page.getByText('Чудова співпраця.', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Filmy', exact: true }).click()

    await expect(
        page.getByText('Купівля у Вроцлаві', { exact: true }),
    ).toBeVisible()

    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
        )
        .toBe(true)

    await page.screenshot({
        path: `/tmp/ivan-website-content-${testInfo.project.name}.png`,
        fullPage: true,
    })
})

test('create review validates missing languages and sends only content fields', async ({
    page,
}) => {
    const state = await mock(page)

    await page
        .getByRole('button', { name: 'Dodaj opinię', exact: true })
        .click()

    const dialog = page.getByRole('dialog', { name: 'Nowa opinia' })

    await dialog
        .getByLabel('Autor (PL)', { exact: true })
        .fill('  Jan Kowalski  ')

    await dialog
        .getByLabel('Treść opinii (PL)', { exact: true })
        .fill('  Bardzo polecam.  ')

    await dialog
        .getByRole('button', { name: 'Dodaj opinię', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('EN')

    for (const lang of ['en', 'ua', 'de'] as const) {
        await dialog
            .getByRole('button', { name: labels[lang], exact: true })
            .click()

        await dialog
            .getByLabel(`Autor (${lang.toUpperCase()})`, { exact: true })
            .fill(`Jan ${lang}`)

        await dialog
            .getByLabel(`Treść opinii (${lang.toUpperCase()})`, { exact: true })
            .fill(`Opinia ${lang}`)
    }

    await dialog
        .getByRole('button', { name: 'Dodaj opinię', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    const sent = state.requests.find(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/site-reviews',
    )

    expect(sent).toBeDefined()

    const body = sent!.postDataJSON()

    expect(body.translations.pl.authorName).toBe('Jan Kowalski')

    expect(body.translations.pl.text).toBe('Bardzo polecam.')

    expect(Object.keys(body.translations)).toEqual([...languages])

    expect(Object.keys(body).sort()).toEqual([
        'imageId',
        'imagePath',
        'rating',
        'source',
        'translations',
    ])
})

test('video form rejects unsafe URLs and preserves fields after server failure', async ({
    page,
}) => {
    const state = await mock(page)

    await page.getByRole('button', { name: 'Filmy', exact: true }).click()

    await page.getByRole('button', { name: 'Dodaj film', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Nowy film' })

    await dialog
        .getByLabel('Link do filmu', { exact: true })
        .fill('https://evil.example/iframe')

    for (const lang of languages) {
        await dialog
            .getByRole('button', { name: labels[lang], exact: true })
            .click()

        await dialog
            .getByLabel(`Tytuł (${lang.toUpperCase()})`, { exact: true })
            .fill(`Film ${lang}`)
    }

    await dialog
        .getByRole('button', { name: 'Dodaj film', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText('YouTube lub Vimeo')

    expect(
        state.requests.filter((request) => request.method() === 'POST'),
    ).toHaveLength(0)

    await dialog
        .getByLabel('Link do filmu', { exact: true })
        .fill('https://youtu.be/WLg3ik2OahY')

    state.fails = true

    await dialog
        .getByRole('button', { name: 'Dodaj film', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie udało się zapisać filmu',
    )

    await expect(dialog.getByLabel('Tytuł (DE)', { exact: true })).toHaveValue(
        'Film de',
    )

    state.fails = false

    await dialog
        .getByRole('button', { name: 'Dodaj film', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()
})

test('archive requires confirmation and restore keeps translations', async ({
    page,
}) => {
    const state = await mock(page)

    await page
        .getByRole('button', { name: 'Archiwizuj Anna Nowak', exact: true })
        .click()

    expect(
        state.requests.filter((request) => request.method() === 'PATCH'),
    ).toHaveLength(0)

    const dialog = page.getByRole('dialog', { name: 'Archiwizuj treść' })

    await dialog
        .getByRole('button', { name: 'Archiwizuj', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    await page.getByRole('button', { name: 'Archiwum', exact: true }).click()

    await expect(page.getByText('Anna Nowak', { exact: true })).toBeVisible()

    await page
        .getByRole('button', { name: 'Przywróć Anna Nowak', exact: true })
        .click()

    await expect(
        page.getByText('Archiwum jest puste.', { exact: true }),
    ).toBeVisible()

    const patches = state.requests.filter(
        (request) => request.method() === 'PATCH',
    )

    expect(patches.map((request) => request.postDataJSON())).toEqual([
        { isActive: false },
        { isActive: true },
    ])

    expect(state.reviews[0].translations.ua.text).toBe('Чудова співпраця.')
})

test('regular managers cannot load or change website content', async ({
    page,
}) => {
    const state = await mock(page, false)

    await expect(
        page.getByRole('heading', { name: 'Brak uprawnień', exact: true }),
    ).toBeVisible()

    expect(
        state.requests.some((request) =>
            /site-reviews|site-videos/.test(request.url()),
        ),
    ).toBe(false)

    await expect(
        page.getByRole('button', { name: 'Dodaj opinię', exact: true }),
    ).toHaveCount(0)
})

test('review photo upload keeps PNG format and links the returned public asset', async ({
    page,
}, info) => {
    const state = await mock(page)

    await page
        .getByRole('button', { name: 'Edytuj Anna Nowak', exact: true })
        .click()

    const dialog = page.getByRole('dialog', { name: 'Edytuj opinię' })

    await dialog
        .getByLabel('Zdjęcie (opcjonalne)', { exact: true })
        .setInputFiles('tests/fixtures/icons/house.png')

    const name = dialog.getByLabel('Nazwa zdjęcia')

    await expect(name).toHaveValue('house.png')

    await name.fill('  Zdjęcie opinii Anny  ')

    await dialog
        .getByLabel('Zdjęcie (opcjonalne)', { exact: true })
        .setInputFiles({
            name: 'new.png',
            mimeType: 'image/png',
            buffer: readFileSync('tests/fixtures/icons/house.png'),
        })

    await expect(name).toHaveValue('  Zdjęcie opinii Anny  ')

    await page.screenshot({
        path: `/tmp/ivan-review-photo-name-${info.project.name}.png`,
    })

    await expect(
        dialog.getByRole('img', { name: 'Zdjęcie opinii', exact: true }),
    ).toBeVisible()

    state.fails = true

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog.getByRole('alert')).toContainText(
        'Nie udało się zapisać opinii.',
    )

    await expect(name).toHaveValue('  Zdjęcie opinii Anny  ')

    await name.fill('  Opinia Anny  ')

    state.fails = false

    await dialog
        .getByRole('button', { name: 'Zapisz zmiany', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    const upload = state.requests
        .filter(
            (request) =>
                request.method() === 'POST' &&
                new URL(request.url()).pathname === '/public-assets',
        )
        .at(-1)

    expect(upload).toBeDefined()

    const multipart = upload!.postDataBuffer()!

    expect(multipart.includes(Buffer.from('system_files'))).toBe(true)

    expect(multipart.includes(Buffer.from('Content-Type: image/png'))).toBe(
        true,
    )

    expect(multipart.includes(Buffer.from('filename="new.png"'))).toBe(true)

    expect(multipart.toString()).toContain(
        'name="originalName"\r\n\r\nOpinia Anny',
    )

    expect(
        state.requests.filter(
            (request) =>
                request.method() === 'DELETE' &&
                new URL(request.url()).pathname === '/public-assets/75',
        ),
    ).toHaveLength(1)

    expect(state.uploads).toBe(2)

    const patch = state.requests
        .filter(
            (request) =>
                request.method() === 'PATCH' &&
                new URL(request.url()).pathname === '/site-reviews/1',
        )
        .at(-1)

    expect(patch!.postDataJSON().imageId).toBe(76)

    expect(patch!.postDataJSON().imagePath).toBeNull()
})
