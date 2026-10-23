import { test, expect } from '@playwright/test'

test('entry redirects anonymous manager on the configured origin', async ({
    page,
}) => {
    await page.goto(
        `${process.env.CRM_TEST_ORIGIN ?? 'http://localhost:4200'}/main`,
    )

    await expect(page).toHaveURL(/\/auth/)
})

test('live LAN API returns a readable unauthorized response after preflight', async ({
    page,
}) => {
    test.skip(!process.env.CRM_TEST_ORIGIN || !process.env.CRM_TEST_API_URL)

    await page.goto(`${process.env.CRM_TEST_ORIGIN}/auth`)

    const status = await page.evaluate(async (apiUrl) => {
        const response = await fetch(`${apiUrl}/managers/me`, {
            headers: { Authorization: 'Bearer invalid-test-token' },
        })

        return response.status
    }, process.env.CRM_TEST_API_URL)

    expect(status).toBe(401)
})
