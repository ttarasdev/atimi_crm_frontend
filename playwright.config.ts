import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    workers: 2,
    use: { baseURL: 'http://localhost:4200', trace: 'retain-on-failure' },
    projects: [
        {
            name: 'desktop',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1440, height: 1000 },
            },
        },
        {
            name: 'mobile',
            use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:4200/auth',
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
    },
})
