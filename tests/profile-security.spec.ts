import { test, expect, type Page, type Request } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import type { Manager } from '../src/api/managers/managers.types'

const session = 'profile-security-test-session'

const token = 'a'.repeat(64)

const password = 'Test-password-2026!'

const manager: Manager = {
    id: 1,
    name: 'Anna',
    surname: 'Kowalska',
    email: 'anna@example.test',
    phone: null,
    position: 'Doradca nieruchomości',
    avatarId: null,
    status: 'active',
    remindersEnabled: false,
    lastLoginAt: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    roles: [{ id: 2, name: 'manager' }],
}

interface SecurityMock {
    manager: Manager
    requests: Request[]
    avatarFails: boolean
    changeError?: string
    changeStatus: number
    confirmFails: boolean
    completed: boolean
    gate?: Promise<void>
}

async function mockSecurity(page: Page): Promise<SecurityMock> {
    const mock: SecurityMock = {
        manager: { ...manager },
        requests: [],
        avatarFails: false,
        changeStatus: 400,
        confirmFails: false,
        completed: false,
    }

    await page.addInitScript((value) => {
        localStorage.setItem('atimi:access_token', value)
    }, session)

    await page.route('**:4201/**', async (route) => {
        const request = route.request()

        const path = new URL(request.url()).pathname

        if (request.method() === 'OPTIONS')
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

        if (path === '/managers/me' && request.method() === 'GET')
            return route.fulfill({ json: mock.manager })

        if (path === '/managers/me/avatar') {
            if (mock.gate) await mock.gate

            if (mock.avatarFails)
                return route.fulfill({
                    status: 503,
                    json: { message: 'Avatar upload unavailable' },
                })

            mock.manager = {
                ...mock.manager,
                avatarId: request.method() === 'DELETE' ? null : 10,
            }

            return route.fulfill({ json: mock.manager })
        }

        if (path === '/private-variants/10')
            return route.fulfill({
                json: {
                    id: 10,
                    bucket: 'manager_avatars',
                    smallAssetId: 101,
                    mediumAssetId: 102,
                    largeAssetId: 103,
                    ...Object.fromEntries(
                        ['small', 'medium', 'large'].map((size, index) => [
                            `${size}Asset`,
                            {
                                id: 101 + index,
                                bucket: 'manager_avatars',
                                mimeType: 'image/png',
                                originalName: 'avatar.png',
                                visibility: 'team',
                                createdByManagerId: 1,
                            },
                        ]),
                    ),
                },
            })

        if (/^\/private-assets\/10[1-3]\/file$/.test(path))
            return route.fulfill({
                contentType: 'image/png',
                body: readFileSync('tests/fixtures/icons/house.png'),
            })

        if (/^\/manager-auth\/change-(email|password)$/.test(path)) {
            if (mock.gate) await mock.gate

            return route.fulfill({
                status: mock.changeError ? mock.changeStatus : 200,
                json: mock.changeError
                    ? { message: mock.changeError }
                    : { success: true },
            })
        }

        if (/^\/manager-auth\/confirm-(email|password)-change$/.test(path)) {
            if (mock.gate) await mock.gate

            return route.fulfill({
                status: mock.confirmFails ? 400 : 200,
                json: mock.confirmFails
                    ? { message: 'Invalid or expired token' }
                    : path.includes('email')
                      ? { success: true, completed: mock.completed }
                      : { success: true },
            })
        }

        return route.fulfill({
            status: 404,
            json: { message: 'Unexpected security test request' },
        })
    })

    return mock
}

function writes(mock: SecurityMock, path: string) {
    return mock.requests.filter(
        (request) =>
            request.method() !== 'GET' &&
            new URL(request.url()).pathname === path,
    )
}

async function screenshot(page: Page, name: string) {
    mkdirSync('/tmp/ivan-profile-security-qa', { recursive: true })

    await page.screenshot({
        path: `/tmp/ivan-profile-security-qa/${name}.png`,
        animations: 'disabled',
        fullPage: true,
    })
}

test('avatar upload failure keeps the selected file, retry updates shared images and removal restores initials', async ({
    page,
}, info) => {
    const mock = await mockSecurity(page)

    mock.avatarFails = true

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    await profile.getByRole('button', { name: 'Zmień zdjęcie' }).click()

    const dialog = page.getByRole('dialog', { name: 'Zmień zdjęcie' })

    await dialog
        .getByLabel('Zdjęcie profilowe')
        .setInputFiles('tests/fixtures/icons/house.png')

    await dialog.getByRole('button', { name: 'Zapisz zdjęcie' }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(dialog.getByLabel('Zdjęcie profilowe')).toHaveValue(
        /house\.png$/,
    )

    expect(mock.manager.avatarId).toBeNull()

    expect(writes(mock, '/managers/me/avatar')).toHaveLength(1)

    mock.avatarFails = false

    let release: (() => void) | undefined

    mock.gate = new Promise((resolve) => {
        release = resolve
    })

    await dialog.getByRole('button', { name: 'Zapisz zdjęcie' }).click()

    await expect(dialog.getByLabel('Zdjęcie profilowe')).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    await page.keyboard.press('Escape')

    await expect(dialog).toBeVisible()

    release?.()

    mock.gate = undefined

    await expect(dialog).not.toBeVisible()

    await expect(profile.locator('img')).toHaveAttribute('src', /^blob:/)

    await expect(profile.getByText('AK', { exact: true })).toBeHidden()

    await expect(page.locator('header img').first()).toHaveAttribute(
        'src',
        /^blob:/,
    )

    const uploads = writes(mock, '/managers/me/avatar')

    expect(uploads).toHaveLength(2)

    expect(uploads[1].headers().authorization).toBe(`Bearer ${session}`)

    expect(uploads[1].headers()['content-type']).toMatch(
        /^multipart\/form-data; boundary=/,
    )

    expect(mock.manager.remindersEnabled).toBe(false)

    await screenshot(page, `profile-avatar-${info.project.name}`)

    await profile.getByRole('button', { name: 'Zmień zdjęcie' }).click()

    await dialog
        .getByRole('button', { name: 'Usuń zdjęcie', exact: true })
        .click()

    await dialog
        .getByRole('button', { name: 'Usuń zdjęcie', exact: true })
        .click()

    await expect(dialog).not.toBeVisible()

    await expect(profile.locator('img')).toBeHidden()

    await expect(profile.getByText('AK', { exact: true })).toBeVisible()

    expect(await profile.locator('img').getAttribute('src')).toBeNull()

    expect(mock.manager.avatarId).toBeNull()

    expect(writes(mock, '/managers/me/avatar').at(-1)?.method()).toBe('DELETE')

    await page.reload()

    await expect(profile.locator('img')).toBeHidden()

    await expect(
        profile.getByRole('switch', {
            name: 'Powiadomienia e-mail z kalendarza',
        }),
    ).toHaveAttribute('aria-checked', 'false')
})

test('a broken avatar image falls back to readable initials and can still be removed', async ({
    page,
}) => {
    const mock = await mockSecurity(page)

    mock.manager.avatarId = 10

    await page.route('**/private-assets/101/file', (route) =>
        route.fulfill({
            contentType: 'image/png',
            body: 'Invalid image bytes',
        }),
    )

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    await expect(
        profile.getByRole('heading', { name: 'Anna Kowalska' }),
    ).toBeVisible()

    await expect(profile.locator('img')).toHaveAttribute('src', /^blob:/)

    await expect(profile.getByText('AK', { exact: true })).toBeVisible()

    await expect(profile.locator('img')).toBeHidden()

    await profile.getByRole('button', { name: 'Zmień zdjęcie' }).click()

    const dialog = page.getByRole('dialog', { name: 'Zmień zdjęcie' })

    await expect(
        dialog.getByRole('button', { name: 'Usuń zdjęcie' }),
    ).toBeEnabled()

    await dialog.getByRole('button', { name: 'Anuluj' }).click()

    expect(mock.manager.avatarId).toBe(10)

    expect(writes(mock, '/managers/me/avatar')).toHaveLength(0)
})

test('email request handles wrong password without logout and waits for both mailboxes without changing the profile', async ({
    page,
}, info) => {
    const mock = await mockSecurity(page)

    mock.changeError = 'Invalid password'

    await page.goto('/main/profile')

    const profile = page.getByRole('region', { name: 'Mój profil' })

    await profile.getByRole('button', { name: 'Zmień e-mail' }).click()

    const dialog = page.getByRole('dialog', { name: 'Zmień e-mail' })

    await dialog.getByLabel('Nowy adres e-mail').fill('new@example.test')

    await dialog.getByLabel('Aktualne hasło').fill('wrong-password')

    await dialog.getByRole('button', { name: 'Wyślij potwierdzenie' }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    await expect(page).toHaveURL('/main/profile')

    await expect(dialog.getByLabel('Nowy adres e-mail')).toHaveValue(
        'new@example.test',
    )

    mock.changeError = undefined

    let release: (() => void) | undefined

    mock.gate = new Promise((resolve) => {
        release = resolve
    })

    await dialog.getByLabel('Aktualne hasło').fill(password)

    await dialog.getByRole('button', { name: 'Wyślij potwierdzenie' }).click()

    await expect(dialog.getByLabel('Aktualne hasło')).toBeDisabled()

    await expect(
        dialog.getByRole('button', { name: 'Zamknij okno' }),
    ).toBeDisabled()

    release?.()

    await expect(
        dialog.getByText('Sprawdź pocztę', { exact: true }),
    ).toBeVisible()

    await expect(dialog).toContainText('anna@example.test')

    await expect(dialog).toContainText('new@example.test')

    expect(writes(mock, '/manager-auth/change-email')).toHaveLength(2)

    expect(
        writes(mock, '/manager-auth/change-email')[1].postDataJSON(),
    ).toEqual({
        currentPassword: password,
        newEmail: 'new@example.test',
    })

    expect(mock.manager.email).toBe('anna@example.test')

    await screenshot(page, `email-request-${info.project.name}`)

    await dialog.getByRole('button', { name: 'Gotowe' }).click()

    await expect(dialog).not.toBeVisible()

    await expect(
        profile.getByText('anna@example.test', { exact: true }),
    ).toHaveCount(2)

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBe(session)
})

test('password request validates the repeated password and keeps the current session until mail confirmation', async ({
    page,
}, info) => {
    const mock = await mockSecurity(page)

    await page.goto('/main/profile')

    await page.getByRole('button', { name: 'Zmień hasło', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Zmień hasło' })

    await dialog.getByLabel('Aktualne hasło').fill(password)

    await dialog
        .getByLabel('Nowe hasło', { exact: true })
        .fill('New-password-2026!')

    await dialog.getByLabel('Powtórz nowe hasło').fill('Different-password!')

    await dialog.getByRole('button', { name: 'Wyślij potwierdzenie' }).click()

    await expect(dialog.getByRole('alert')).toBeVisible()

    expect(writes(mock, '/manager-auth/change-password')).toHaveLength(0)

    await dialog.getByLabel('Powtórz nowe hasło').fill('New-password-2026!')

    await dialog.getByRole('button', { name: 'Wyślij potwierdzenie' }).click()

    await expect(
        dialog.getByText('Sprawdź pocztę', { exact: true }),
    ).toBeVisible()

    expect(writes(mock, '/manager-auth/change-password')).toHaveLength(1)

    expect(
        writes(mock, '/manager-auth/change-password')[0].postDataJSON(),
    ).toEqual({
        currentPassword: password,
        password: 'New-password-2026!',
    })

    await expect(page).toHaveURL('/main/profile')

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBe(session)

    await screenshot(page, `password-request-${info.project.name}`)
})

test('email confirmation requires a click and first mailbox confirmation keeps the session while waiting for the other address', async ({
    page,
}) => {
    const mock = await mockSecurity(page)

    await page.goto(`/auth/confirm-email-change?token=${token}`)

    await expect(
        page.getByRole('heading', { name: 'Potwierdź zmianę e-maila' }),
    ).toBeVisible()

    expect(writes(mock, '/manager-auth/confirm-email-change')).toHaveLength(0)

    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
        'content',
        'no-referrer',
    )

    await page.getByRole('button', { name: 'Potwierdź zmianę e-maila' }).click()

    await expect(
        page.getByRole('heading', { name: 'Adres potwierdzony' }),
    ).toBeVisible()

    expect(writes(mock, '/manager-auth/confirm-email-change')).toHaveLength(1)

    expect(
        writes(mock, '/manager-auth/confirm-email-change')[0].postDataJSON(),
    ).toEqual({ token })

    expect(
        writes(mock, '/manager-auth/confirm-email-change')[0].headers()
            .authorization,
    ).toBeUndefined()

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBe(session)

    await expect(page).not.toHaveURL(/token=/)
})

test('completed email change clears the local session and opens login with the new email notice', async ({
    page,
}) => {
    const mock = await mockSecurity(page)

    mock.completed = true

    await page.goto(`/auth/confirm-email-change?token=${token}`)

    await page.getByRole('button', { name: 'Potwierdź zmianę e-maila' }).click()

    await expect(page).toHaveURL('/auth?updated=email')

    await expect(
        page.getByText(
            'Adres e-mail został zmieniony. Zaloguj się nowym adresem.',
        ),
    ).toBeVisible()

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBeNull()

    expect(writes(mock, '/manager-auth/logout')).toHaveLength(0)
})

test('expired password confirmation can retry, successful completion clears session and requires a new login', async ({
    page,
}) => {
    const mock = await mockSecurity(page)

    mock.confirmFails = true

    await page.goto(`/auth/confirm-password-change?token=${token}`)

    expect(writes(mock, '/manager-auth/confirm-password-change')).toHaveLength(
        0,
    )

    await page.getByRole('button', { name: 'Potwierdź zmianę hasła' }).click()

    await expect(page.getByRole('form').getByRole('alert')).toBeVisible()

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBe(session)

    mock.confirmFails = false

    await page.getByRole('button', { name: 'Potwierdź zmianę hasła' }).click()

    await expect(page).toHaveURL('/auth?updated=password')

    await expect(
        page.getByText('Hasło zostało zmienione. Zaloguj się nowym hasłem.'),
    ).toBeVisible()

    expect(
        await page.evaluate(() => localStorage.getItem('atimi:access_token')),
    ).toBeNull()

    expect(writes(mock, '/manager-auth/confirm-password-change')).toHaveLength(
        2,
    )
})

test('malformed confirmation links cannot submit requests', async ({
    page,
}) => {
    const mock = await mockSecurity(page)

    await page.goto('/auth/confirm-password-change?token=invalid')

    await expect(
        page.getByRole('button', { name: 'Potwierdź zmianę hasła' }),
    ).toHaveCount(0)

    await expect(
        page.getByRole('alert').filter({ hasText: 'Brakuje poprawnego linku' }),
    ).toBeVisible()

    expect(writes(mock, '/manager-auth/confirm-password-change')).toHaveLength(
        0,
    )
})

test('email and password confirmation cooldown explains when another request can be sent', async ({
    page,
}) => {
    const mock = await mockSecurity(page)

    mock.changeError = 'Confirmation was recently sent. Try again in one minute'

    mock.changeStatus = 409

    await page.goto('/main/profile')

    for (const operation of ['e-mail', 'hasło']) {
        await page
            .getByRole('button', { name: `Zmień ${operation}`, exact: true })
            .click()

        const dialog = page.getByRole('dialog', { name: `Zmień ${operation}` })

        await dialog.getByLabel('Aktualne hasło').fill(password)

        if (operation === 'e-mail')
            await dialog
                .getByLabel('Nowy adres e-mail')
                .fill('new@example.test')
        else {
            await dialog
                .getByLabel('Nowe hasło', { exact: true })
                .fill('New-password-2026!')

            await dialog
                .getByLabel('Powtórz nowe hasło')
                .fill('New-password-2026!')
        }

        await dialog
            .getByRole('button', { name: 'Wyślij potwierdzenie' })
            .click()

        await expect(dialog.getByRole('alert')).toHaveText(
            'Poczekaj minutę przed wysłaniem kolejnego potwierdzenia.',
        )

        await dialog.getByRole('button', { name: 'Anuluj' }).click()

        await expect(dialog).not.toBeVisible()
    }

    expect(writes(mock, '/manager-auth/change-email')).toHaveLength(1)

    expect(writes(mock, '/manager-auth/change-password')).toHaveLength(1)
})
